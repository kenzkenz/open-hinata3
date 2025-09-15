<?php

// PHP設定
ini_set('memory_limit', '-1');
ini_set('max_execution_time', 1200);
ini_set('max_input_time', 1200);
error_reporting(E_ALL);
ini_set('display_errors', 0);

// SSEヘッダー
header("Content-Type: text/event-stream");
header("Cache-Control: no-cache");
header("Connection: keep-alive");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
ob_end_flush();
flush();

// 定数
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
define("EARTH_RADIUS_M", 6378137);
define("MAX_FILE_SIZE_BYTES", 200000000);
$logFile = "/tmp/php_script.log";

// 外部コマンドパス
$gdalInfo = "/usr/bin/gdalinfo";
$gdalTranslate = "/usr/bin/gdal_translate";
$gdalWarp = "/usr/bin/gdalwarp";
$gdal2Tiles = "/usr/bin/gdal2tiles.py";
$mbUtil = "/var/www/venv/bin/mb-util";
$goPmTiles = "/usr/local/bin/go-pmtiles";
$pythonPath = "/var/www/venv/lib/python3.12/site-packages";

// SSE送信
function sendSSE($data, $event = "message") {
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
    echo "#\n\n";
    flush();
}

// ログ書き込み
function logMessage($message) {
    global $logFile;
    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND);
}

// コマンド存在確認
function checkCommand($command, $name) {
    if (!file_exists($command) || !is_executable($command)) {
        sendSSE(["error" => "$name 未インストール", "details" => "Path: $command"], "error");
        exit;
    }
}

// WebPサポート確認
function checkWebPSupport() {
    global $gdalInfo;
    checkCommand($gdalInfo, "gdalinfo");
    exec("$gdalInfo --formats 2>&1 | grep -i WEBP", $output, $returnVar);
    return !empty($output) && $returnVar === 0;
}

// ディレクトリサイズ計算
function calculateTileDirectorySize($tileDir) {
    $totalSize = 0;
    $totalTiles = 0;
    if (!is_dir($tileDir)) return [0, 0];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($tileDir, RecursiveDirectoryIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'webp') {
            $totalSize += $file->getSize();
            $totalTiles++;
        }
    }
    return [$totalSize, $totalTiles];
}

// 最大ズーム削除
function deleteHighestZoomDirectory($tileDir, $currentMaxZoom) {
    $zoomDir = $tileDir . $currentMaxZoom . '/';
    if (is_dir($zoomDir)) {
        exec("rm -rf " . escapeshellarg($zoomDir));
        return true;
    }
    return false;
}

// 最大ズーム計算
function calculateMaxZoom($filePath, $sourceEPSG) {
    global $gdalInfo;
    checkCommand($gdalInfo, "gdalinfo");
    exec("$gdalInfo -json " . escapeshellarg($filePath), $gdalOutput, $gdalReturnVar);
    $gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
    if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson || !isset($gdalOutputJson["size"]) || !isset($gdalOutputJson["geoTransform"])) {
        logMessage("gdalinfo failed for zoom calculation");
        sendSSE(["error" => "ズーム計算失敗、座標情報なし"], "error");
        exit;
    }
    $width = $gdalOutputJson["size"][0];
    $height = $gdalOutputJson["size"][1];
    $geoTransform = $gdalOutputJson["geoTransform"];
    $gsd = max(abs($geoTransform[1]), abs($geoTransform[5]));
    $maxZoom = 0;
    for ($z = 0; $z <= 30; $z++) {
        $tileResolution = (2 * M_PI * EARTH_RADIUS_M) / (256 * pow(2, $z));
        if ($tileResolution <= $gsd) {
            $maxZoom = $z;
            break;
        }
    }
    logMessage("Calculated max zoom: $maxZoom (GSD: $gsd m/pixel)");
    sendSSE(["log" => "計算された最大ズーム: $maxZoom (GSD: $gsd m/pixel)"]);
    return [$maxZoom, $gsd, $width, $height];
}

