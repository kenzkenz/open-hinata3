<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
$max_area_km2 = 1.0;
define("EARTH_RADIUS_KM", 6371);

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["file"])) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]);
    exit;
}

$filePath = realpath($data["file"]);
if (!$filePath || !file_exists($filePath)) {
    echo json_encode(["error" => "指定されたファイルが存在しません"]);
    exit;
}

$fileName = isset($data["fileName"]) ? trim($data["fileName"]) : "";
$resolution = isset($data["resolution"]) ? intval($data["resolution"]) : 22;

$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);

if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    echo json_encode(["error" => "gdalinfo で 画像の範囲を取得できませんでした"]);
    exit;
}

$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];

function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326")
{
    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd, $output, $returnVar);
    if ($returnVar === 0 && !empty($output)) {
        $coords = explode(" ", trim($output[0]));
        return [floatval($coords[0]), floatval($coords[1])];
    }
    return null;
}

$sourceEPSG = isset($data["srs"]) ? preg_replace('/[^0-9]/', '', $data["srs"]) : "2450";
$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);

if (!$minCoord || !$maxCoord) {
    echo json_encode(["error" => "座標変換に失敗しました"]);
    exit;
}

$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];

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

    return EARTH_RADIUS_KM * $c;
}

$width_km = haversineDistance($minCoord[1], $minCoord[0], $minCoord[1], $maxCoord[0]);
$height_km = haversineDistance($minCoord[1], $minCoord[0], $maxCoord[1], $minCoord[0]);
$area_km2 = $width_km * $height_km;

$max_zoom = ($resolution <= 15 || $area_km2 <= $max_area_km2) ? $resolution : 15;

$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$tileDir = "/var/www/html/public_html/tiles/" . $subDir . "/" . $fileBaseName . "/";
if (!is_dir($tileDir)) {
    mkdir($tileDir, 0777, true);
}

$tileURL = $BASE_URL . $subDir . "/" . $fileBaseName . "/{z}/{x}/{y}.png";

$escapedTileDir = escapeshellarg($tileDir);

function isGrayscale($filePath)
{
    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
}

$isGray = isGrayscale($filePath);
$grayFilePath = "$filePath.temp_gray.tif";
$outputFilePath = "$filePath.output.tif";
if ($isGray) {
    exec("gdal_translate -expand gray " . escapeshellarg($filePath) . " " . escapeshellarg($grayFilePath), $gdalTranslateOutput, $gdalTranslateReturn);
    exec("gdal_translate -co TILED=YES -co COMPRESS=DEFLATE " . escapeshellarg($grayFilePath) . " " . escapeshellarg($outputFilePath), $gdalCompressOutput, $gdalCompressReturn);
    exec("gdaladdo --config COMPRESS_OVERVIEW DEFLATE -r average " . escapeshellarg($outputFilePath) . " 2 4 8 16", $gdalAddoOutput, $gdalAddoReturn);
} else {
    $outputFilePath = $filePath;
}
$tileCommand = "gdal2tiles.py -z 0-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes=4 " . escapeshellarg($outputFilePath) . " $escapedTileDir";
exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);

$layerJsonPath = $tileDir . "layer.json";
$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents($layerJsonPath, $layerData);

echo json_encode(["success" => true, "tiles_url" => $tileURL, "bbox" => $bbox4326, "area_km2" => $area_km2, "max_zoom" => $max_zoom]);












//
//
//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
//$max_area_km2 = 1.0;
//define("EARTH_RADIUS_KM", 6371);
//
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
//    exit;
//}
//
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["file"])) {
//    echo json_encode(["error" => "ファイルパスが指定されていません"]);
//    exit;
//}
//
//$filePath = realpath($data["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    echo json_encode(["error" => "指定されたファイルが存在しません"]);
//    exit;
//}
//
//$fileName = isset($data["fileName"]) ? trim($data["fileName"]) : "";
//$resolution = isset($data["resolution"]) ? intval($data["resolution"]) : 22;
//
//$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
//exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
//$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
//
//if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
//    echo json_encode(["error" => "gdalinfo で 画像の範囲を取得できませんでした"]);
//    exit;
//}
//
//$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
//$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
//
//function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326")
//{
//    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
//    exec($cmd, $output, $returnVar);
//    if ($returnVar === 0 && !empty($output)) {
//        $coords = explode(" ", trim($output[0]));
//        return [floatval($coords[0]), floatval($coords[1])];
//    }
//    return null;
//}
//
//$sourceEPSG = isset($data["srs"]) ? preg_replace('/[^0-9]/', '', $data["srs"]) : "2450";
//$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
//$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);
//
//if (!$minCoord || !$maxCoord) {
//    echo json_encode(["error" => "座標変換に失敗しました"]);
//    exit;
//}
//
//$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];
//
//function haversineDistance($lat1, $lon1, $lat2, $lon2)
//{
//    $lat1 = deg2rad($lat1);
//    $lon1 = deg2rad($lon1);
//    $lat2 = deg2rad($lat2);
//    $lon2 = deg2rad($lon2);
//
//    $dlat = $lat2 - $lat1;
//    $dlon = $lon2 - $lon1;
//
//    $a = sin($dlat / 2) * sin($dlat / 2) +
//        cos($lat1) * cos($lat2) * sin($dlon / 2) * sin($dlon / 2);
//
//    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
//
//    return EARTH_RADIUS_KM * $c;
//}
//
//$width_km = haversineDistance($minCoord[1], $minCoord[0], $minCoord[1], $maxCoord[0]);
//$height_km = haversineDistance($minCoord[1], $minCoord[0], $maxCoord[1], $minCoord[0]);
//$area_km2 = $width_km * $height_km;
//
//$max_zoom = ($resolution <= 15 || $area_km2 <= $max_area_km2) ? $resolution : 15;
//
//$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";
//$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//$tileDir = "/var/www/html/public_html/tiles/" . $subDir . "/" . $fileBaseName . "/";
//if (!is_dir($tileDir)) {
//    mkdir($tileDir, 0777, true);
//}
//
//$tileURL = $BASE_URL . $subDir . "/" . $fileBaseName . "/{z}/{x}/{y}.png";
//
//$fileExt = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
//$warpedFilePath = $tileDir . "warped.tif";
//if (in_array($fileExt, ["tif", "tiff"])) {
//    $warpCommand = "gdalwarp -dstalpha " . escapeshellarg($filePath) . " " . escapeshellarg($warpedFilePath);
//    exec($warpCommand . " 2>&1", $warpOutput, $warpReturnVar);
//    if ($warpReturnVar !== 0) {
//        echo json_encode(["error" => "gdalwarp で透過処理に失敗しました", "output" => $warpOutput]);
//        exit;
//    }
//} else {
//    $warpedFilePath = $filePath;
//}
//
//$escapedTileDir = escapeshellarg($tileDir);
//$tileCommand = "gdal2tiles.py -z 0-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes=4 " . escapeshellarg($warpedFilePath) . " $escapedTileDir";
//exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);
//
//$layerJsonPath = $tileDir . "layer.json";
//$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
//file_put_contents($layerJsonPath, $layerData);
//
//echo json_encode(["success" => true, "tiles_url" => $tileURL, "bbox" => $bbox4326, "area_km2" => $area_km2, "max_zoom" => $max_zoom]);
//
//?>
