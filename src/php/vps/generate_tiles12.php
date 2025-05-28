<?php
// PHP設定: スクリプトの実行環境を設定
ini_set('output_buffering', '0');
ini_set('zlib.output_compression', '0');
ini_set('memory_limit', '0');
ini_set('max_execution_time', 1200);
ini_set('max_input_time', 1200);

// SSEヘッダー
header("Content-Type: text/event-stream");
header("Cache-Control: no-cache");
header("Connection: keep-alive");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// バッファリング無効化
ob_end_flush();
flush();

// 定数
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
define("EARTH_RADIUS_KM", 6371);
define("EARTH_RADIUS_M", 6378137); // 地球の半径（メートル、Web Mercator用）
define("MAX_FILE_SIZE_BYTES", 104857600); // 100MB in bytes
$logFile = "/tmp/php_script.log";

// SSE送信関数
function sendSSE($data, $event = "message") {
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
    echo "#\n";
    flush();
}

// ログファイル書き込み
function logMessage($message) {
    global $logFile;
    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND);
}

// WebPサポートの確認
function checkWebPSupport() {
    $output = [];
    $returnVar = 0;
    exec("gdalinfo --formats 2>&1 | grep WEBP", $output, $returnVar);
    return !empty($output);
}

// ディレクトリの総ファイルサイズを計算
function calculateTileDirectorySize($tileDir) {
    $totalSize = 0;
    $totalTiles = 0;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($tileDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'webp') {
            $totalSize += $file->getSize();
            $totalTiles++;
        }
    }
    return [$totalSize, $totalTiles];
}

// 最大ズームレベルのディレクトリを削除
function deleteHighestZoomDirectory($tileDir, $currentMaxZoom) {
    $zoomDir = $tileDir . $currentMaxZoom . '/';
    if (is_dir($zoomDir)) {
        exec("rm -rf " . escapeshellarg($zoomDir));
        return true;
    }
    return false;
}

// 最大ズームレベル計算関数
function calculateMaxZoom($filePath, $sourceEPSG) {
    global $logFile;
    $gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
    exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
    $gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);

    if (!$gdalOutputJson || !isset($gdalOutputJson["size"]) || !isset($gdalOutputJson["geoTransform"])) {
        logMessage("gdalinfo failed for zoom calculation or no geotransform available");
        sendSSE(["log" => "ズーム計算用gdalinfo失敗、地理情報なし、デフォルト24使用"]);
        return 24;
    }

    $width = $gdalOutputJson["size"][0];
    $height = $gdalOutputJson["size"][1];
    $geoTransform = $gdalOutputJson["geoTransform"];
    $pixelWidth = abs($geoTransform[1]);
    $pixelHeight = abs($geoTransform[5]);
    $gsd = max($pixelWidth, $pixelHeight);

    $maxZoom = 0;
    for ($z = 0; $z <= 30; $z++) {
        $tileResolution = (2 * M_PI * EARTH_RADIUS_M) / (256 * pow(2, $z));
        if ($tileResolution <= $gsd) {
            $maxZoom = $z;
            break;
        }
    }

    $originalZoom = $maxZoom;
    $maxZoom = min($maxZoom, 24);
    logMessage("Calculated max zoom: $originalZoom, limited to: $maxZoom (GSD: $gsd m/pixel)");
    sendSSE(["log" => "計算された最大ズーム: $originalZoom, 制限後: $maxZoom (GSD: $gsd m/pixel)"]);
    return $maxZoom;
}