// 中間ファイルクリーンアップ
function cleanTempFiles($fileName) {
    exec("rm -f /tmp/" . escapeshellarg($fileName) . "_*.tif");
    logMessage("Cleaned temp files for $fileName");
}

// ワールドファイル確認
function checkWorldFile($filePath) {
    $extensions = ['tfw', 'jgw', 'pgw'];
    foreach ($extensions as $ext) {
        $worldFile = preg_replace('/\.[^.]+$/', ".$ext", $filePath);
        if (file_exists($worldFile)) {
            logMessage("World file found: $worldFile");
            sendSSE(["log" => "ワールドファイル確認: $worldFile"]);
            return $worldFile;
        }
    }
    logMessage("No world file found for: $filePath");
    sendSSE(["log" => "ワールドファイルが見つかりません"]);
    return null;
}

// ワールドファイルコピー
function copyWorldFile($srcFilePath, $dstFilePath) {
    $extensions = ['tfw', 'jgw', 'pgw'];
    foreach ($extensions as $ext) {
        $srcWorldFile = preg_replace('/\.[^.]+$/', ".$ext", $srcFilePath);
        if (file_exists($srcWorldFile)) {
            $dstWorldFile = preg_replace('/\.[^.]+$/', ".$ext", $dstFilePath);
            if (copy($srcWorldFile, $dstWorldFile)) {
                logMessage("Copied world file: $srcWorldFile to $dstWorldFile");
                sendSSE(["log" => "ワールドファイルコピー: $dstWorldFile"]);
                return $dstWorldFile;
            } else {
                logMessage("Failed to copy world file: $srcWorldFile");
                sendSSE(["log" => "ワールドファイルコピー失敗: $srcWorldFile"]);
            }
        }
    }
    return null;
}

// 解像度をズームレベル24にリサンプリング
function resampleToZoom24($inputPath, $outputPath, $gsd, $width, $height) {
    global $gdalWarp;
    checkCommand($gdalWarp, "gdalwarp");
    $targetGSD = (2 * M_PI * EARTH_RADIUS_M) / (256 * pow(2, 24));
    $scaleFactor = $gsd / $targetGSD;
    $newWidth = max(1, round($width / $scaleFactor));
    $newHeight = max(1, round($height / $scaleFactor));
    $resampleCommand = "$gdalWarp -ts $newWidth $newHeight -r bilinear -co COMPRESS=DEFLATE -co PREDICTOR=2 " . escapeshellarg($inputPath) . " " . escapeshellarg($outputPath);
    exec($resampleCommand, $resampleOutput, $resampleReturnVar);
    if ($resampleReturnVar !== 0 || !file_exists($outputPath)) {
        logMessage("Resampling to zoom 24 failed: " . implode("\n", $resampleOutput));
        sendSSE(["error" => "ズーム24リサンプリング失敗", "details" => implode("\n", $resampleOutput)], "error");
        exit;
    }
    logMessage("Resampled to zoom 24: $outputPath (new size: $newWidth x $newHeight)");
    sendSSE(["log" => "ズーム24相当にリサンプリング完了: $newWidth x $newHeight"]);
    // ワールドファイルのコピー
    copyWorldFile($inputPath, $outputPath);
}

// POSTリクエスト確認
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    sendSSE(["error" => "POSTリクエストのみ"], "error");
    exit;
}

// FormData取得
if (!isset($_POST["file"]) || !isset($_POST["dir"])) {
    sendSSE(["error" => "ファイルパスまたはディレクトリ未指定"], "error");
    exit;
}

// ファイルパス検証
$filePath = realpath($_POST["file"]);
if (!$filePath || !file_exists($filePath)) {
    sendSSE(["error" => "ファイルが存在しません"], "error");
    exit;
}
logMessage("File: $filePath");
sendSSE(["log" => "ファイル確認: $filePath"]);

