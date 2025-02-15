<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// サーバーのベースURL (適宜変更)
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";

// 1km² の制限
$max_area_km2 = 1.0;

// 地球半径 (km)
define("EARTH_RADIUS_KM", 6371);

// POST リクエスト以外は拒否
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

// JSON データの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["file"])) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]);
    exit;
}

// 画像ファイルのパスを取得
$filePath = realpath($data["file"]);
if (!$filePath || !file_exists($filePath)) {
    echo json_encode(["error" => "指定されたファイルが存在しません"]);
    exit;
}

// `gdalinfo` で TIFF の BBOX を取得
$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);

if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    echo json_encode(["error" => "gdalinfo で 画像の範囲を取得できませんでした"]);
    exit;
}

// 元の BBOX を取得
$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];  // [minX, maxY]
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"]; // [maxX, minY]

// `EPSG:4326` に変換 (gdaltransform を使用)
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326")
{
    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd, $output, $returnVar);
    if ($returnVar === 0 && !empty($output)) {
        $coords = explode(" ", trim($output[0]));
        return [floatval($coords[0]), floatval($coords[1])]; // [longitude, latitude]
    }
    return null;
}

// EPSG の取得 (デフォルト: 2450)
$sourceEPSG = isset($data["srs"]) ? preg_replace('/[^0-9]/', '', $data["srs"]) : "2450";
$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG); // minX, minY
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG); // maxX, maxY

if (!$minCoord || !$maxCoord) {
    echo json_encode(["error" => "座標変換に失敗しました"]);
    exit;
}

// 変換後の BBOX
$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];

// **Haversine 公式を使って距離を計算**
function haversineDistance($lat1, $lon1, $lat2, $lon2)
{
    $lat1 = deg2rad($lat1);
    $lon1 = deg2rad($lon1);
    $lat2 = deg2rad($lat2);
    $lon2 = deg2rad($lon2);

    $dlat = $lat2 - $lat1;
    $dlon = $lon2 - $lon1;

    $a = sin($dlat / 2) * sin($dlat / 2) +
        cos($lat1) * cos($lat2) * sin($dlon / 2) * sin($dlon / 2);

    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

    return EARTH_RADIUS_KM * $c; // 距離 (km)
}

// 幅と高さの計算 (km)
$width_km = haversineDistance($minCoord[1], $minCoord[0], $minCoord[1], $maxCoord[0]);
$height_km = haversineDistance($minCoord[1], $minCoord[0], $maxCoord[1], $minCoord[0]);
$area_km2 = $width_km * $height_km;

// **もし 1km² を超える場合はエラーを返して処理を中止**
if ($area_km2 > $max_area_km2) {
    echo json_encode(["error" => "画像の範囲が大きすぎます ($width_km km × $height_km km = $area_km2 km²)。最大許容サイズは 1km² です。"]);
    exit;
}

// タイルの保存先ディレクトリ名の取得
$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";

// **拡張子を除いたファイル名を取得**
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME); // `example.tif` → `example`

// **タイルディレクトリの作成**
$tileDir = "/var/www/html/public_html/tiles/" . $subDir . "/" . $fileBaseName . "/";
if (!is_dir($tileDir)) {
    mkdir($tileDir, 0777, true);
}

// 公開URL (ネットでアクセスできるURL)
$tileURL = $BASE_URL . $subDir . "/" . $fileBaseName . "/{z}/{x}/{y}.png";

// **透過情報を保持した TIFF を作成 (TIFF のみ)**
$fileExt = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$warpedFilePath = $tileDir . "warped.tif";
if (in_array($fileExt, ["tif", "tiff"])) {
    $warpCommand = "gdalwarp -dstalpha " . escapeshellarg($filePath) . " " . escapeshellarg($warpedFilePath);
    exec($warpCommand . " 2>&1", $warpOutput, $warpReturnVar);
    if ($warpReturnVar !== 0) {
        echo json_encode(["error" => "gdalwarp で透過処理に失敗しました", "output" => $warpOutput]);
        exit;
    }
} else {
    $warpedFilePath = $filePath; // JPEG の場合はそのまま使用
}

// GDAL2TILES コマンド
$escapedTileDir = escapeshellarg($tileDir);
$tileCommand = "gdal2tiles.py -z 0-22 --s_srs EPSG:$sourceEPSG --xyz --processes=4 " . escapeshellarg($warpedFilePath) . " $escapedTileDir";

// 実行
exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);

// ログを記録
$logFile = $tileDir . "error_log.txt";
file_put_contents($logFile, implode("\n", $tileOutput), FILE_APPEND);

if ($tileReturnVar === 0) {
    echo json_encode(["success" => true, "tiles_url" => $tileURL, "bbox" => $bbox4326, "area_km2" => $area_km2]);
} else {
    echo json_encode(["error" => "タイル生成に失敗しました", "output" => $tileOutput]);
}

?>
