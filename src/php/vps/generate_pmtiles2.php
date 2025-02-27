<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// メモリ・時間制限を解除
ini_set('memory_limit', '-1');
set_time_limit(0);
ini_set('max_execution_time', 0);

//echo json_encode([
//    "error" => "エラーシミュレート",
////    'path' => $tempFilePath
//]);
//exit;


// ---- ここでWeb上のベースURLを指定 ----
$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

// POSTリクエストのチェック
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

// jsonデータの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["geojson"])) {
    echo json_encode(["error" => "GeoJSONオブジェクトが指定されていません"]);
    exit;
}

// 各地物に oh3id プロパティを追加
$bbox = [INF, INF, -INF, -INF];
foreach ($data["geojson"]["features"] as $index => &$feature) {
    $feature["properties"]["oh3id"] = $index;
    $feature["properties"]["chiban"] = $data["chiban"];
    if (isset($feature["geometry"]["coordinates"])) {
        updateBBOX($feature["geometry"]["coordinates"], $bbox);
    }
}
unset($feature); // 参照解除

// BBOX にマイナス値がある場合、空にする
if (min($bbox) < 0) {
    $bbox = '';
}

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";
// ディレクトリ名取得
$subDir = $data["dir"];
// フルパスのアップロードディレクトリ
$fileBaseName = uniqid();
$tempFilePath = $baseUploadDir . $subDir . '/' . $fileBaseName. ".geojson";
//$tempFilePath = $uploadDir . ".geojson";

//echo json_encode([
//    "error" => "エラーシミュレート",
//    'path' => $tempFilePath
//]);
//exit;

//// 一時ファイルを作成
//$tempFilePath = sys_get_temp_dir() . "/" . uniqid("geojson_", true) . ".geojson";
if (file_put_contents($tempFilePath, json_encode($data["geojson"])) === false) {
    echo json_encode(["error" => "一時ファイルの作成に失敗しました"]);
    exit;
}

// GeoJSONのディレクトリとファイル名を取得
$geojsonDir = dirname($tempFilePath);
$fileBaseName = pathinfo($tempFilePath, PATHINFO_FILENAME);
$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";

// Tippecanoeコマンドの実行
$tippecanoeCmd = sprintf(
    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=14 --minimum-zoom=0 --layer=oh3 %s 2>&1",
    escapeshellarg($pmtilesPath),
    escapeshellarg($tempFilePath)
);
exec($tippecanoeCmd, $output, $returnVar);
// エラーハンドリング
if ($returnVar !== 0) {
    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
    unlink($tempFilePath); // エラー時は一時ファイルを削除
    exit;
}

// 成功時に不要なファイルを削除
//deleteSourceAndTempFiles($tempFilePath);

// 正常終了
echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,   // ローカルの保存先パス
    "tippecanoeCmd" => $tippecanoeCmd,
    "bbox" => $bbox
]);
exit;

//echo json_encode(["error" => "エラーシミュレート"]);
//exit;

/**
 * 一時ファイルと元データを削除（.pmtiles ファイルは残す）
 */
function deleteSourceAndTempFiles($filePath)
{
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        // カレントディレクトリ (`.`) と 親ディレクトリ (`..`) をスキップ
        if ($file === '.' || $file === '..') {
            continue;
        }
        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
        // .pmtiles ファイルは削除しない
        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'pmtiles') {
            continue;
        }
        unlink($fullPath);
    }
}
/**
 * GeoJSON の BBOX を更新
 */
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