// パラメータ取得
$fileName = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]);
$resolution = isset($_POST["resolution"]) && is_numeric($_POST["resolution"]) ? intval($_POST["resolution"]) : null;
$sourceEPSG = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "2450";
$transparent = isset($_POST["transparent"]) ? $_POST["transparent"] : "1"; // デフォルトは1
if (!in_array($transparent, ["0", "1"])) {
    sendSSE(["error" => "無効なtransparent値: 0または1を指定してください"], "error");
    logMessage("Invalid transparent value: $transparent");
    exit;
}
$transparent = (int)$transparent; // 文字列を整数に変換
logMessage("Parameters: fileName=$fileName, subDir=$subDir, resolution=$resolution, sourceEPSG=$sourceEPSG, transparent=$transparent");
sendSSE(["log" => "パラメータ: fileName=$fileName, subDir=$subDir, transparent=$transparent"]);

// 処理中ファイルの作成
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$processingFile = "/tmp/{$fileBaseName}_{$subDir}_processing.txt";
if (!file_put_contents($processingFile, "Processing: $filePath for $subDir at " . date("Y-m-d H:i:s"))) {
    sendSSE(["error" => "処理中ファイルの作成に失敗"], "error");
    exit;
}
chmod($processingFile, 0664);
chown($processingFile, 'www-data');
chgrp($processingFile, 'www-data');
sendSSE(["log" => "処理中ファイルを作成: $processingFile"]);

// コマンド存在確認
checkCommand($gdalTranslate, "gdal_translate");
checkCommand($gdalWarp, "gdalwarp");
checkCommand($gdal2Tiles, "gdal2tiles.py");
checkCommand($mbUtil, "mb-util");
checkCommand($goPmTiles, "go-pmtiles");

// WebPサポート確認
if (!checkWebPSupport()) {
    sendSSE(["error" => "GDALにWebPサポートなし"], "error");
    exit;
}
sendSSE(["log" => "WebPサポート確認"]);

// ディスク容量確認
$freeSpace = disk_free_space('/tmp');
if ($freeSpace === false || $freeSpace / (1024 * 1024) < 1000) {
    sendSSE(["error" => "ディスク容量不足"], "error");
    exit;
}
sendSSE(["log" => "/tmp 空き容量: " . round($freeSpace / (1024 * 1024), 2) . " MB"]);

// ワールドファイル確認
checkWorldFile($filePath);

// 中間ファイルクリーンアップ
cleanTempFiles($fileName);
sendSSE(["log" => "中間ファイル削除"]);

// 最大ズーム計算
list($max_zoom, $gsd, $width, $height) = calculateMaxZoom($filePath, $sourceEPSG);

// ズーム24以上の場合のリサンプリング
$outputFilePath = $filePath;
$resampledPath = null;
if ($max_zoom > 24) {
    sendSSE(["log" => "<span style='color: red'>ズームレベル $max_zoom が24を超過、最大ズームを24に制限</span>"]);
    // resampleToZoom24($filePath, $resampledPath, $gsd, $width, $height);
    // $outputFilePath = $resampledPath;
    $max_zoom = 24;
    sendSSE(["log" => "最大ズームレベルを24に設定"]);
}

// JPEG処理
$tempOutputPath = null;
if (in_array(strtolower(pathinfo($filePath, PATHINFO_EXTENSION)), ['jpg', 'jpeg'])) {
    sendSSE(["log" => "JPEG処理開始"]);
    $tempOutputPath = "/tmp/" . $fileName . "_processed.tif";
    $preprocessCommand = "$gdalTranslate -of GTiff -co COMPRESS=DEFLATE -co PREDICTOR=2 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tempOutputPath);
    exec($preprocessCommand, $preprocessOutput, $preprocessReturnVar);
    if ($preprocessReturnVar !== 0 || !file_exists($tempOutputPath)) {
        logMessage("JPEG processing failed: " . implode("\n", $preprocessOutput));
        sendSSE(["error" => "JPEG処理失敗", "details" => implode("\n", $preprocessOutput)], "error");
        exit;
    }
    $outputFilePath = $tempOutputPath;
    sendSSE(["log" => "JPEG処理完了"]);
}

