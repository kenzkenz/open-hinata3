<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// 定数
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
define("EARTH_RADIUS_KM", 6371);
$logFile = "/tmp/php_script.log";

// ログ関数
function logMessage($message)
{
    global $logFile;
    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND);
}

// POST リクエストの確認
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    $error = ["error" => "POSTリクエストのみ受け付けます"];
    logMessage("Invalid request method: " . json_encode($error));
    echo json_encode($error);
    exit;
}

// POST データの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["file"])) {
    $error = ["error" => "ファイルパスが指定されていません"];
    logMessage("Missing file path: " . json_encode($error));
    echo json_encode($error);
    exit;
}

// 入力ファイルパスの検証
$filePath = realpath($data["file"]);
if (!$filePath || !file_exists($filePath)) {
    $error = ["error" => "指定されたファイルが存在しません", "details" => "Path: $filePath"];
    logMessage("File not found: " . json_encode($error));
    echo json_encode($error);
    exit;
}

// 入力パラメータ
$fileName = isset($data["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";
$resolution = isset($data["resolution"]) ? intval($data["resolution"]) : 22;
$transparent = isset($data["transparent"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["transparent"]) : "black";
$sourceEPSG = isset($data["srs"]) ? preg_replace('/[^0-9]/', '', $data["srs"]) : "2450";

// gdalinfoで座標を取得
$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);

if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    $error = ["error" => "gdalinfo で画像の範囲を取得できませんでした", "details" => $gdalOutput];
    logMessage("gdalinfo failed: " . json_encode($error));
    echo json_encode($error);
    exit;
}

$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];

// 座標変換関数
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

$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);

if (!$minCoord || !$maxCoord) {
    $error = ["error" => "座標変換に失敗しました"];
    logMessage("Coordinate transformation failed: " . json_encode($error));
    echo json_encode($error);
    exit;
}

$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];

// ハバーサイン距離計算
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

$max_zoom = $resolution;

// ディレクトリとファイルパスの設定
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$tileDir = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
$mbTilesPath = "$tileDir$fileBaseName.mbtiles";
$pmTilesPath = "$tileDir$fileBaseName.pmtiles";
$tileURL = "$BASE_URL$subDir/$fileBaseName/$fileBaseName.pmtiles";

// ディレクトリの作成
if (!is_dir($tileDir)) {
    if (!mkdir($tileDir, 0775, true)) {
        $error = ["error" => "Failed to create tile directory", "details" => "Path: $tileDir"];
        logMessage("Tile directory creation failed: " . json_encode($error));
        echo json_encode($error);
        exit;
    }
}
chmod($tileDir, 0775);
chown($tileDir, 'www-data');
chgrp($tileDir, 'www-data');

// グレースケール判定
function isGrayscale($filePath)
{
    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
}

// 画像処理本体（カラーは3バンドのみ抜き出し）
$isGray = isGrayscale($filePath);
if ($isGray) {
    $outputFilePath = $filePath; // 1バンド（グレースケール）
} else {
    // 3バンド(RGB)だけ抜き出す
//    $rgbFilePath = "$tileDir/rgb_only.tif";
//    $extractRGB = "gdal_translate -b 1 -b 2 -b 3 " . escapeshellarg($filePath) . " " . escapeshellarg($rgbFilePath);
//    exec($extractRGB . " 2>&1", $extractOutput, $extractReturnVar);
//    if ($extractReturnVar !== 0) {
//        $error = ["error" => "gdal_translateでRGB抽出に失敗", "details" => $extractOutput];
//        logMessage("gdal_translate failed: " . json_encode($error));
//        echo json_encode($error);
//        exit;
//    }
//    $outputFilePath = $rgbFilePath;
    $outputFilePath = $filePath;
}
$alpha_value = '';
if ($transparent === 'black') {
    $alpha_value = '-a 0,0,0';
} elseif ($transparent === 'white') {
    $alpha_value = '-a 255,255,255';
}

// gdal2tiles の実行
$tileCommand = "gdal2tiles.py $alpha_value -z 10-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes=8 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tileDir);
exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);
if ($tileReturnVar !== 0) {
    $error = ["error" => "gdal2tiles でタイル生成に失敗しました", "details" => $tileOutput];
    logMessage("gdal2tiles failed: " . json_encode($error));
    echo json_encode($error);
    exit;
}
logMessage("gdal2tiles succeeded: $tileDir");

// ★ parallel+mogrifyで白黒透過（CPUコア数に合わせて-j8などに調整可）
//$parallelTransparent = "find " . escapeshellarg($tileDir) . " -name '*.png' | parallel -j8 mogrify -transparent white {}";
//exec($parallelTransparent, $dummy, $ret1);
//$parallelTransparent2 = "find " . escapeshellarg($tileDir) . " -name '*.png' | parallel -j8 mogrify -transparent black {}";
//exec($parallelTransparent2, $dummy, $ret2);

