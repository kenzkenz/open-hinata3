<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// 入力を受け取る
$json = file_get_contents("php://input");
$data = json_decode($json, true);
$cities = $data["cities"];

// 元データのパスと保存先のパス
$inputPath = '/var/www/html/public_html/original-data/city-original.geojson';
$outputPath = '/var/www/html/public_html/original-data/city.geojson';

// 元ファイルを読み込む
$originalData = file_get_contents($inputPath);
if ($originalData === false) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => '元ファイルの読み込みに失敗しました']);
    exit;
}

$geojson = json_decode($originalData, true);
if (!isset($geojson['features'])) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'GeoJSONの構造が不正です']);
    exit;
}

// 各フィーチャに対してcitycodeとの一致をチェック
foreach ($geojson['features'] as &$feature) {
    $citycode = $feature['properties']['N03_007'] ?? null;
    if ($citycode !== null) {
        foreach ($cities as $city) {
            if ($city['citycode'] === $citycode) {
                $feature['properties']['public'] = 1;
                $feature['properties']['pmtilesurl'] = $city['pmtilesurl'];
                break;
            }
        }
    }
}

// 加工したデータを保存
$processedData = json_encode($geojson, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
$result = file_put_contents($outputPath, $processedData);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => '新しいファイルの保存に失敗しました']);
    exit;
}

// 成功レスポンス
echo json_encode(['status' => 'success', 'message' => 'city.geojsonを保存しました', 'cities' => $cities]);



//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//header("Content-Type: application/json");
//
//$json = file_get_contents("php://input");
//$data = json_decode($json, true);
//
//$cities = $data["cities"];
//
//// 元データのパスと保存先のパス
//$inputPath = '/var/www/html/public_html/original-data/city-original.geojson';
//$outputPath = '/var/www/html/public_html/original-data/city.geojson';
//// 元ファイルを読み込む
//$originalData = file_get_contents($inputPath);
//
//if ($originalData === false) {
//    http_response_code(500);
//    echo json_encode(['status' => 'error', 'message' => '元ファイルの読み込みに失敗しました']);
//    exit;
//}
//
//// 必要に応じてデータ加工（ここではそのまま保存）
//$processedData = $originalData;
//
//// 新しいファイルに保存
//$result = file_put_contents($outputPath, $processedData);
//
//if ($result === false) {
//    http_response_code(500);
//    echo json_encode(['status' => 'error', 'message' => '新しいファイルの保存に失敗しました']);
//    exit;
//}
//
//// 成功レスポンス
//echo json_encode(['status' => 'success', 'message' => 'city.geojsonを保存しました', 'cities' => $cities]);