// 透過処理
$transparentPath = null;
if ($transparent === 1) {
    $transparentPath = "/tmp/" . $fileName . "_transparent.tif";
    sendSSE(["log" => "透過処理開始"]);
    $transparentCommand = "$gdalWarp -dstalpha -srcnodata \"255 255 255,0 0 0\" -overwrite -co COMPRESS=DEFLATE -co PREDICTOR=2 -wo NUM_THREADS=ALL_CPUS " . escapeshellarg($outputFilePath) . " " . escapeshellarg($transparentPath);
    $process = proc_open($transparentCommand, [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]], $pipes);
    $output = [];
    if (is_resource($process)) {
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        while (proc_get_status($process)['running']) {
            $stdout = fgets($pipes[1]);
            $stderr = fgets($pipes[2]);
            if ($stdout && is_numeric(trim($stdout))) {
                sendSSE(["log" => "gdalwarp: " . trim($stdout) . "%"]);
                $output[] = trim($stdout);
            }
            if ($stderr) {
                sendSSE(["log" => "[gdalwarp ERROR] " . trim($stderr)]);
                $output[] = "[ERROR] " . trim($stderr);
            }
            usleep(100000);
        }
        fclose($pipes[0]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $transparentReturnVar = proc_close($process);
    }
    if ($transparentReturnVar !== 0 || !file_exists($transparentPath)) {
        logMessage("Transparency processing failed: " . implode("\n", $output));
        sendSSE(["error" => "透過処理失敗", "details" => implode("\n", $output)], "error");
        exit;
    }
    $outputFilePath = $transparentPath;
    sendSSE(["log" => "透過処理完了"]);
} else {
    sendSSE(["log" => "透過処理をスキップ"]);
    logMessage("Transparency processing skipped (transparent=0)");
}

// アルファチャンネル削除（transparent=1の場合のみ）
if ($sourceEPSG !== '3857') {
    $rgbOutputPath = null;
    if ($transparent === 1) {
        $rgbOutputPath = "/tmp/" . $fileName . "_rgb.tif";
        sendSSE(["log" => "RGB画像生成"]);
        $rgbCommand = "$gdalTranslate -b 1 -b 2 -b 3 -co COMPRESS=DEFLATE -co PREDICTOR=2 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($rgbOutputPath);
        exec($rgbCommand, $rgbOutput, $rgbReturnVar);
        if ($rgbReturnVar !== 0 || !file_exists($rgbOutputPath)) {
            logMessage("RGB generation failed: " . implode("\n", $rgbOutput));
            sendSSE(["error" => "RGB生成失敗", "details" => implode("\n", $rgbOutput)], "error");
            exit;
        }
        $outputFilePath = $rgbOutputPath;
        sendSSE(["log" => "RGB画像生成完了"]);
    }
}

// 座標取得
sendSSE(["log" => "gdalinfo 実行"]);
exec("$gdalInfo -json " . escapeshellarg($outputFilePath), $gdalOutput, $gdalReturnVar);
if ($gdalReturnVar !== 0) {
    logMessage("gdalinfo failed: " . implode("\n", $gdalOutput));
    sendSSE(["error" => "gdalinfo 失敗", "details" => implode("\n", $gdalOutput)], "error");
    exit;
}
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    logMessage("gdalinfo parsing failed");
    sendSSE(["error" => "gdalinfo 解析失敗"], "error");
    exit;
}
$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
sendSSE(["log" => "座標取得完了"]);

// 座標変換
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
    global $gdalInfo;
    checkCommand($gdalInfo, "gdalinfo");
    exec("echo " . escapeshellarg("$x $y") . " | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG", $output);
    $coords = explode(" ", trim($output[0] ?? ""));
    return count($coords) >= 2 ? [floatval($coords[0]), floatval($coords[1])] : null;
}
sendSSE(["log" => "座標変換開始"]);
$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);
if (!$minCoord || !$maxCoord) {
    sendSSE(["error" => "座標変換失敗"], "error");
    exit;
}
$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];
sendSSE(["log" => "座標変換完了: " . json_encode($bbox4326)]);

