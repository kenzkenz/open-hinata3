<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// メモリ・時間制限を解除
ini_set('memory_limit', '-1');
set_time_limit(0);
ini_set('max_execution_time', 0);

$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["geojson"])) {
    echo json_encode(["error" => "GeoJSONオブジェクトが指定されていません"]);
    exit;
}

$length = count($data["geojson"]["features"]);

$bbox = [INF, INF, -INF, -INF];
foreach ($data["geojson"]["features"] as $index => &$feature) {
    $feature["properties"]["oh3id"] = $index;
//    $feature["properties"]["chiban"] = $data["chiban"];
    if (isset($feature["geometry"]["coordinates"])) {
        updateBBOX($feature["geometry"]["coordinates"], $bbox);
    }
}
unset($feature);

if (min($bbox) < 0) {
    $bbox = '';
}

$baseUploadDir = "/var/www/html/public_html/uploads/";
$subDir = $data["dir"];
$pmtilesDir = $baseUploadDir . $subDir . "/pmtiles/";

if (!is_dir($pmtilesDir)) {
    mkdir($pmtilesDir, 0777, true);
}

$fileBaseName = uniqid();
$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";

if (file_put_contents($tempFilePath, json_encode($data["geojson"])) === false) {
    echo json_encode(["error" => "一時ファイルの作成に失敗しました"]);
    exit;
}

$geojsonDir = dirname($tempFilePath);
$pmtilesPath = $geojsonDir . "/" . pathinfo($tempFilePath, PATHINFO_FILENAME) . ".pmtiles";

$isPoint = isFirstFeaturePoint($data["geojson"]);

if (!$isPoint) {
    $tippecanoeCmd = sprintf(
        "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=14 --minimum-zoom=0 --layer=oh3 %s 2>&1",
        escapeshellarg($pmtilesPath),
        escapeshellarg($tempFilePath)
    );
} else {
    $tippecanoeCmd = sprintf(
        "tippecanoe -rg -pk -pf --layer=oh3 -f -o %s %s 2>&1",
        escapeshellarg($pmtilesPath),
        escapeshellarg($tempFilePath)
    );
}

exec($tippecanoeCmd, $output, $returnVar);
if ($returnVar !== 0) {
    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
    unlink($tempFilePath);
    exit;
}

deleteSourceAndTempFiles($tempFilePath);

echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,
    "tippecanoeCmd" => $tippecanoeCmd,
    "bbox" => $bbox,
    "isPoint" => $isPoint,
    "length" => $length
]);
exit;

function deleteSourceAndTempFiles($filePath)
{
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'pmtiles') {
            continue;
        }
        unlink($fullPath);
    }
}

