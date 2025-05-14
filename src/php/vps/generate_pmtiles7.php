<?php
// エラーログを有効化
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php_errors.log');
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: text/event-stream");
header("Cache-Control: no-cache");
header("Connection: keep-alive");

// 出力バッファリングを完全に無効化
ob_implicit_flush(true);
while (ob_get_level()) ob_end_clean();

// PHPのバッファリング設定
ini_set('output_buffering', '0');
ini_set('zlib.output_compression', '0');

ini_set('memory_limit', '-1');
ini_set('max_execution_time', 300);
ini_set('max_input_time', 300);

$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    sendSSE(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

if (!isset($_FILES["geojson"]) || $_FILES["geojson"]["error"] !== UPLOAD_ERR_OK || !isset($_POST["dir"])) {
    $errors = [
        UPLOAD_ERR_INI_SIZE => "ファイルサイズがPHPの制限を超えています",
        UPLOAD_ERR_FORM_SIZE => "ファイルサイズがフォームの制限を超えています",
        UPLOAD_ERR_PARTIAL => "ファイルが部分的にしかアップロードされていません",
        UPLOAD_ERR_NO_FILE => "ファイルがアップロードされていません",
        UPLOAD_ERR_NO_TMP_DIR => "一時ディレクトリが存在しません",
        UPLOAD_ERR_CANT_WRITE => "ディスクへの書き込みに失敗しました",
        UPLOAD_ERR_EXTENSION => "PHP拡張によりアップロードが中断されました"
    ];
    sendSSE(["error" => $errors[$_FILES["geojson"]["error"]] ?? "geojsonファイルまたはdirが指定されていません！"]);
    exit;
}

$dir = basename($_POST["dir"]);
if (empty($dir) || preg_match('/[^a-zA-Z0-9_-]/', $dir)) {
    sendSSE(["error" => "無効なディレクトリ名です"]);
    exit;
}

$baseUploadDir = "/var/www/html/public_html/uploads/";
$pmtilesDir = $baseUploadDir . $dir . "/pmtiles/";

if (!is_dir($pmtilesDir) && !mkdir($pmtilesDir, 0775, true)) {
    sendSSE(["error" => "ディレクトリの作成に失敗しました"]);
    exit;
}

$fileBaseName = uniqid();
$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";

try {
    sendSSE(["log" => 'GeoJSON 保存中']);
    if (!move_uploaded_file($_FILES["geojson"]["tmp_name"], $tempFilePath)) {
        throw new Exception("GeoJSONファイルの保存に失敗しました");
    }
    // ----------------- GeoJSON 検証 -----------------
    sendSSE(["log" => 'GeoJSON 検証中']);
    $geojsonContent = file_get_contents($tempFilePath);
    $geojson = json_decode($geojsonContent, true);
    if (!$geojson || !isset($geojson['type']) || $geojson['type'] !== 'FeatureCollection') {
        throw new Exception("無効なGeoJSON形式です");
    }
    // ----------------- oh3id 付与 & BBOX -----------------
    sendSSE(["log" => "Starting to process GeoJSON features"]);
    $length = count($geojson["features"]);
    sendSSE(["log" => "Total features: $length"]);
    $bbox = [INF, INF, -INF, -INF];

    foreach ($geojson["features"] as $index => &$feature) {
        $feature["properties"]["oh3id"] = $index + 1;
        if (isset($feature["geometry"]["coordinates"])) {
            updateBBOX($feature["geometry"]["coordinates"], $bbox);
        }
        // 2000フィーチャごとに進捗ログを出力
        if (($index + 1) % 2000 === 0 || $index + 1 === $length) {
            sendSSE(["log" => ($index + 1) . "/$length" . '(地物) id作成中']);
        }
    }
    unset($feature);
    sendSSE(["log" => json_encode($bbox)]);

    // GeoJSONファイル書き込み
    sendSSE(["log" => "Writing GeoJSON to file: $tempFilePath"]);
    ini_set('serialize_precision', -1);
    if (!file_put_contents(
        $tempFilePath,
        json_encode(
            $geojson,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION
        )
    )) {
        throw new Exception("GeoJSONファイルの書き込みに失敗しました");
    }
    sendSSE(["log" => "successfully"]);

    // ----------------- Tippecanoe 実行 -----------------
    $pmtilesPath = $pmtilesDir . $fileBaseName . ".pmtiles";
    $tippecanoeCmd = sprintf(
        "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 --progress-interval=0 %s 2>&1",
        escapeshellarg($pmtilesPath),
        escapeshellarg($tempFilePath)
    );

    $descriptors = [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"]
    ];

    $process = proc_open($tippecanoeCmd, $descriptors, $pipes);
    if (!is_resource($process)) {
        throw new Exception("プロセスの開始に失敗しました");
    }

    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    fclose($pipes[0]);

    $logs = [];
    while (true) {
        $line = fgets($pipes[1]);
        if ($line !== false) {
            // 1%ごとのログのみ送信（厳格なフィルタリング）
            if (preg_match('/(\d+\.\d)%/', $line, $matches) && (int)$matches[1] % 1 !== 0) {
                error_log("Filtered log: " . trim($line));
                continue;
            }
            $logs[] = $line;
            sendSSE(["log" => trim($line)]);
        }

        $errorLine = fgets($pipes[2]);
        if ($errorLine !== false) {
            $logs[] = $errorLine;
            sendSSE(["log" => trim($errorLine), "is_error" => true]);
        }

        // プロセスが終了したらループを抜ける
        if (feof($pipes[1]) && feof($pipes[2])) {
            break;
        }

        usleep(10000); // 10ms待機
    }

    fclose($pipes[1]);
    fclose($pipes[2]);

    $returnVar = proc_close($process);
    if ($returnVar !== 0) {
        throw new Exception("Tippecanoeの実行に失敗しました: " . implode("\n", $logs));
    }

    deleteTempFilesExceptPmtiles($pmtilesDir);

    // ----------------- レスポンス -----------------
    sendSSE([
        "success" => true,
        "message" => "PMTilesファイルが作成されました",
        "pmtiles_file" => $pmtilesPath,
        "tippecanoeCmd" => $tippecanoeCmd,
        "bbox" => $bbox,
        "length" => $length
    ]);

} catch (Exception $e) {
    error_log("Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    sendSSE(["error" => $e->getMessage()]);
    if (isset($tempFilePath) && file_exists($tempFilePath)) {
        unlink($tempFilePath);
    }
    exit;
}

exit;

// ----------------- 関数 -----------------
function sendSSE($data) {
    error_log("Sending: " . json_encode($data));
    echo "data: " . json_encode($data, JSON_PRESERVE_ZERO_FRACTION) . "\n\n";
    @ob_flush();
    flush();
    if (ob_get_length()) {
        ob_end_flush();
    }
}

function deleteTempFilesExceptPmtiles($dir) {
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..') continue;
        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'geojson') {
            unlink($fullPath);
        }
    }
}

function updateBBOX($coordinates, &$bbox) {
    if (!is_array($coordinates[0])) {
        $bbox[0] = min($bbox[0], $coordinates[0]);
        $bbox[1] = min($bbox[1], $coordinates[1]);
        $bbox[2] = max($bbox[2], $coordinates[0]);
        $bbox[3] = max($bbox[3], $coordinates[1]);
    } else {
        foreach ($coordinates as $coord) {
            updateBBOX($coord, $bbox);
        }
    }
}