// 最大ズーム（リサンプリング後の処理では24に固定済み）
$max_zoom = $resolution ?: $max_zoom;

// ディレクトリ設定
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$tileDir = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
$mbTilesPath = "$tileDir$fileBaseName.mbtiles";
$pmTilesPath = "$tileDir$fileBaseName.pmtiles";
$tileURL = "$BASE_URL$subDir/$fileBaseName/$fileBaseName.pmtiles";

// ディレクトリ作成
if (!is_dir($tileDir) && !mkdir($tileDir, 0775, true)) {
    sendSSE(["error" => "ディレクトリ作成失敗"], "error");
    exit;
}
chmod($tileDir, 0775);
chown($tileDir, 'www-data');
chgrp($tileDir, 'www-data');
sendSSE(["log" => "タイルディレクトリ作成: $tileDir"]);

// グレースケール判定
function isGrayscale($filePath) {
    global $gdalInfo;
    checkCommand($gdalInfo, "gdalinfo");
    exec("$gdalInfo -json " . escapeshellarg($filePath), $infoOutput);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return json_last_error() === JSON_ERROR_NONE && isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
}
$isGray = isGrayscale($outputFilePath);
sendSSE(["log" => "グレースケール: " . ($isGray ? "グレースケール" : "カラー")]);

// WebPタイル生成
sendSSE(["log" => "WebPタイル生成開始"]);
$tileCommand = "$gdal2Tiles --tiledriver WEBP " . ($transparent === 1 ? "-a 0,0,0 " : "") . "-z 0-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes 4 --webp-lossless " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tileDir);
$process = proc_open($tileCommand, [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]], $pipes);
$output = [];
if (is_resource($process)) {
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    while (!feof($pipes[1]) || !feof($pipes[2])) {
        $stdout = fgets($pipes[1]);
        $stderr = fgets($pipes[2]);
        if ($stdout && trim($stdout) !== '.') {
            $cleanedStdout = preg_replace('/^\.+|\.+$/', '', trim($stdout)); // 数値の前後の「.」を削除
            sendSSE(["log" => $cleanedStdout]);
            $output[] = $cleanedStdout;
        }
        if ($stderr) {
            $output[] = "[ERROR] " . trim($stderr);
        }
        usleep(100000);
    }
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $tileReturnVar = proc_close($process);
}
if ($tileReturnVar !== 0) {
    logMessage("gdal2tiles failed: " . implode("\n", $output));
    sendSSE([
        "error" => "gdal2tiles 失敗",
        "tileCommand" => $tileCommand,
        "details" => implode("\n", $output)
    ], "error");
    exit;
}
sendSSE(["log" => "WebPタイル生成完了"]);

// タイルサイズ調整
sendSSE(["log" => "タイルサイズ計算"]);
$currentMaxZoom = $max_zoom;
$minZoom = 10;
while ($currentMaxZoom >= $minZoom) {
    list($totalSizeBytes, $totalTiles) = calculateTileDirectorySize($tileDir);
    $totalSizeMB = round($totalSizeBytes / (1024 * 1024), 2);
    sendSSE(["log" => "ズーム 10-$currentMaxZoom サイズ: $totalSizeMB MB ($totalTiles タイル)"]);
    if ($totalSizeBytes <= MAX_FILE_SIZE_BYTES) break;
    sendSSE(["log" => "サイズ超過、ズーム $currentMaxZoom 削除"]);
    deleteHighestZoomDirectory($tileDir, $currentMaxZoom);
    $currentMaxZoom--;
}
$max_zoom = $currentMaxZoom;
if ($max_zoom < $minZoom) {
    sendSSE(["error" => "最小ズームレベル以下"], "error");
    exit;
}
sendSSE(["log" => "最終最大ズーム: $max_zoom"]);