function updateBBOX($coordinates, &$bbox)
{
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

function isFirstFeaturePoint($geojson)
{
    if (
        isset($geojson["features"]) &&
        is_array($geojson["features"]) &&
        count($geojson["features"]) > 0 &&
        isset($geojson["features"][0]["geometry"]["type"])
    ) {
        return strtolower($geojson["features"][0]["geometry"]["type"]) === "point";
    }
    return false;
}


//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// メモリ・時間制限を解除
//ini_set('memory_limit', '-1');
//set_time_limit(0);
//ini_set('max_execution_time', 0);
//
////echo json_encode([
////    "error" => "エラーシミュレート",
//////    'path' => $tempFilePath
////]);
////exit;
//
//
//// ---- ここでWeb上のベースURLを指定 ----
//$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";
//
//// POSTリクエストのチェック
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
//    exit;
//}
//
//// jsonデータの取得
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["geojson"])) {
//    echo json_encode(["error" => "GeoJSONオブジェクトが指定されていません"]);
//    exit;
//}
//
//// 各地物に oh3id プロパティを追加
//$bbox = [INF, INF, -INF, -INF];
//foreach ($data["geojson"]["features"] as $index => &$feature) {
//    $feature["properties"]["oh3id"] = $index;
//    $feature["properties"]["chiban"] = $data["chiban"];
//    if (isset($feature["geometry"]["coordinates"])) {
//        updateBBOX($feature["geometry"]["coordinates"], $bbox);
//    }
//}
//unset($feature); // 参照解除
//
//// BBOX にマイナス値がある場合、空にする
//if (min($bbox) < 0) {
//    $bbox = '';
//}
//
//// アップロードディレクトリ設定
//$baseUploadDir = "/var/www/html/public_html/uploads/";
//$subDir = $data["dir"];
//$pmtilesDir = $baseUploadDir . $subDir . "/pmtiles/";
//
//// pmtilesディレクトリ作成
//if (!is_dir($pmtilesDir)) {
//    mkdir($pmtilesDir, 0777, true);
//}
//
//$fileBaseName = uniqid();
//$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";
//
////echo json_encode([
////    "error" => "エラーシミュレート",
////    'path' => $tempFilePath
////]);
////exit;
//
////// 一時ファイルを作成
//if (file_put_contents($tempFilePath, json_encode($data["geojson"])) === false) {
//    echo json_encode(["error" => "一時ファイルの作成に失敗しました"]);
//    exit;
//}
//
//// GeoJSONのディレクトリとファイル名を取得
//$geojsonDir = dirname($tempFilePath);
//$fileBaseName = pathinfo($tempFilePath, PATHINFO_FILENAME);
//$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";
//
//$isPoint = isFirstFeaturePoint($data["geojson"]);
//
//// Tippecanoeコマンドの実行
//if (!$isPoint) {
//    $tippecanoeCmd = sprintf(
//        "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=14 --minimum-zoom=0 --layer=oh3 %s 2>&1",
//        escapeshellarg($pmtilesPath),
//        escapeshellarg($tempFilePath)
//    );
//} else {
//    $tippecanoeCmd = sprintf(
//        "tippecanoe -rg -pk -pf --layer=oh3 -f -o %s %s 2>&1",
//        escapeshellarg($pmtilesPath),
//        escapeshellarg($tempFilePath)
//    );
//}
//
//exec($tippecanoeCmd, $output, $returnVar);
//// エラーハンドリング
//if ($returnVar !== 0) {
//    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
//    unlink($tempFilePath); // エラー時は一時ファイルを削除
//    exit;
//}
//
//// 成功時に不要なファイルを削除
//deleteSourceAndTempFiles($tempFilePath);
//
//// 正常終了
//echo json_encode([
//    "success" => true,
//    "message" => "PMTilesファイルが作成されました",
//    "pmtiles_file" => $pmtilesPath,   // ローカルの保存先パス
//    "tippecanoeCmd" => $tippecanoeCmd,
//    "bbox" => $bbox,
//    "isPoint" => $isPoint
//]);
//exit;
//
////echo json_encode(["error" => "エラーシミュレート"]);
////exit;
//
///**
// * 一時ファイルと元データを削除（.pmtiles ファイルは残す）
// */
//function deleteSourceAndTempFiles($filePath)
//{
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        // カレントディレクトリ (`.`) と 親ディレクトリ (`..`) をスキップ
//        if ($file === '.' || $file === '..') {
//            continue;
//        }
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        // .pmtiles ファイルは削除しない
//        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'pmtiles') {
//            continue;
//        }
//        unlink($fullPath);
//    }
//}
///**
// * GeoJSON の BBOX を更新
// */
//function updateBBOX($coordinates, &$bbox) {
//    if (!is_array($coordinates[0])) {
//        $bbox[0] = min($bbox[0], $coordinates[0]);
//        $bbox[1] = min($bbox[1], $coordinates[1]);
//        $bbox[2] = max($bbox[2], $coordinates[0]);
//        $bbox[3] = max($bbox[3], $coordinates[1]);
//    } else {
//        foreach ($coordinates as $coord) {
//            updateBBOX($coord, $bbox);
//        }
//    }
//}
//
//function isFirstFeaturePoint($geojson) {
//    if (
//        isset($geojson["features"]) &&
//        is_array($geojson["features"]) &&
//        count($geojson["features"]) > 0 &&
//        isset($geojson["features"][0]["geometry"]["type"])
//    ) {
//        return strtolower($geojson["features"][0]["geometry"]["type"]) === "point";
//    }
//    return false;
//}
//
//
//
