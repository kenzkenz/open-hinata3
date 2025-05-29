<?php
// PHP設定: スクリプトの実行環境を設定
ini_set('output_buffering', '0');
ini_set('zlib.output_compression', '0');
ini_set('memory_limit', '-1'); // メモリ制限を無効化（注意：環境に応じて調整）
ini_set('max_execution_time', 1200);
ini_set('max_input_time', 1200);

// エラーレポートを有効化（デバッグ用、運用環境では調整）
error_reporting(E_ALL);
ini_set('display_errors', 0);

// SSEヘッダー
header("Content-Type: text/event-stream");
header("Cache-Control: no-cache");
header("Connection: keep-alive");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// バッファリング無効化
if (ob_get_level() > 0) {
    ob_end_flush();
}
flush();

// 定数
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
define("EARTH_RADIUS_KM", 6371);
define("EARTH_RADIUS_M", 6378137); // 地球の半径（メートル、Web Mercator用）
define("MAX_FILE_SIZE_BYTES", 200000000); // 200MB in bytes
$logFile = "/tmp/php_script.log";

// SSE送信関数
function sendSSE($data, $event = "message") {
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
    echo "#\n\n";
    flush();
}

// ログファイル書き込み
function logMessage($message) {
    global $logFile;
    $logMessage = date("Y-m-d H:i:s") . " - $message\n";
    if (!@file_put_contents($logFile, $logMessage, FILE_APPEND)) {
        error_log("Failed to write to log file: $logFile");
    }
}

// WebPサポートの確認
function checkWebPSupport() {
    $output = [];
    $returnVar = 0;
    exec("gdalinfo --formats 2>&1 | grep -i WEBP", $output, $returnVar);
    return !empty($output) && $returnVar === 0;
}

// 入力ファイルの検証と形式チェック
function checkInputFile($filePath) {
    $command = "gdalinfo -json " . escapeshellarg($filePath);
    exec($command . " 2>&1", $output, $returnVar);
    $infoJson = json_decode(implode("\n", $output), true);
    if (json_last_error() !== JSON_ERROR_NONE || !$infoJson || !isset($infoJson["bands"])) {
        return ["valid" => false, "error" => "Invalid input file or JSON decode error: " . json_last_error_msg()];
    }
    $bandCount = count($infoJson["bands"]);
    $statsCommand = "gdalinfo -stats " . escapeshellarg($filePath);
    exec($statsCommand . " 2>&1", $statsOutput, $statsReturnVar);
    $statsStr = implode("\n", $statsOutput);
    $hasWhite = preg_match("/Maximum=255/", $statsStr);
    $hasBlack = preg_match("/Minimum=0/", $statsStr);
    $isJpeg = isset($infoJson["metadata"]["IMAGE_STRUCTURE"]["COMPRESSION"]) && strtoupper($infoJson["metadata"]["IMAGE_STRUCTURE"]["COMPRESSION"]) === "JPEG";
    $compression = isset($infoJson["metadata"]["IMAGE_STRUCTURE"]["COMPRESSION"]) ? $infoJson["metadata"]["IMAGE_STRUCTURE"]["COMPRESSION"] : "Unknown";
    return [
        "valid" => true,
        "bandCount" => $bandCount,
        "hasWhite" => $hasWhite,
        "hasBlack" => $hasBlack,
        "isJpeg" => $isJpeg,
        "compression" => $compression
    ];
}

