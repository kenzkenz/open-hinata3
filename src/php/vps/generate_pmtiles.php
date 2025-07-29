<?php
// エラーログを有効化
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php_errors.log');
ini_set('display_errors', 0);
error_reporting(E_ALL);

// CORSとSSEヘッダー
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: text/event-stream");
header("Cache-Control: no-cache");
header("Connection: keep-alive");

// 出力バッファリングを完全に無効化
ob_implicit_flush(true);
while (ob_get_level()) ob_end_clean();
ini_set('output_buffering', '0');
ini_set('zlib.output_compression', '0');

// リソース制限解除
ini_set('memory_limit', '-1');
ini_set('max_execution_time', 300);
ini_set('max_input_time', 300);

// POSTチェック
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    sendSSE(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

// dirをPOSTから取得
if (!isset($_POST['dir'])) {
    sendSSE(["error" => "dirが指定されていません"]);
    exit;
}
$dir = basename($_POST['dir']);
if (empty($dir) || preg_match('/[^a-zA-Z0-9_-]/', $dir)) {
    sendSSE(["error" => "無効なディレクトリ名です"]);
    exit;
}

// maximum zoom をPOSTから取得（デフォルト16）
$maximum = 16;
if (isset($_POST['maximum']) && is_numeric($_POST['maximum'])) {
    $maximum = max(0, min(24, (int)$_POST['maximum'])); // 安全な範囲内に制限
}

// geojsonファイルをPOSTから取得
if (!isset($_FILES['geojson']) || $_FILES['geojson']['error'] !== UPLOAD_ERR_OK) {
    sendSSE(["error" => "geojsonファイルがアップロードされていません"]);
    exit;
}

// 一時ファイルから内容取得
$geojsonContent = file_get_contents($_FILES['geojson']['tmp_name']);
$geojson = json_decode($geojsonContent, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendSSE(["error" => "無効なJSONです: " . json_last_error_msg()]);
    exit;
}

// GeoJSON形式チェック
if (!isset($geojson['type']) || $geojson['type'] !== 'FeatureCollection' || !isset($geojson['features']) || !is_array($geojson['features'])) {
    sendSSE(["error" => "無効なGeoJSON形式です"]);
    exit;
}

// アップロードディレクトリ準備
$baseUploadDir = "/var/www/html/public_html/uploads/";
$pmtilesDir = $baseUploadDir . $dir . "/pmtiles/";
if (!is_dir($pmtilesDir) && !mkdir($pmtilesDir, 0775, true)) {
    sendSSE(["error" => "ディレクトリの作成に失敗しました"]);
    exit;
}

// 一時ファイル名
$fileBaseName = uniqid();
$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";

try {
    // GeoJSON 保存
    sendSSE(["log" => 'GeoJSON 保存中']);
    ini_set('serialize_precision', -1);
    if (file_put_contents(
            $tempFilePath,
            json_encode(
                $geojson,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION
            )
        ) === false) {
        throw new Exception("GeoJSONファイルの書き込みに失敗しました");
    }

    // BBOX 計算
    sendSSE(["log" => 'GeoJSON 検証中']);
    $length = count($geojson['features']);
    sendSSE(["log" => "Total features: $length"]);
    $bbox = [INF, INF, -INF, -INF];
    foreach ($geojson['features'] as $idx => $feat) {
        if (isset($feat['geometry']['coordinates'])) {
            updateBBOX($feat['geometry']['coordinates'], $bbox);
        }
        if (($idx + 1) % 2000 === 0 || $idx + 1 === $length) {
            sendSSE(["log" => ($idx + 1) . "/$length (地物) bbox作成中"]);
        }
    }
    sendSSE(["log" => json_encode($bbox)]);

    // Tippecanoe 実行
    sendSSE(["log" => "Tippecanoe 実行開始"]);
    $pmtilesPath = $pmtilesDir . $fileBaseName . ".pmtiles";
    $cmd = sprintf(
        "tippecanoe -rg -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=%d --minimum-zoom=0 --layer=oh3 --progress-interval=0 %s 2>&1",
        escapeshellarg($pmtilesPath),
        $maximum,
        escapeshellarg($tempFilePath)
    );
    $descs = [0=>["pipe","r"],1=>["pipe","w"],2=>["pipe","w"]];
    $proc = proc_open($cmd, $descs, $pipes);
    if (!is_resource($proc)) throw new Exception("プロセスの開始に失敗しました");
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    fclose($pipes[0]);
    while (true) {
        $out = fgets($pipes[1]);
        if ($out !== false) sendSSE(["log"=>trim($out)]);
        $err = fgets($pipes[2]);
        if ($err !== false) sendSSE(["log"=>trim($err),"is_error"=>true]);
        if (feof($pipes[1]) && feof($pipes[2])) break;
        usleep(10000);
    }
    fclose($pipes[1]); fclose($pipes[2]);
    $ret = proc_close($proc);
    if ($ret !== 0) throw new Exception("Tippecanoeの実行に失敗しました");

    // 古い.geojson削除
    deleteTempFilesExceptPmtiles($pmtilesDir);

    // SSE レスポンス
    sendSSE([
        "success"=>true,
        "message"=>"PMTilesファイルが作成されました",
        "pmtiles_file"=>$pmtilesPath,
        "bbox"=>$bbox,
        "length"=>$length
    ]);

} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    sendSSE(["error"=> $e->getMessage()]);
    if (isset($tempFilePath) && file_exists($tempFilePath)) unlink($tempFilePath);
    exit;
}

// 関数定義
function sendSSE($data) {
    echo "data: " . json_encode($data, JSON_PRESERVE_ZERO_FRACTION) . "\n\n";
    @ob_flush(); flush(); if (ob_get_length()) ob_end_flush();
}

function deleteTempFilesExceptPmtiles($dir) {
    foreach (scandir($dir) as $f) {
        if ($f === '.' || $f === '..') continue;
        if (pathinfo($f, PATHINFO_EXTENSION) === 'geojson') unlink($dir . DIRECTORY_SEPARATOR . $f);
    }
}

function updateBBOX($coords, &$bbox) {
    if (!is_array($coords[0])) {
        $bbox[0]=min($bbox[0],$coords[0]);
        $bbox[1]=min($bbox[1],$coords[1]);
        $bbox[2]=max($bbox[2],$coords[0]);
        $bbox[3]=max($bbox[3],$coords[1]);
    } else {
        foreach ($coords as $c) updateBBOX($c,$bbox);
    }
}