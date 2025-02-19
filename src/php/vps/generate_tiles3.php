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

//$max_zoom = ($resolution <= 15 || $area_km2 <= $max_area_km2) ? $resolution : 15;
$max_zoom = $resolution;

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
    // グレースケール画像の場合
    exec("gdal_translate -expand gray " . escapeshellarg($filePath) . " " . escapeshellarg($grayFilePath), $gdalTranslateOutput, $gdalTranslateReturn);
    if ($gdalTranslateReturn !== 0) {
        echo json_encode(["error" => "gdal_translate (expand gray) に失敗しました", "output" => $gdalTranslateOutput]);
        exit;
    }

    exec("gdal_translate -co TILED=YES -co COMPRESS=DEFLATE " . escapeshellarg($grayFilePath) . " " . escapeshellarg($outputFilePath), $gdalCompressOutput, $gdalCompressReturn);
    if ($gdalCompressReturn !== 0) {
        echo json_encode(["error" => "gdal_translate (compress) に失敗しました", "output" => $gdalCompressOutput]);
        exit;
    }

    exec("gdaladdo --config COMPRESS_OVERVIEW DEFLATE -r average " . escapeshellarg($outputFilePath) . " 2 4 8 16", $gdalAddoOutput, $gdalAddoReturn);
    if ($gdalAddoReturn !== 0) {
        echo json_encode(["error" => "gdaladdo に失敗しました", "output" => $gdalAddoOutput]);
        exit;
    }
} else {


}

$fileExt = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$alphaFilePath = pathinfo($filePath, PATHINFO_DIRNAME) . '/' . pathinfo($filePath, PATHINFO_FILENAME) . '_alpha.tif';
$finalAlphaTiff = pathinfo($filePath, PATHINFO_DIRNAME) . '/' . pathinfo($filePath, PATHINFO_FILENAME) . '_final_alpha.tif';

if (in_array($fileExt, ["tif", "tiff"])) {
    // 1. TIFF を `Byte` 型に統一しつつ、色を変更せずに処理
    $translateCommand = "gdal_translate -ot Byte -co COMPRESS=DEFLATE -co PHOTOMETRIC=RGB " .
        escapeshellarg($filePath) . " " . escapeshellarg($alphaFilePath);

    exec($translateCommand . " 2>&1", $translateOutput, $translateReturnVar);

    if ($translateReturnVar !== 0) {
        echo json_encode([
            "error" => "gdal_translate で TIFF 変換に失敗しました",
            "output" => implode("\n", $translateOutput),
            "command" => $translateCommand
        ]);
        exit;
    }

    // 2. gdal_calc.py で白を透明にする（色は変更せずに適用）
    $calcCommand = "gdal_calc.py --overwrite --co COMPRESS=DEFLATE --type=Byte " .
        "--outfile=" . escapeshellarg($alphaFilePath) . " " .
        "--calc=\"numpy.where((A>=250) & (B>=250) & (C>=250), 0, 255)\" " . // 色は変更せずに白だけ透明化
        "-A " . escapeshellarg($filePath) . " --A_band=1 " .
        "-B " . escapeshellarg($filePath) . " --B_band=2 " .
        "-C " . escapeshellarg($filePath) . " --B_band=3 " .
        "--NoDataValue=None";

    exec($calcCommand . " 2>&1", $calcOutput, $calcReturnVar);

    if ($calcReturnVar !== 0) {
        echo json_encode([
            "error" => "gdal_calc.py で透過処理に失敗しました",
            "output" => implode("\n", $calcOutput),
            "command" => $calcCommand
        ]);
        exit;
    }

    // 3. gdalwarp で確実にアルファチャンネルを適用し、色を保持
    $warpCommand = "gdalwarp -srcalpha -dstalpha " . escapeshellarg($alphaFilePath) . " " . escapeshellarg($finalAlphaTiff);
    exec($warpCommand . " 2>&1", $warpOutput, $warpReturnVar);

    if ($warpReturnVar !== 0) {
        echo json_encode([
            "error" => "gdalwarp で透過処理に失敗しました",
            "output" => implode("\n", $warpOutput),
            "command" => $warpCommand
        ]);
        exit;
    }

    $outputFilePath = $finalAlphaTiff;
} else {
    $outputFilePath = $filePath;
}





//$outputFilePath = $filePath;
$tileCommand = "gdal2tiles.py -z 0-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes=4 " . escapeshellarg($outputFilePath) . " $escapedTileDir";

//    echo json_encode([
//        "error" => "ImageMagick で赤色変換に失敗しました",
//        "command" => $tileCommand
//    ]);
//    exit;


exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);

$layerJsonPath = $tileDir . "layer.json";
$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents($layerJsonPath, $layerData);

if ($tileReturnVar === 0) {
    // タイル化成功後、元データと中間データを削除（ただし `thumbnail-` を除く）
//    deleteSourceAndTempFiles($filePath);
}

if ($tileReturnVar !== 0) {
    echo json_encode(["error" => "gdal2tiles でタイル生成に失敗しました", "details" => $tileOutput]);
    exit;
}

echo json_encode(["success" => true, "tiles_url" => $tileURL, "bbox" => $bbox4326, "area_km2" => $area_km2, "max_zoom" => $max_zoom]);

/**
 * uploads 内の元データと中間データを削除（thumbnail- で始まるファイルは除外）
 */
function deleteSourceAndTempFiles($filePath)
{
//    $dir = dirname($filePath);
//    $fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..' || strpos($file, 'thumbnail-') === 0) {
//            continue;
//        }
//
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        // `fileBaseName` に関連するファイル（temp_gray.tif, output.tif など）を削除、さらに warped.tif と cropped_ で始まるファイルも削除
//        if (strpos($file, $fileBaseName) === 0 || $file === 'warped.tif' || strpos($file, 'cropped_') === 0) {
//            unlink($fullPath);
//        }
//    }
//
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        // カレントディレクトリ (`.`) と 親ディレクトリ (`..`) をスキップ
        if ($file === '.' || $file === '..') {
            continue;
        }

        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;

        // `thumbnail-` で始まるファイルを除外し、それ以外は全削除
        if (strpos($file, 'thumbnail-') !== 0) {
            unlink($fullPath);
        }
    }
}
?>