// mb-util の確認と MBTiles 生成
$mbUtilPath = "/var/www/venv/bin/mb-util";
$pythonPath = "/var/www/venv/lib/python3.12/site-packages";
if (!file_exists($mbUtilPath) || !is_executable($mbUtilPath)) {
    $error = [
        "error" => "mb-util がインストールされていません。pip install mbutilしてください",
        "details" => "Checked path: $mbUtilPath"
    ];
    logMessage("mb-util check failed: " . json_encode($error));
    echo json_encode($error);
    exit;
}
$mbTilesCommand = "PYTHONPATH=$pythonPath /var/www/venv/bin/python3 $mbUtilPath --image_format=png " . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath) . " 2>&1";
exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
if ($mbTilesReturnVar !== 0) {
    $error = [
        "error" => "mb-util でMBTiles生成に失敗しました",
        "details" => $mbTilesOutput,
        "tileDirContents" => shell_exec("find " . escapeshellarg($tileDir) . " -type f")
    ];
    logMessage("mb-util failed: " . json_encode($error));
    echo json_encode($error);
    exit;
}
logMessage("mb-util succeeded: $mbTilesPath");
chmod($mbTilesPath, 0664);
chown($mbTilesPath, 'www-data');
chgrp($mbTilesPath, 'www-data');

// go-pmtiles の確認と PMTiles 生成
$pmTilesPathCmd = "/usr/local/bin/go-pmtiles";
if (!file_exists($pmTilesPathCmd) || !is_executable($pmTilesPathCmd)) {
    $error = [
        "error" => "go-pmtiles がインストールされていません。",
        "details" => "Checked path: $pmTilesPathCmd"
    ];
    logMessage("go-pmtiles check failed: " . json_encode($error));
    echo json_encode($error);
    exit;
}
$pmTilesCommand = "$pmTilesPathCmd convert " . escapeshellarg($mbTilesPath) . " " . escapeshellarg($pmTilesPath) . " 2>&1";
exec($pmTilesCommand, $pmTilesOutput, $pmTilesReturnVar);
if ($pmTilesReturnVar !== 0) {
    $error = [
        "error" => "go-pmtiles でPMTiles生成に失敗しました",
        "details" => $pmTilesOutput
    ];
    logMessage("go-pmtiles failed: " . json_encode($error));
    echo json_encode($error);
    exit;
}
logMessage("go-pmtiles succeeded: $pmTilesPath");
chmod($pmTilesPath, 0664);
chown($pmTilesPath, 'www-data');
chgrp($pmTilesPath, 'www-data');

// layer.json の生成
$layerJsonPath = "$tileDir/layer.json";
$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents($layerJsonPath, $layerData);
chmod($layerJsonPath, 0664);
chown($layerJsonPath, 'www-data');
chgrp($layerJsonPath, 'www-data');

// 元データと中間データの削除
deleteSourceAndTempFiles($filePath);

// タイルディレクトリ内の不要なファイル・ディレクトリを削除（PMTiles と layer.json を除く）
deleteTileDirContents($tileDir, $fileBaseName);

// 成功レスポンス
$response = [
    "success" => true,
    "tiles_url" => $tileURL,
    "tiles_dir" => $tileDir,
    "bbox" => $bbox4326,
    "area_km2" => $area_km2,
    "max_zoom" => $max_zoom,
    "tileCommand" => $tileCommand
];
logMessage("Process completed: " . json_encode($response));
echo json_encode($response);

// 元データと中間データの削除関数
function deleteSourceAndTempFiles($filePath)
{
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..' || strpos($file, 'thumbnail-') === 0) {
            continue;
        }
        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
        if (strpos($file, 'thumbnail-') !== 0 && is_file($fullPath)) {
            unlink($fullPath);
        }
    }
}

// タイルディレクトリ内の不要なファイル・ディレクトリを削除する関数
function deleteTileDirContents($tileDir, $fileBaseName)
{
    global $logFile;
    $keepFiles = ["$fileBaseName.pmtiles", "layer.json"];
    $dirContents = shell_exec("ls -la " . escapeshellarg($tileDir));
    file_put_contents($logFile, date("Y-m-d H:i:s") . " - Before deletion, $tileDir contents:\n$dirContents\n", FILE_APPEND);

    foreach (scandir($tileDir) as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $fullPath = $tileDir . DIRECTORY_SEPARATOR . $item;
        if (in_array($item, $keepFiles)) {
            file_put_contents($logFile, date("Y-m-d H:i:s") . " - Keeping file: $fullPath\n", FILE_APPEND);
            continue;
        }
        if (is_dir($fullPath)) {
            exec("rm -rf " . escapeshellarg($fullPath), $output, $returnVar);
            if ($returnVar === 0) {
                file_put_contents($logFile, date("Y-m-d H:i:s") . " - Deleted directory: $fullPath\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, date("Y-m-d H:i:s") . " - Failed to delete directory: $fullPath\n", FILE_APPEND);
            }
        } else {
            if (unlink($fullPath)) {
                file_put_contents($logFile, date("Y-m-d H:i:s") . " - Deleted file: $fullPath\n", FILE_APPEND);
            } else {
                file_put_contents($logFile, date("Y-m-d H:i:s") . " - Failed to delete file: $fullPath\n", FILE_APPEND);
            }
        }
    }
}