// POSTリクエスト確認
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    $error = ["error" => "POSTリクエストのみ受け付けます"];
    logMessage("Invalid request method: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

// FormData取得
if (!isset($_POST["file"]) || !isset($_POST["dir"])) {
    $error = ["error" => "ファイルパスまたはディレクトリが指定されていません"];
    logMessage("Missing file or dir: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

// ファイルパス検証
$filePath = realpath($_POST["file"]);
if (!$filePath || !file_exists($filePath)) {
    $error = ["error" => "ファイルが存在しません", "details" => "Path: $filePath"];
    logMessage("File not found: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("File verified: $filePath");
sendSSE(["log" => "ファイル確認完了: $filePath"]);

// パラメータ取得
$fileName = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]);
$resolution = isset($_POST["resolution"]) ? intval($_POST["resolution"]) : null;
$transparent = 'black'; // 白色を黒色に変換するため、透過色は黒に固定
$sourceEPSG = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "2450";

logMessage("Parameters: fileName=$fileName, subDir=$subDir, resolution=$resolution, transparent=$transparent, sourceEPSG=$sourceEPSG");
sendSSE(["log" => "パラメータ取得: fileName=$fileName, subDir=$subDir"]);

// WebPサポートの確認
if (!checkWebPSupport()) {
    $error = ["error" => "GDALにWebPサポートがありません", "details" => "libwebpをインストールしてください"];
    logMessage("WebP support missing: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("WebP support confirmed");
sendSSE(["log" => "WebPサポートを確認しました"]);

// ファイル形式の確認
$fileExtension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$isJpeg = in_array($fileExtension, ['jpg', 'jpeg']);
logMessage("File format: " . ($isJpeg ? "JPEG" : "Non-JPEG"));
sendSSE(["log" => "ファイル形式: " . ($isJpeg ? "JPEG" : "非JPEG")]);

// JPEG入力の場合の事前処理
$outputFilePath = $filePath;
if ($isJpeg) {
    sendSSE(["log" => "JPEG入力の事前処理を開始します"]);
    $tempOutputPath = "/tmp/" . $fileName . "_processed.tif";
    $preprocessCommand = "gdal_translate -of GTiff " . escapeshellarg($filePath) . " " . escapeshellarg($tempOutputPath);
    exec($preprocessCommand, $preprocessOutput, $preprocessReturnVar);
    if ($preprocessReturnVar !== 0) {
        $error = ["error" => "JPEG事前処理失敗", "details" => implode("\n", $preprocessOutput)];
        logMessage("JPEG preprocessing failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
    $outputFilePath = $tempOutputPath;
    logMessage("JPEG preprocessing completed: $outputFilePath");
    sendSSE(["log" => "JPEG事前処理が完了しました"]);
}

// 白色を黒色に変換する処理
sendSSE(["log" => "白色を黒色に変換する処理を開始します"]);

// 一時ファイルのパス
$redOutputPath = "/tmp/" . $fileName . "_red.tif";
$greenOutputPath = "/tmp/" . $fileName . "_green.tif";
$blueOutputPath = "/tmp/" . $fileName . "_blue.tif";
$whiteToBlackOutputPath = "/tmp/" . $fileName . "_white_to_black.tif";

// 各バンド（R, G, B）の処理
$bands = [
    ['band' => 1, 'output' => $redOutputPath],
    ['band' => 2, 'output' => $greenOutputPath],
    ['band' => 3, 'output' => $blueOutputPath]
];

foreach ($bands as $index => $bandConfig) {
    $bandNum = $bandConfig['band'];
    $bandOutput = $bandConfig['output'];
    $whiteToBlackCommand = "gdal_calc.py " .
        "-A " . escapeshellarg($outputFilePath) . " --A_band=1 " .
        "-B " . escapeshellarg($outputFilePath) . " --B_band=2 " .
        "-C " . escapeshellarg($outputFilePath) . " --C_band=3 " .
        "--outfile=" . escapeshellarg($bandOutput) . " " .
        "--calc=\"where((A==255)*(B==255)*(C==255), 0, A)\" " .
        "--type=Byte --format=GTiff --overwrite 2>&1";

    if ($bandNum != 1) {
        $whiteToBlackCommand = str_replace(
            "--calc=\"where((A==255)*(B==255)*(C==255), 0, A)\"",
            "--calc=\"where((A==255)*(B==255)*(C==255), 0, " . ($bandNum == 2 ? "B" : "C") . ")\"",
            $whiteToBlackCommand
        );
    }

    exec($whiteToBlackCommand, $whiteToBlackOutput, $whiteToBlackReturnVar);
    if ($whiteToBlackReturnVar !== 0) {
        $error = ["error" => "白色から黒色への変換失敗（バンド{$bandNum}）", "details" => implode("\n", $whiteToBlackOutput)];
        logMessage("White to black conversion failed for band {$bandNum}: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
    logMessage("White to black conversion completed for band {$bandNum}: $bandOutput");
    sendSSE(["log" => "白色から黒色への変換（バンド{$bandNum}）が完了しました"]);
}

// バンドをマージ
$mergeCommand = "gdal_merge.py -separate -o " . escapeshellarg($whiteToBlackOutputPath) . " " .
    escapeshellarg($redOutputPath) . " " . escapeshellarg($greenOutputPath) . " " . escapeshellarg($blueOutputPath) . " 2>&1";
exec($mergeCommand, $mergeOutput, $mergeReturnVar);
if ($mergeReturnVar !== 0) {
    $error = ["error" => "バンドマージ失敗", "details" => implode("\n", $mergeOutput)];
    logMessage("Band merge failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("Band merge completed: $whiteToBlackOutputPath");
sendSSE(["log" => "バンドマージが完了しました"]);

// 後続の処理で使用するファイルパスを更新
$outputFilePath = $whiteToBlackOutputPath;

// 透過色の設定
$alpha_value = '0,0,0'; // 黒色を透過
logMessage("Transparent color set to black (0,0,0)");
sendSSE(["log" => "透過色を黒 (0,0,0) に設定"]);

// gdalinfoで座標取得
sendSSE(["log" => "gdalinfo 実行中..."]);
$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($outputFilePath);
exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);

if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    $error = ["error" => "gdalinfo 失敗", "details" => implode("\n", $gdalOutput)];
    logMessage("gdalinfo failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
logMessage("gdalinfo coordinates: upperLeft=" . json_encode($upperLeft) . ", lowerRight=" . json_encode($lowerRight));
sendSSE(["log" => "gdalinfo 座標取得完了"]);

// 座標変換
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd, $output, $returnVar);
    if ($returnVar === 0 && !empty($output)) {
        $coords = explode(" ", trim($output[0]));
        return [floatval($coords[0]), floatval($coords[1])];
    }
    return null;
}

sendSSE(["log" => "座標変換開始"]);
$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);

if (!$minCoord || !$maxCoord) {
    $error = ["error" => "座標変換失敗"];
    logMessage("Coordinate transformation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];
logMessage("Transformed bbox: " . json_encode($bbox4326));
sendSSE(["log" => "座標変換完了: " . json_encode($bbox4326)]);

// 最大ズームレベルの決定
$max_zoom = $resolution ?: calculateMaxZoom($outputFilePath, $sourceEPSG);

// ディレクトリ設定
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$tileDir = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
$mbTilesPath = "$tileDir$fileBaseName.mbtiles";
$pmTilesPath = "$tileDir$fileBaseName.pmtiles";
$tileURL = "$BASE_URL$subDir/$fileBaseName/$fileBaseName.pmtiles";

// ディレクトリ作成
if (!is_dir($tileDir)) {
    if (!mkdir($tileDir, 0775, true)) {
        $error = ["error" => "ディレクトリ作成失敗", "details" => "Path: $tileDir"];
        logMessage("Tile directory creation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
}
chmod($tileDir, 0775);
chown($tileDir, 'www-data');
chgrp($tileDir, 'www-data');
logMessage("Tile directory created: $tileDir");
sendSSE(["log" => "タイルディレクトリ作成: $tileDir"]);

// グレースケール判定
function isGrayscale($filePath) {
    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
}

$isGray = isGrayscale($outputFilePath);
logMessage("Grayscale check: " . ($isGray ? "Grayscale" : "Color"));
sendSSE(["log" => "グレースケール判定完了: " . ($isGray ? "グレースケール" : "カラー")]);

// gdal2tilesでWebPタイル生成
sendSSE(["log" => "WebPタイル生成準備中。少々お待ちください。"]);
$tileCommandArgs = [
    'gdal2tiles.py',
    '--tiledriver', 'WEBP',
    '-a', escapeshellarg($alpha_value),
    '-z', "10-$max_zoom",
    '--s_srs', escapeshellarg("EPSG:$sourceEPSG"),
    '--xyz',
    '--processes', '8',
    escapeshellarg($outputFilePath),
    escapeshellarg($tileDir)
];
$tileCommand = implode(' ', $tileCommandArgs) . ' 2>&1';
logMessage("Executing gdal2tiles command: $tileCommand");
logMessage("Command args: " . json_encode($tileCommandArgs, JSON_UNESCAPED_UNICODE));
$descriptors = [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]];
$process = proc_open($tileCommand, $descriptors, $pipes);
$output = [];
if (is_resource($process)) {
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    while (!feof($pipes[1]) || !feof($pipes[2])) {
        $stdout = fgets($pipes[1]);
        $stderr = fgets($pipes[2]);
        if ($stdout) {
            $log = trim($stdout);
            logMessage("gdal2tiles stdout: $log");
            sendSSE(["log" => $log]);
            $output[] = $log;
        }
        if ($stderr) {
            $log = trim($stderr);
            logMessage("gdal2tiles stderr: $log");
            sendSSE(["log" => "[ERROR] $log"]);
            $output[] = "[ERROR] $log";
        }
        usleep(100000);
    }
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $tileReturnVar = proc_close($process);
} else {
    $tileReturnVar = 1;
}

if ($tileReturnVar !== 0) {
    $error = ["error" => "gdal2tiles 失敗", "details" => implode("\n", $output)];
    logMessage("gdal2tiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("gdal2tiles succeeded: $tileDir");
sendSSE(["log" => "gdal2tiles によるWebPタイル生成が完了しました"]);

// タイルの総容量を計算し、必要に応じてズームレベルを削除
sendSSE(["log" => "WebPタイルの総容量を計算中..."]);
$currentMaxZoom = $max_zoom;
$minZoom = 10;
while ($currentMaxZoom >= $minZoom) {
    list($totalSizeBytes, $totalTiles) = calculateTileDirectorySize($tileDir);
    $totalSizeMB = round($totalSizeBytes / (1024 * 1024), 2);
    $avgTileSizeKB = $totalTiles > 0 ? round(($totalSizeBytes / $totalTiles) / 1024, 2) : 0;
    logMessage("Total tile size for zoom 10-$currentMaxZoom: $totalSizeMB MB ($totalSizeBytes bytes, $totalTiles tiles, AvgTileSize: $avgTileSizeKB KB)");
    sendSSE(["log" => "ズーム 10-$currentMaxZoom のWebPタイル総容量: $totalSizeMB MB ($totalSizeBytes バイト, $totalTiles タイル, 平均タイルサイズ: $avgTileSizeKB KB)"]);

    if ($totalSizeBytes <= MAX_FILE_SIZE_BYTES) {
        break;
    }

    sendSSE(["log" => "WebPタイル総容量が100MBを超過、ズーム $currentMaxZoom を削除します"]);
    if (!deleteHighestZoomDirectory($tileDir, $currentMaxZoom)) {
        logMessage("Failed to delete zoom directory: $currentMaxZoom");
        sendSSE(["log" => "ズーム $currentMaxZoom の削除に失敗"]);
        break;
    }
    logMessage("Deleted zoom directory: $currentMaxZoom");
    sendSSE(["log" => "ズーム $currentMaxZoom を削除しました"]);
    $currentMaxZoom--;
}
$max_zoom = $currentMaxZoom;

if ($max_zoom < $minZoom) {
    $error = ["error" => "最小ズームレベル以下に達しました"];
    logMessage("Reached below minimum zoom level: $minZoom");
    sendSSE($error, "error");
    exit;
}
logMessage("Final max zoom after size adjustment: $max_zoom");
sendSSE(["log" => "サイズ調整後の最終最大ズーム: $max_zoom"]);

// mb-utilでMBTiles生成（WebP）
sendSSE(["log" => "mb-util によるMBTiles生成を開始します"]);
$mbUtilPath = "/var/www/venv/bin/mb-util";
$pythonPath = "/var/www/venv/lib/python3.12/site-packages";
if (!file_exists($mbUtilPath) || !is_executable($mbUtilPath)) {
    $error = ["error" => "mb-util 未インストール", "details" => "Path: $mbUtilPath"];
    logMessage("mb-util check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$mbTilesCommand = "PYTHONPATH=$pythonPath /var/www/venv/bin/python3 $mbUtilPath --image_format=webp " . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath) . " 2>&1";
exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
logMessage("mb-util output: " . implode("\n", $mbTilesOutput));
if ($mbTilesReturnVar !== 0) {
    $error = ["error" => "mb-util 失敗", "details" => implode("\n", $mbTilesOutput)];
    logMessage("mb-util failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("mb-util succeeded: $mbTilesPath");
chmod($mbTilesPath, 0664);
chown($mbTilesPath, 'www-data');
chgrp($mbTilesPath, 'www-data');
sendSSE(["log" => "mb-util によるMBTiles生成が完了しました"]);

// go-pmtilesでPMTiles生成
sendSSE(["log" => "go-pmtiles によるPMTiles生成を開始します"]);
$pmTilesPathCmd = "/usr/local/bin/go-pmtiles";
if (!file_exists($pmTilesPathCmd) || !is_executable($pmTilesPathCmd)) {
    $error = ["error" => "go-pmtiles 未インストール", "details" => "Path: $pmTilesPathCmd"];
    logMessage("go-pmtiles check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$pmTilesCommand = "$pmTilesPathCmd convert " . escapeshellarg($mbTilesPath) . " " . escapeshellarg($pmTilesPath) . " 2>&1";
exec($pmTilesCommand, $pmTilesOutput, $pmTilesReturnVar);
logMessage("go-pmtiles output: " . implode("\n", $pmTilesOutput));
if ($pmTilesReturnVar !== 0) {
    $error = ["error" => "go-pmtiles 失敗", "details" => implode("\n", $pmTilesOutput)];
    logMessage("go-pmtiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("go-pmtiles succeeded: $pmTilesPath");
chmod($pmTilesPath, 0664);
chown($pmTilesPath, 'www-data');
chgrp($pmTilesPath, 'www-data');
sendSSE(["log" => "go-pmtiles によるPMTiles生成が完了しました"]);

// layer.json生成
$layerJsonPath = "$tileDir/layer.json";
$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents($layerJsonPath, $layerData);
chmod($layerJsonPath, 0664);
chown($layerJsonPath, 'www-data');
chgrp($layerJsonPath, 'www-data');
logMessage("layer.json created: $layerJsonPath");
sendSSE(["log" => "layer.json を生成しました"]);

// クリーンアップ
function deleteSourceAndTempFiles($filePath, $tempOutputPath = null, $whiteToBlackOutputPath = null, $redOutputPath = null, $greenOutputPath = null, $blueOutputPath = null) {
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..') continue;
        $fullPath = "$dir/$file";
        if (is_file($fullPath)) unlink($fullPath);
    }
    if ($tempOutputPath && file_exists($tempOutputPath)) {
        unlink($tempOutputPath);
    }
    if ($whiteToBlackOutputPath && file_exists($whiteToBlackOutputPath)) {
        unlink($whiteToBlackOutputPath);
    }
    if ($redOutputPath && file_exists($redOutputPath)) {
        unlink($redOutputPath);
    }
    if ($greenOutputPath && file_exists($greenOutputPath)) {
        unlink($greenOutputPath);
    }
    if ($blueOutputPath && file_exists($blueOutputPath)) {
        unlink($blueOutputPath);
    }
}
deleteSourceAndTempFiles($filePath, $isJpeg ? $tempOutputPath : null, $whiteToBlackOutputPath, $redOutputPath, $greenOutputPath, $blueOutputPath);
logMessage("Source and temp files deleted");
sendSSE(["log" => "元データと中間データを削除しました"]);

// タイルディレクトリクリーンアップ
function deleteTileDirContents($tileDir, $fileBaseName) {
    global $logFile;
    $keepFiles = ["$fileBaseName.pmtiles", "layer.json"];
    foreach (scandir($tileDir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $fullPath = "$tileDir/$item";
        if (in_array($item, $keepFiles)) continue;
        if (is_dir($fullPath)) {
            exec("rm -rf " . escapeshellarg($fullPath));
        } else {
            unlink($fullPath);
        }
    }
    logMessage("Tile directory cleaned: $tileDir");
}
deleteTileDirContents($tileDir, $fileBaseName);
sendSSE(["log" => "タイルディレクトリの不要なファイルを削除しました"]);

// pmtilesファイルのサイズを取得
$pmTilesSizeBytes = file_exists($pmTilesPath) ? filesize($pmTilesPath) : 0;
$pmTilesSizeMB = round($pmTilesSizeBytes / (1024 * 1024), 2);
logMessage("Actual pmtiles size: $pmTilesSizeMB MB");
sendSSE(["log" => "実際のpmtilesサイズ: $pmTilesSizeMB MB"]);

// 成功レスポンス
$response = [
    "success" => true,
    "tiles_url" => $tileURL,
    "tiles_dir" => $tileDir,
    "bbox" => $bbox4326,
    "max_zoom" => $max_zoom,
    "tileCommand" => $tileCommand,
    "pmtiles_size_mb" => $pmTilesSizeMB
];
logMessage("Process completed: " . json_encode($response, JSON_UNESCAPED_UNICODE));
sendSSE($response, "success");
?>



//
//// PHP設定: スクリプトの実行環境を設定
//ini_set('output_buffering', '0');
//ini_set('zlib.output_compression', '0');
//ini_set('memory_limit', '0');
//ini_set('max_execution_time', 1200);
//ini_set('max_input_time', 1200);
//
//// SSEヘッダー
//header("Content-Type: text/event-stream");
//header("Cache-Control: no-cache");
//header("Connection: keep-alive");
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// バッファリング無効化
//ob_end_flush();
//flush();
//
//// 定数
//$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
//define("EARTH_RADIUS_KM", 6371);
//define("EARTH_RADIUS_M", 6378137); // 地球の半径（メートル、Web Mercator用）
//define("MAX_FILE_SIZE_BYTES", 104857600); // 100MB in bytes
//$logFile = "/tmp/php_script.log";
//
//// SSE送信関数
//function sendSSE($data, $event = "message") {
//    echo "event: $event\n";
//    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
//    echo "#\n";
//    flush();
//}
//
//// ログファイル書き込み
//function logMessage($message) {
//    global $logFile;
//    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND);
//}
//
//// WebPサポートの確認
//function checkWebPSupport() {
//    $output = [];
//    $returnVar = 0;
//    exec("gdalinfo --formats 2>&1 | grep WEBP", $output, $returnVar);
//    return !empty($output);
//}
//
//// ディレクトリの総ファイルサイズを計算
//function calculateTileDirectorySize($tileDir) {
//    $totalSize = 0;
//    $totalTiles = 0;
//    $iterator = new RecursiveIteratorIterator(
//        new RecursiveDirectoryIterator($tileDir, RecursiveDirectoryIterator::SKIP_DOTS),
//        RecursiveIteratorIterator::SELF_FIRST
//    );
//    foreach ($iterator as $file) {
//        if ($file->isFile() && $file->getExtension() === 'webp') {
//            $totalSize += $file->getSize();
//            $totalTiles++;
//        }
//    }
//    return [$totalSize, $totalTiles];
//}
//
//// 最大ズームレベルのディレクトリを削除
//function deleteHighestZoomDirectory($tileDir, $currentMaxZoom) {
//    $zoomDir = $tileDir . $currentMaxZoom . '/';
//    if (is_dir($zoomDir)) {
//        exec("rm -rf " . escapeshellarg($zoomDir));
//        return true;
//    }
//    return false;
//}
//
//// 最大ズームレベル計算関数
//function calculateMaxZoom($filePath, $sourceEPSG) {
//    global $logFile;
//    $gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
//    exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
//    $gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
//
//    if (!$gdalOutputJson || !isset($gdalOutputJson["size"]) || !isset($gdalOutputJson["geoTransform"])) {
//        logMessage("gdalinfo failed for zoom calculation or no geotransform available");
//        sendSSE(["log" => "ズーム計算用gdalinfo失敗、地理情報なし、デフォルト24使用"]);
//        return 24;
//    }
//
//    $width = $gdalOutputJson["size"][0];
//    $height = $gdalOutputJson["size"][1];
//    $geoTransform = $gdalOutputJson["geoTransform"];
//    $pixelWidth = abs($geoTransform[1]);
//    $pixelHeight = abs($geoTransform[5]);
//    $gsd = max($pixelWidth, $pixelHeight);
//
//    $maxZoom = 0;
//    for ($z = 0; $z <= 30; $z++) {
//        $tileResolution = (2 * M_PI * EARTH_RADIUS_M) / (256 * pow(2, $z));
//        if ($tileResolution <= $gsd) {
//            $maxZoom = $z;
//            break;
//        }
//    }
//
//    $originalZoom = $maxZoom;
//    $maxZoom = min($maxZoom, 24);
//    logMessage("Calculated max zoom: $originalZoom, limited to: $maxZoom (GSD: $gsd m/pixel)");
//    sendSSE(["log" => "計算された最大ズーム: $originalZoom, 制限後: $maxZoom (GSD: $gsd m/pixel)"]);
//    return $maxZoom;
//}
//
//// POSTリクエスト確認
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    $error = ["error" => "POSTリクエストのみ受け付けます"];
//    logMessage("Invalid request method: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//// FormData取得
//if (!isset($_POST["file"]) || !isset($_POST["dir"])) {
//    $error = ["error" => "ファイルパスまたはディレクトリが指定されていません"];
//    logMessage("Missing file or dir: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//// ファイルパス検証
//$filePath = realpath($_POST["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    $error = ["error" => "ファイルが存在しません", "details" => "Path: $filePath"];
//    logMessage("File not found: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("File verified: $filePath");
//sendSSE(["log" => "ファイル確認完了: $filePath"]);
//
//// パラメータ取得
//$fileName = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
//$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]);
//$resolution = isset($_POST["resolution"]) ? intval($_POST["resolution"]) : null;
//$transparent = isset($_POST["transparent"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["transparent"]) : "black";
//$sourceEPSG = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "2450";
//
//logMessage("Parameters: fileName=$fileName, subDir=$subDir, resolution=$resolution, transparent=$transparent, sourceEPSG=$sourceEPSG");
//sendSSE(["log" => "パラメータ取得: fileName=$fileName, subDir=$subDir"]);
//
//// WebPサポートの確認
//if (!checkWebPSupport()) {
//    $error = ["error" => "GDALにWebPサポートがありません", "details" => "libwebpをインストールしてください"];
//    logMessage("WebP support missing: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("WebP support confirmed");
//sendSSE(["log" => "WebPサポートを確認しました"]);
//
//// ファイル形式の確認
//$fileExtension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
//$isJpeg = in_array($fileExtension, ['jpg', 'jpeg']);
//logMessage("File format: " . ($isJpeg ? "JPEG" : "Non-JPEG"));
//sendSSE(["log" => "ファイル形式: " . ($isJpeg ? "JPEG" : "非JPEG")]);
//
//// JPEG入力の場合の事前処理
//$outputFilePath = $filePath;
//if ($isJpeg) {
//    sendSSE(["log" => "JPEG入力の事前処理を開始します"]);
//    $tempOutputPath = "/tmp/" . $fileName . "_processed.tif";
//    $preprocessCommand = "gdal_translate -of GTiff " . escapeshellarg($filePath) . " " . escapeshellarg($tempOutputPath);
//    exec($preprocessCommand, $preprocessOutput, $preprocessReturnVar);
//    if ($preprocessReturnVar !== 0) {
//        $error = ["error" => "JPEG事前処理失敗", "details" => implode("\n", $preprocessOutput)];
//        logMessage("JPEG preprocessing failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//        sendSSE($error, "error");
//        exit;
//    }
//    $outputFilePath = $tempOutputPath;
//    logMessage("JPEG preprocessing completed: $outputFilePath");
//    sendSSE(["log" => "JPEG事前処理が完了しました"]);
//}
//
//// gdalinfoで座標取得
//sendSSE(["log" => "gdalinfo 実行中..."]);
//$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($outputFilePath);
//exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
//$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
//
//if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
//    $error = ["error" => "gdalinfo 失敗", "details" => implode("\n", $gdalOutput)];
//    logMessage("gdalinfo failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
//$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
//logMessage("gdalinfo coordinates: upperLeft=" . json_encode($upperLeft) . ", lowerRight=" . json_encode($lowerRight));
//sendSSE(["log" => "gdalinfo 座標取得完了"]);
//
//// 座標変換
//function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
//    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
//    exec($cmd, $output, $returnVar);
//    if ($returnVar === 0 && !empty($output)) {
//        $coords = explode(" ", trim($output[0]));
//        return [floatval($coords[0]), floatval($coords[1])];
//    }
//    return null;
//}
//
//sendSSE(["log" => "座標変換開始"]);
//$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
//$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);
//
//if (!$minCoord || !$maxCoord) {
//    $error = ["error" => "座標変換失敗"];
//    logMessage("Coordinate transformation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];
//logMessage("Transformed bbox: " . json_encode($bbox4326));
//sendSSE(["log" => "座標変換完了: " . json_encode($bbox4326)]);
//
//// 最大ズームレベルの決定
//$max_zoom = $resolution ?: calculateMaxZoom($outputFilePath, $sourceEPSG);
//
//// ディレクトリ設定
//$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//$tileDir = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
//$mbTilesPath = "$tileDir$fileBaseName.mbtiles";
//$pmTilesPath = "$tileDir$fileBaseName.pmtiles";
//$tileURL = "$BASE_URL$subDir/$fileBaseName/$fileBaseName.pmtiles";
//
//// ディレクトリ作成
//if (!is_dir($tileDir)) {
//    if (!mkdir($tileDir, 0775, true)) {
//        $error = ["error" => "ディレクトリ作成失敗", "details" => "Path: $tileDir"];
//        logMessage("Tile directory creation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//        sendSSE($error, "error");
//        exit;
//    }
//}
//chmod($tileDir, 0775);
//chown($tileDir, 'www-data');
//chgrp($tileDir, 'www-data');
//logMessage("Tile directory created: $tileDir");
//sendSSE(["log" => "タイルディレクトリ作成: $tileDir"]);
//
//// グレースケール判定
//function isGrayscale($filePath) {
//    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
//    $infoJson = json_decode(implode("\n", $infoOutput), true);
//    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
//}
//
//$isGray = isGrayscale($outputFilePath);
//$alpha_value = $transparent === 'black' ? '0,0,0' : ($transparent === 'white' ? '255,255,255' : '');
//logMessage("Grayscale check: " . ($isGray ? "Grayscale" : "Color"));
//sendSSE(["log" => "グレースケール判定完了: " . ($isGray ? "グレースケール" : "カラー")]);
//
//// gdal2tilesでWebPタイル生成（引数を厳密に構築）
//sendSSE(["log" => "WebPタイル生成準備中。少々お待ちください。"]);
//$tileCommandArgs = [
//    'gdal2tiles.py',
//    '--tiledriver', 'WEBP',
////    '-co', 'QUALITY=80',
//    '-a', escapeshellarg($alpha_value),
//    '-z', "10-$max_zoom",
//    '--s_srs', escapeshellarg("EPSG:$sourceEPSG"),
//    '--xyz',
//    '--processes', '8',
//    escapeshellarg($outputFilePath),
//    escapeshellarg($tileDir)
//];
//$tileCommand = implode(' ', $tileCommandArgs) . ' 2>&1';
//logMessage("Executing gdal2tiles command: $tileCommand");
//logMessage("Command args: " . json_encode($tileCommandArgs, JSON_UNESCAPED_UNICODE));
//$descriptors = [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]];
//$process = proc_open($tileCommand, $descriptors, $pipes);
//$output = [];
//if (is_resource($process)) {
//    stream_set_blocking($pipes[1], false);
//    stream_set_blocking($pipes[2], false);
//    while (!feof($pipes[1]) || !feof($pipes[2])) {
//        $stdout = fgets($pipes[1]);
//        $stderr = fgets($pipes[2]);
//        if ($stdout) {
//            $log = trim($stdout);
//            logMessage("gdal2tiles stdout: $log");
//            sendSSE(["log" => $log]);
//            $output[] = $log;
//        }
//        if ($stderr) {
//            $log = trim($stderr);
//            logMessage("gdal2tiles stderr: $log");
//            sendSSE(["log" => "[ERROR] $log"]);
//            $output[] = "[ERROR] $log";
//        }
//        usleep(100000);
//    }
//    fclose($pipes[0]);
//    fclose($pipes[1]);
//    fclose($pipes[2]);
//    $tileReturnVar = proc_close($process);
//} else {
//    $tileReturnVar = 1;
//}
//
//if ($tileReturnVar !== 0) {
//    $error = ["error" => "gdal2tiles 失敗", "details" => implode("\n", $output)];
//    logMessage("gdal2tiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("gdal2tiles succeeded: $tileDir");
//sendSSE(["log" => "gdal2tiles によるWebPタイル生成が完了しました"]);
//
//// タイルの総容量を計算し、必要に応じてズームレベルを削除
//sendSSE(["log" => "WebPタイルの総容量を計算中..."]);
//$currentMaxZoom = $max_zoom;
//$minZoom = 10;
//while ($currentMaxZoom >= $minZoom) {
//    list($totalSizeBytes, $totalTiles) = calculateTileDirectorySize($tileDir);
//    $totalSizeMB = round($totalSizeBytes / (1024 * 1024), 2);
//    $avgTileSizeKB = $totalTiles > 0 ? round(($totalSizeBytes / $totalTiles) / 1024, 2) : 0;
//    logMessage("Total tile size for zoom 10-$currentMaxZoom: $totalSizeMB MB ($totalSizeBytes bytes, $totalTiles tiles, AvgTileSize: $avgTileSizeKB KB)");
//    sendSSE(["log" => "ズーム 10-$currentMaxZoom のWebPタイル総容量: $totalSizeMB MB ($totalSizeBytes バイト, $totalTiles タイル, 平均タイルサイズ: $avgTileSizeKB KB)"]);
//
//    if ($totalSizeBytes <= MAX_FILE_SIZE_BYTES) {
//        break;
//    }
//
//    sendSSE(["log" => "WebPタイル総容量が100MBを超過、ズーム $currentMaxZoom を削除します"]);
//    if (!deleteHighestZoomDirectory($tileDir, $currentMaxZoom)) {
//        logMessage("Failed to delete zoom directory: $currentMaxZoom");
//        sendSSE(["log" => "ズーム $currentMaxZoom の削除に失敗"]);
//        break;
//    }
//    logMessage("Deleted zoom directory: $currentMaxZoom");
//    sendSSE(["log" => "ズーム $currentMaxZoom を削除しました"]);
//    $currentMaxZoom--;
//}
//$max_zoom = $currentMaxZoom;
//
//if ($max_zoom < $minZoom) {
//    $error = ["error" => "最小ズームレベル以下に達しました"];
//    logMessage("Reached below minimum zoom level: $minZoom");
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("Final max zoom after size adjustment: $max_zoom");
//sendSSE(["log" => "サイズ調整後の最終最大ズーム: $max_zoom"]);
//
//// mb-utilでMBTiles生成（WebP）
//sendSSE(["log" => "mb-util によるMBTiles生成を開始します"]);
//$mbUtilPath = "/var/www/venv/bin/mb-util";
//$pythonPath = "/var/www/venv/lib/python3.12/site-packages";
//if (!file_exists($mbUtilPath) || !is_executable($mbUtilPath)) {
//    $error = ["error" => "mb-util 未インストール", "details" => "Path: $mbUtilPath"];
//    logMessage("mb-util check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//$mbTilesCommand = "PYTHONPATH=$pythonPath /var/www/venv/bin/python3 $mbUtilPath --image_format=webp " . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath) . " 2>&1";
//exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
//logMessage("mb-util output: " . implode("\n", $mbTilesOutput));
//if ($mbTilesReturnVar !== 0) {
//    $error = ["error" => "mb-util 失敗", "details" => implode("\n", $mbTilesOutput)];
//    logMessage("mb-util failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("mb-util succeeded: $mbTilesPath");
//chmod($mbTilesPath, 0664);
//chown($mbTilesPath, 'www-data');
//chgrp($mbTilesPath, 'www-data');
//sendSSE(["log" => "mb-util によるMBTiles生成が完了しました"]);
//
//// go-pmtilesでPMTiles生成
//sendSSE(["log" => "go-pmtiles によるPMTiles生成を開始します"]);
//$pmTilesPathCmd = "/usr/local/bin/go-pmtiles";
//if (!file_exists($pmTilesPathCmd) || !is_executable($pmTilesPathCmd)) {
//    $error = ["error" => "go-pmtiles 未インストール", "details" => "Path: $pmTilesPathCmd"];
//    logMessage("go-pmtiles check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//$pmTilesCommand = "$pmTilesPathCmd convert " . escapeshellarg($mbTilesPath) . " " . escapeshellarg($pmTilesPath) . " 2>&1";
//exec($pmTilesCommand, $pmTilesOutput, $pmTilesReturnVar);
//logMessage("go-pmtiles output: " . implode("\n", $pmTilesOutput));
//if ($pmTilesReturnVar !== 0) {
//    $error = ["error" => "go-pmtiles 失敗", "details" => implode("\n", $pmTilesOutput)];
//    logMessage("go-pmtiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("go-pmtiles succeeded: $pmTilesPath");
//chmod($pmTilesPath, 0664);
//chown($pmTilesPath, 'www-data');
//chgrp($pmTilesPath, 'www-data');
//sendSSE(["log" => "go-pmtiles によるPMTiles生成が完了しました"]);
//
//// layer.json生成
//$layerJsonPath = "$tileDir/layer.json";
//$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
//file_put_contents($layerJsonPath, $layerData);
//chmod($layerJsonPath, 0664);
//chown($layerJsonPath, 'www-data');
//chgrp($layerJsonPath, 'www-data');
//logMessage("layer.json created: $layerJsonPath");
//sendSSE(["log" => "layer.json を生成しました"]);
//
//// クリーンアップ
//function deleteSourceAndTempFiles($filePath, $tempOutputPath = null) {
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..') continue;
//        $fullPath = "$dir/$file";
//        if (is_file($fullPath)) unlink($fullPath);
//    }
//    if ($tempOutputPath && file_exists($tempOutputPath)) {
//        unlink($tempOutputPath);
//    }
//}
//deleteSourceAndTempFiles($filePath, $isJpeg ? $outputFilePath : null);
//logMessage("Source and temp files deleted");
//sendSSE(["log" => "元データと中間データを削除しました"]);
//
//// タイルディレクトリクリーンアップ
//function deleteTileDirContents($tileDir, $fileBaseName) {
//    global $logFile;
//    $keepFiles = ["$fileBaseName.pmtiles", "layer.json"];
//    foreach (scandir($tileDir) as $item) {
//        if ($item === '.' || $item === '..') continue;
//        $fullPath = "$tileDir/$item";
//        if (in_array($item, $keepFiles)) continue;
//        if (is_dir($fullPath)) {
//            exec("rm -rf " . escapeshellarg($fullPath));
//        } else {
//            unlink($fullPath);
//        }
//    }
//    logMessage("Tile directory cleaned: $tileDir");
//}
//deleteTileDirContents($tileDir, $fileBaseName);
//sendSSE(["log" => "タイルディレクトリの不要なファイルを削除しました"]);
//
//// pmtilesファイルのサイズを取得
//$pmTilesSizeBytes = file_exists($pmTilesPath) ? filesize($pmTilesPath) : 0;
//$pmTilesSizeMB = round($pmTilesSizeBytes / (1024 * 1024), 2);
//logMessage("Actual pmtiles size: $pmTilesSizeMB MB");
//sendSSE(["log" => "実際のpmtilesサイズ: $pmTilesSizeMB MB"]);
//
//// 成功レスポンス
//$response = [
//    "success" => true,
//    "tiles_url" => $tileURL,
//    "tiles_dir" => $tileDir,
//    "bbox" => $bbox4326,
//    "max_zoom" => $max_zoom,
//    "tileCommand" => $tileCommand,
//    "pmtiles_size_mb" => $pmTilesSizeMB
//];
//logMessage("Process completed: " . json_encode($response, JSON_UNESCAPED_UNICODE));
//sendSSE($response, "success");
