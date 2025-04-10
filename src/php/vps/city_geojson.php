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
$pmtilesPath = '/var/www/html/public_html/original-data/city.pmtiles';

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
            if (str_pad($city['citycode'], 5, '0', STR_PAD_LEFT) === str_pad($citycode, 5, '0', STR_PAD_LEFT)) {
            $feature['properties']['public'] = $city['public'];
            $feature['properties']['pmtilesurl'] = $city['pmtilesurl'];
            $feature['properties']['page'] = $city['page'];
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

//$tippecanoeCmd = sprintf(
//    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=14 --minimum-zoom=0 --layer=oh3 %s 2>&1",
//    escapeshellarg($pmtilesPath),
//    escapeshellarg($outputPath)
//);
//
//exec($tippecanoeCmd, $output, $returnVar);
//if ($returnVar !== 0) {
//    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
//    exit;
//}

// 成功レスポンス
echo json_encode(['status' => 'success', 'message' => 'city.geojsonを保存しました', 'cities' => $cities]);


//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//header("Content-Type: application/json");
//
//// 入力を受け取る
//$json = file_get_contents("php://input");
//$data = json_decode($json, true);
//$cities = $data["cities"];
//
//// 元データのパスと保存先のパス
//$inputPath = '/var/www/html/public_html/original-data/city-original.geojson';
//$outputPath = '/var/www/html/public_html/original-data/city.geojson';
//
//// 元ファイルを読み込む
//$originalData = file_get_contents($inputPath);
//if ($originalData === false) {
//    http_response_code(500);
//    echo json_encode(['status' => 'error', 'message' => '元ファイルの読み込みに失敗しました']);
//    exit;
//}
//
//$geojson = json_decode($originalData, true);
//if (!isset($geojson['features'])) {
//    http_response_code(500);
//    echo json_encode(['status' => 'error', 'message' => 'GeoJSONの構造が不正です']);
//    exit;
//}
//
//// 各フィーチャに対してcitycodeとの一致をチェック
//foreach ($geojson['features'] as &$feature) {
//    $citycode = $feature['properties']['N03_007'] ?? null;
//    if ($citycode !== null) {
//        foreach ($cities as $city) {
//            if (str_pad($city['citycode'], 5, '0', STR_PAD_LEFT) === str_pad($citycode, 5, '0', STR_PAD_LEFT)) {
//                $feature['properties']['public'] = $city['public'];
//                $feature['properties']['pmtilesurl'] = $city['pmtilesurl'];
//                break;
//            }
//        }
//    }
//}
//
//// 加工したデータを保存
//$processedData = json_encode($geojson, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
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