// MBTiles生成
sendSSE(["log" => "MBTiles生成開始"]);
$mbTilesCommand = "PYTHONPATH=" . escapeshellarg($pythonPath) . " /var/www/venv/bin/python3 " . escapeshellarg($mbUtil) . " --image_format=webp " . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath);
exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
if ($mbTilesReturnVar !== 0) {
    logMessage("mb-util failed: " . implode("\n", $mbTilesOutput));
    sendSSE(["error" => "MBTiles生成失敗", "details" => implode("\n", $mbTilesOutput)], "error");
    exit;
}
chmod($mbTilesPath, 0664);
chown($mbTilesPath, 'www-data');
chgrp($mbTilesPath, 'www-data');
sendSSE(["log" => "MBTiles生成完了"]);

// PMTiles生成
sendSSE(["log" => "PMTiles生成開始"]);
$pmTilesCommand = "$goPmTiles convert " . escapeshellarg($mbTilesPath) . " " . escapeshellarg($pmTilesPath);
exec($pmTilesCommand, $pmTilesOutput, $pmTilesReturnVar);
if ($pmTilesReturnVar !== 0) {
    logMessage("go-pmtiles failed: " . implode("\n", $pmTilesOutput));
    sendSSE([
        "error" => "PMTiles生成失敗",
        "details" => implode("\n", $pmTilesOutput),
        "tileCommand" => $tileCommand,
    ], "error");
    exit;
}
chmod($pmTilesPath, 0664);
chown($pmTilesPath, 'www-data');
chgrp($pmTilesPath, 'www-data');
sendSSE(["log" => "PMTiles生成完了"]);

// クリーンアップ
function deleteSourceAndTempFiles($filePath, $tempOutputPath, $transparentPath, $rgbOutputPath, $resampledPath = null, $processingFile = null) {
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file !== '.' && $file !== '..' && "$dir/$file" !== $filePath) {
            @unlink("$dir/$file");
        }
    }
    if ($tempOutputPath && file_exists($tempOutputPath)) @unlink($tempOutputPath);
    if ($transparentPath && file_exists($transparentPath)) @unlink($transparentPath);
    if ($rgbOutputPath && file_exists($rgbOutputPath)) @unlink($rgbOutputPath);
    if ($resampledPath && file_exists($resampledPath)) @unlink($resampledPath);
    if ($processingFile && file_exists($processingFile)) {
        @unlink($processingFile);
        logMessage("Deleted processing file: $processingFile");
        sendSSE(["log" => "処理中ファイル削除: $processingFile"]);
    }
}
deleteSourceAndTempFiles($filePath, $tempOutputPath, $transparentPath, $rgbOutputPath, $resampledPath, $processingFile);
sendSSE(["log" => "元データと中間データ削除"]);

// タイルディレクトリクリーンアップ
function deleteTileDirContents($tileDir, $fileBaseName) {
    $keepFiles = ["$fileBaseName.pmtiles"];
    foreach (scandir($tileDir) as $item) {
        if ($item === '.' || $item === '..' || in_array($item, $keepFiles)) continue;
        $fullPath = "$tileDir/$item";
        if (is_dir($fullPath)) {
            exec("rm -rf " . escapeshellarg($fullPath));
        } elseif (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }
}
deleteTileDirContents($tileDir, $fileBaseName);
sendSSE(["log" => "タイルディレクトリクリーンアップ"]);

// PMTilesサイズ
$pmTilesSizeMB = file_exists($pmTilesPath) ? round(filesize($pmTilesPath) / (1024 * 1024), 2) : 0;
sendSSE(["log" => "サイズ: $pmTilesSizeMB MB / 最大ズーム:$max_zoom"]);

// 成功レスポンス
sendSSE([
    "success" => true,
    "tiles_url" => $tileURL,
    "tiles_dir" => $tileDir,
    "bbox" => $bbox4326,
    "max_zoom" => $max_zoom,
    "pmtiles_size_mb" => $pmTilesSizeMB,
    "tileCommand" => $tileCommand,
], "success");
?>