// ディレクトリの総ファイルサイズを計算
function calculateTileDirectorySize($tileDir) {
    $totalSize = 0;
    $totalTiles = 0;
    if (!is_dir($tileDir)) {
        return [0, 0];
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($tileDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($iterator as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'webp') {
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
        exec("rm -rf " . escapeshellarg($zoomDir) . " 2>&1");
        return true;
    }
    return false;
}

// 最大ズームレベル計算関数
function calculateMaxZoom($filePath, $sourceEPSG) {
    global $logFile;
    $gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
    exec($gdalInfoCommand . " 2>&1", $gdalOutput, $gdalReturnVar);
    $gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
    if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson || !isset($gdalOutputJson["size"]) || !isset($gdalOutputJson["geoTransform"])) {
        logMessage("gdalinfo failed for zoom calculation or no geotransform available: " . json_last_error_msg());
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

// 中間ファイルのクリーンアップ
function cleanTempFiles($fileName) {
    $pattern = "/tmp/" . escapeshellarg($fileName) . "_*.tif";
    exec("rm -f $pattern 2>&1");
    logMessage("Cleaned temp files for $fileName");
    return true;
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
    $error = ["error" => "ファイルが存在しません", "details" => "Path: " . ($_POST["file"] ?? "undefined")];
    logMessage("File not found: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("File verified: $filePath");
sendSSE(["log" => "ファイル確認完了: $filePath"]);

// パラメータ取得
$fileName = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]);
$resolution = isset($_POST["resolution"]) && is_numeric($_POST["resolution"]) ? intval($_POST["resolution"]) : null;
$transparent = 'black'; // 透過色は黒に固定
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

// ディスク容量の確認
$freeSpace = disk_free_space('/tmp');
if ($freeSpace === false || $freeSpace / (1024 * 1024) < 1000) {
    $freeSpaceMB = $freeSpace !== false ? round($freeSpace / (1024 * 1024), 2) : "不明";
    $error = ["error" => "ディスク容量不足", "details" => "利用可能なディスク容量: $freeSpaceMB MB"];
    logMessage("Insufficient disk space: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$freeSpaceMB = round($freeSpace / (1024 * 1024), 2);
sendSSE(["log" => "/tmp の空き容量: $freeSpaceMB MB"]);

// 中間ファイルのクリーンアップ
cleanTempFiles($fileName);
sendSSE(["log" => "既存の中間ファイルを削除しました"]);

// ファイル形式の確認
$fileExtension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$fileInfo = checkInputFile($filePath);
if (!$fileInfo["valid"]) {
    $error = ["error" => "入力ファイルの検証失敗", "details" => $fileInfo["error"]];
    logMessage("Input file validation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$bandCount = $fileInfo["bandCount"];
$hasWhite = $fileInfo["hasWhite"];
$hasBlack = $fileInfo["hasBlack"];
$isJpeg = $fileInfo["isJpeg"];
$compression = $fileInfo["compression"];
logMessage("File format: " . ($isJpeg ? "JPEG" : "Non-JPEG") . ", compression=$compression");
sendSSE(["log" => "ファイル形式: " . ($isJpeg ? "JPEG" : "非JPEG") . ", 圧縮形式: $compression"]);
sendSSE(["log" => "入力ファイル検証完了: バンド数=$bandCount, 白色ピクセル=" . ($hasWhite ? "あり" : "なし") . ", 黒色ピクセル=" . ($hasBlack ? "あり" : "なし")]);

// JPEG入力の場合の事前処理
$outputFilePath = $filePath;
$tempOutputPath = null;
if ($isJpeg) {
    sendSSE(["log" => "JPEG入力の事前処理を開始します"]);
    $tempOutputPath = "/tmp/" . $fileName . "_processed.tif";
    $preprocessCommand = "gdal_translate -of GTiff -co COMPRESS=DEFLATE -co PREDICTOR=2 " . escapeshellarg($filePath) . " " . escapeshellarg($tempOutputPath);
    exec($preprocessCommand . " 2>&1", $preprocessOutput, $preprocessReturnVar);
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

// 白色と黒色透過処理およびアルファチャンネル削除（条件に応じてスキップ）
$transparentPath = null;
$rgbOutputPath = null;
if ($bandCount == 3 && !$hasWhite && !$hasBlack) {
    logMessage("条件満たす: バンド数=3, 白色ピクセル=なし, 黒色ピクセル=なし -> ワープ処理とアルファチャンネル削除をスキップ");
    sendSSE(["log" => "条件満たす: バンド数=3, 白色ピクセル=なし, 黒色ピクセル=なし -> ワープ処理とアルファチャンネル削除をスキップ"]);
} else {
    // 白色と黒色透過処理
    sendSSE(["log" => "白色と黒色透過処理を開始します。少お待ちください。"]);
    $transparentPath = "/tmp/" . $fileName . "_transparent.tif";
    $transparentCommand = "gdalwarp -dstalpha -srcnodata \"255 255 255,0 0 0\" -overwrite -co COMPRESS=DEFLATE -co PREDICTOR=2 -wo NUM_THREADS=ALL_CPUS " . escapeshellarg($outputFilePath) . " " . escapeshellarg($transparentPath);
    $descriptors = [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"]
    ];
    $process = proc_open($transparentCommand, $descriptors, $pipes);
    $transparentOutput = [];
    $startTime = time();
    if (is_resource($process)) {
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $lastProgressUpdate = $startTime;
        while (proc_get_status($process)['running']) {
            $stdout = fgets($pipes[1]);
            $stderr = fgets($pipes[2]);
            if ($stdout) {
                $log = trim($stdout);
                logMessage("gdalwarp stdout: $log");
                sendSSE(["log" => "gdalwarp: $log"]);
                $transparentOutput[] = $log;
            }
            if ($stderr) {
                $log = trim($stderr);
                logMessage("gdalwarp stderr: $log");
                sendSSE(["log" => "[gdalwarp ERROR] $log"]);
                $transparentOutput[] = "[ERROR] $log";
            }
            $currentTime = time();
            if ($currentTime - $lastProgressUpdate >= 5) {
                $elapsed = $currentTime - $startTime;
                sendSSE(["log" => "gdalwarp 処理中: 経過時間 {$elapsed}秒"]);
                logMessage("gdalwarp progress: elapsed {$elapsed} seconds");
                $lastProgressUpdate = $currentTime;
            }
            usleep(100000);
        }
        while ($stdout = fgets($pipes[1])) {
            $log = trim($stdout);
            logMessage("gdalwarp stdout: $log");
            sendSSE(["log" => "gdalwarp: $log"]);
            $transparentOutput[] = $log;
        }
        while ($stderr = fgets($pipes[2])) {
            $log = trim($stderr);
            logMessage("gdalwarp stderr: $log");
            sendSSE(["log" => "[gdalwarp ERROR] $log"]);
            $transparentOutput[] = "[ERROR] $log";
        }
        fclose($pipes[0]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $transparentReturnVar = proc_close($process);
    } else {
        $error = ["error" => "gdalwarp プロセス起動失敗"];
        logMessage("gdalwarp process failed to start: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
    if ($transparentReturnVar !== 0) {
        $error = ["error" => "白色と黒色透過処理失敗", "details" => implode("\n", $transparentOutput)];
        logMessage("White and black transparency processing failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
    logMessage("White and black transparency processing completed: $transparentPath");
    sendSSE(["log" => "白色と黒色透過処理が完了しました"]);
    $outputFilePath = $transparentPath;

    // 透過後の検証
    sendSSE(["log" => "透過ファイルのアルファチャンネルを検証中..."]);
    $verifyCommand = "gdalinfo -json " . escapeshellarg($outputFilePath);
    exec($verifyCommand . " 2>&1", $verifyOutput, $verifyReturnVar);
    $verifyJson = json_decode(implode("\n", $verifyOutput), true);
    if (json_last_error() !== JSON_ERROR_NONE || !$verifyJson || !isset($verifyJson["bands"]) || count($verifyJson["bands"]) < 4) {
        $error = ["error" => "透過ファイルのアルファチャンネル追加失敗", "details" => implode("\n", $verifyOutput)];
        logMessage("Alpha channel missing in transparent file: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
    logMessage("Alpha channel verified in transparent file");
    sendSSE(["log" => "透過ファイルにアルファチャンネルが正しく追加されました"]);

    // アルファチャンネル削除
    sendSSE(["log" => "アルファチャンネルを削除してRGB画像を生成します"]);
    $rgbOutputPath = "/tmp/" . $fileName . "_rgb.tif";
    $rgbCommand = "gdal_translate -b 1 -b 2 -b 3 -co COMPRESS=DEFLATE -co PREDICTOR=2 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($rgbOutputPath);
    exec($rgbCommand . " 2>&1", $rgbOutput, $rgbReturnVar);
    if ($rgbReturnVar !== 0) {
        $error = ["error" => "アルファチャンネル削除失敗", "details" => implode("\n", $rgbOutput)];
        logMessage("Alpha channel removal failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
    logMessage("Alpha channel removed: $rgbOutputPath");
    sendSSE(["log" => "アルファチャンネルを削除しました"]);
    $outputFilePath = $rgbOutputPath;

    // RGB画像の検証
    sendSSE(["log" => "RGB画像のバンド数を検証中..."]);
    $verifyRgbCommand = "gdalinfo -json " . escapeshellarg($outputFilePath);
    exec($verifyRgbCommand . " 2>&1", $verifyRgbOutput, $verifyRgbReturnVar);
    $verifyRgbJson = json_decode(implode("\n", $verifyRgbOutput), true);
    if (json_last_error() !== JSON_ERROR_NONE || !$verifyRgbJson || !isset($verifyRgbJson["bands"]) || count($verifyRgbJson["bands"]) != 3) {
        $error = ["error" => "RGB画像の生成失敗", "details" => implode("\n", $verifyRgbOutput)];
        logMessage("RGB bands missing in output file: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
    logMessage("RGB bands verified in output file");
    sendSSE(["log" => "RGB画像（3バンド）が正しく生成されました"]);
}

// gdalinfoで座標取得
sendSSE(["log" => "gdalinfo 実行中..."]);
$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($outputFilePath);
exec($gdalInfoCommand . " 2>&1", $gdalOutput, $gdalReturnVar);
if ($gdalReturnVar !== 0) {
    $error = ["error" => "gdalinfo 失敗", "details" => implode("\n", $gdalOutput)];
    logMessage("gdalinfo failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    $error = ["error" => "gdalinfo 解析失敗", "details" => "Invalid JSON or missing cornerCoordinates: " . json_last_error_msg()];
    logMessage("gdalinfo parsing failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
logMessage("gdalinfo coordinates: upperLeft=" . json_encode($upperLeft) . ", lowerRight=" . json_encode($lowerRight));
sendSSE(["log" => "gdalinfo 座標取得完了"]);

// 座標変換
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
    $cmd = "echo " . escapeshellarg("$x $y") . " | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd . " 2>&1", $output, $returnVar);
    if ($returnVar === 0 && !empty($output) && isset($output[0])) {
        $coords = explode(" ", trim($output[0]));
        if (count($coords) >= 2) {
            return [floatval($coords[0]), floatval($coords[1])];
        }
    }
    logMessage("Coordinate transformation failed: " . implode("\n", $output));
    return null;
}
sendSSE(["log" => "座標変換開始"]);
$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);
if (!$minCoord || !$maxCoord) {
    $error = ["error" => "座標変換失敗"];
    logMessage("Coordinate transformation failed");
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
if (!chmod($tileDir, 0775) || !chown($tileDir, 'www-data') || !chgrp($tileDir, 'www-data')) {
    logMessage("Failed to set permissions/ownership for tile directory: $tileDir");
}
logMessage("Tile directory created: $tileDir");
sendSSE(["log" => "タイルディレクトリ作成: $tileDir"]);

// グレースケール判定
function isGrayscale($filePath) {
    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return json_last_error() === JSON_ERROR_NONE && isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
}
$isGray = isGrayscale($outputFilePath);
logMessage("Grayscale check: " . ($isGray ? "Grayscale" : "Color"));
sendSSE(["log" => "グレースケール判定完了: " . ($isGray ? "グレースケール" : "カラー")]);

// gdal2tilesでWebPタイル生成
sendSSE(["log" => "WebPタイル生成準備中"]);
$alpha_value = '0,0,0';
$tileCommandArgs = [
    'gdal2tiles.py',
    '--tiledriver', 'WEBP',
    ($bandCount == 3 && !$hasWhite && !$hasBlack) ? '' : '-a ' . escapeshellarg($alpha_value),
    '-z', "0-$max_zoom",
    '--s_srs', escapeshellarg("EPSG:$sourceEPSG"),
    '--xyz',
    '--processes', '4',
    '--webp-lossless',
    escapeshellarg($outputFilePath),
    escapeshellarg($tileDir)
];
$tileCommandArgs = array_filter($tileCommandArgs); // 空の要素を除外
$tileCommand = implode(' ', $tileCommandArgs) . ' 2>&1';
logMessage("Executing gdal2tiles command: $tileCommand");
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
            sendSSE(["log" => "[gdal2tiles ERROR] $log"]);
            $output[] = "[ERROR] $log";
        }
        usleep(100000);
    }
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $tileReturnVar = proc_close($process);
} else {
    $error = ["error" => "gdal2tiles プロセス起動失敗"];
    logMessage("gdal2tiles process failed to start: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
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
    sendSSE(["log" => "WebPタイル総容量が200MBを超過、ズーム $currentMaxZoom を削除します"]);
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
sendSSE(["log" => "mb-util によるMBTiles生成"]);
$mbUtilPath = "/var/www/venv/bin/mb-util";
$pythonPath = "/var/www/venv/lib/python3.12/site-packages";
if (!file_exists($mbUtilPath) || !is_executable($mbUtilPath)) {
    $error = ["error" => "mb-util 未インストール", "details" => "Path: $mbUtilPath"];
    logMessage("mb-util check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$mbTilesCommand = "PYTHONPATH=" . escapeshellarg($pythonPath) . " /var/www/venv/bin/python3 " . escapeshellarg($mbUtilPath) . " --image_format=webp " . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath) . " 2>&1";
exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
logMessage("mb-util output: " . implode("\n", $mbTilesOutput));
if ($mbTilesReturnVar !== 0) {
    $error = ["error" => "mb-util 失敗", "details" => implode("\n", $mbTilesOutput)];
    logMessage("mb-util failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("mb-util succeeded: $mbTilesPath");
if (file_exists($mbTilesPath)) {
    chmod($mbTilesPath, 0664);
    chown($mbTilesPath, 'www-data');
    chgrp($mbTilesPath, 'www-data');
}
sendSSE(["log" => "mb-util succeeded: MBTiles生成が完了しました"]);

// go-pmtilesでPMTiles生成
sendSSE(["log" => "go-pmtiles によるPMTiles生成を開始します"]);
$pmTilesPathCmd = "/usr/local/bin/go-pmtiles";
if (!file_exists($pmTilesPathCmd) || !is_executable($pmTilesPathCmd)) {
    $error = ["error" => "go-pmtiles 未インストール", "details" => "Path: $pmTilesPathCmd"];
    logMessage("go-pmtiles check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$pmTilesCommand = escapeshellarg($pmTilesPathCmd) . " convert " . escapeshellarg($mbTilesPath) . " " . escapeshellarg($pmTilesPath) . " 2>&1";
exec($pmTilesCommand, $pmTilesOutput, $pmTilesReturnVar);
logMessage("go-pmtiles output: " . implode("\n", $pmTilesOutput));
if ($pmTilesReturnVar !== 0) {
    $error = ["error" => "go-pmtiles 失敗", "details" => implode("\n", $pmTilesOutput)];
    logMessage("go-pmtiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("go-pmtiles succeeded: $pmTilesPath");
if (file_exists($pmTilesPath)) {
    chmod($pmTilesPath, 0664);
    chown($pmTilesPath, 'www-data');
    chgrp($pmTilesPath, 'www-data');
}
sendSSE(["log" => "go-pmtiles によるPMTiles生成が完了しました"]);

// クリーンアップ
function deleteSourceAndTempFiles($filePath, $tempOutputPath = null, $transparentPath = null, $rgbOutputPath = null) {
    $dir = dirname($filePath);
    if (is_dir($dir)) {
        foreach (scandir($dir) as $file) {
            if ($file === '.' || $file === '..') continue;
            $fullPath = "$dir/$file";
            if (is_file($fullPath) && $fullPath !== $filePath) {
                @unlink($fullPath);
            }
        }
    }
    if ($tempOutputPath && file_exists($tempOutputPath)) {
        @unlink($tempOutputPath);
    }
    if ($transparentPath && file_exists($transparentPath)) {
        @unlink($transparentPath);
    }
    if ($rgbOutputPath && file_exists($rgbOutputPath)) {
        @unlink($rgbOutputPath);
    }
}
deleteSourceAndTempFiles($filePath, $tempOutputPath, $transparentPath, $rgbOutputPath);
logMessage("Source and temp files deleted");
sendSSE(["log" => "元データと中間データを削除しました"]);

// タイルディレクトリクリーンアップ
function deleteTileDirContents($tileDir, $fileBaseName) {
    global $logFile;
    $keepFiles = ["$fileBaseName.pmtiles"];
    if (is_dir($tileDir)) {
        foreach (scandir($tileDir) as $item) {
            if ($item === '.' || $item === '..') continue;
            $fullPath = "$tileDir/$item";
            if (in_array($item, $keepFiles)) continue;
            if (is_dir($fullPath)) {
                exec("rm -rf " . escapeshellarg($fullPath) . " 2>&1");
            } elseif (is_file($fullPath)) {
                @unlink($fullPath);
            }
        }
        logMessage("Tile directory cleaned: $tileDir");
    }
}
deleteTileDirContents($tileDir, $fileBaseName);
sendSSE(["log" => "タイルディレクトリの不要なファイルを削除しました"]);

// pmtilesファイルのサイズを取得
$pmTilesSizeBytes = file_exists($pmTilesPath) ? filesize($pmTilesPath) : 0;
$pmTilesSizeMB = round($pmTilesSizeBytes / (1024 * 1024), 2);
logMessage("Actual pmtiles size: $pmTilesSizeMB MB");
sendSSE(["log" => "サイズ: $pmTilesSizeMB MB / 最大ズーム:$max_zoom"]);

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