<?php
// PHP設定
ini_set('memory_limit', '-1');
ini_set('max_execution_time', 1200);
ini_set('max_input_time', 1200);
error_reporting(E_ALL);
ini_set('display_errors', false);

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
define("EARTH_RADIUS_M", 6378137);
$logFile = "/tmp/php_script.log";

// 外部コマンドパス
$gdalInfo = "/usr/bin/gdalinfo";
$gdalTranslate = "/usr/bin/gdal_translate";

// SSE送信
function sendSSE($data, $event = "message") {
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    flush();
    logMessage("Sent SSE event: $event", ["data" => $data]);
}

// ログ書き込み
function logMessage($message, $context = []) {
    global $logFile;
    $timestamp = date("Y-m-d H:i:s");
    $contextStr = empty($context) ? "" : " " . json_encode($context, JSON_UNESCAPED_UNICODE);
    $fullMessage = "$timestamp - $message$contextStr\n";
    file_put_contents($logFile, $fullMessage, FILE_APPEND);
}

// コマンド存在確認
function checkCommand($command, $name) {
    if (!file_exists($command) || !is_executable($command)) {
        $context = ["command" => $command, "name" => $name];
        logMessage("Command not found or not executable", $context);
        sendSSE(["error" => "$name 未インストール", "details" => "Path: $command"], "error");
        exit;
    }
}

// ワールドファイル読み込み
function readWorldFile($worldFile) {
    if (!file_exists($worldFile) || !is_readable($worldFile)) {
        $context = ["world_file" => $worldFile];
        logMessage("World file not found or not readable", $context);
        sendSSE(["error" => "ワールドファイルが見つかりませんまたは読み込めません: $worldFile"], "error");
        exit;
    }
    $lines = file($worldFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (count($lines) < 6) {
        $context = ["world_file" => $worldFile, "line_count" => count($lines)];
        logMessage("World file has insufficient lines", $context);
        sendSSE(["error" => "ワールドファイル形式エラー: 行数不足 (期待: 6, 実際: " . count($lines) . ")"], "error");
        exit;
    }
    $geoTransform = [];
    foreach ($lines as $index => $line) {
        $value = trim($line);
        if (!is_numeric($value)) {
            $context = ["world_file" => $worldFile, "line" => $index + 1, "value" => $value];
            logMessage("Invalid value in world file", $context);
            sendSSE(["error" => "ワールドファイル形式エラー: 無効な値 (行 " . ($index + 1) . ": $value)"], "error");
            exit;
        }
        $geoTransform[$index] = floatval($value);
        if (($index === 0 || $index === 3) && ($geoTransform[$index] == 0 || abs($geoTransform[$index]) < 1e-10 || abs($geoTransform[$index]) > 1e10)) {
            $context = ["world_file" => $worldFile, "line" => $index + 1, "value" => $value];
            logMessage("Invalid scale value in world file", $context);
            sendSSE(["error" => "ワールドファイル形式エラー: スケール値が無効 (行 " . ($index + 1) . ": $value)"], "error");
            exit;
        }
    }
    $context = ["world_file" => $worldFile, "geo_transform" => $geoTransform];
    logMessage("World file read successfully", $context);
    sendSSE(["log" => "ワールドファイル読み込み: $worldFile, 内容: " . json_encode($geoTransform)]);
    return $geoTransform;
}

// ワールドファイル検索
function checkWorldFile($filePath) {
    $extensions = ['tfw', 'jgw'];
    foreach ($extensions as $ext) {
        $worldFile = preg_replace('/\.[^.]+$/', ".$ext", $filePath);
        if (file_exists($worldFile) && is_readable($worldFile)) {
            $context = ["file" => $filePath, "world_file" => $worldFile];
            logMessage("World file found", $context);
            sendSSE(["log" => "ワールドファイル確認: $worldFile"]);
            return $worldFile;
        }
    }
    $context = ["file" => $filePath];
    logMessage("No world file found", $context);
    sendSSE(["log" => "ワールドファイルが見つかりません"]);
    return null;
}

// EPSG検証（ワールドファイル優先）
function verifyEPSG($filePath, $sourceEPSG, $hasWorldFile) {
    global $gdalInfo;
    $gdalOutputFile = "/tmp/gdalinfo_epsg_" . uniqid() . ".json";
    $gdalErrorFile = "/tmp/gdalinfo_epsg_error_" . uniqid() . ".log";
    exec("$gdalInfo -json -nomd " . escapeshellarg($filePath) . " > " . escapeshellarg($gdalOutputFile) . " 2> " . escapeshellarg($gdalErrorFile), $dummyOutput, $gdalReturnVar);
    if ($gdalReturnVar !== 0 || !file_exists($gdalOutputFile)) {
        $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
        $context = ["file" => $filePath, "gdal_error" => $errorOutput];
        logMessage("gdalinfo failed for EPSG verification", $context);
        sendSSE(["error" => "EPSG検証に失敗", "details" => $errorOutput], "error");
        if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
        exit;
    }
    $rawOutput = file_get_contents($gdalOutputFile);
    $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
    unlink($gdalOutputFile);
    if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
    if ($rawOutput === false || empty(trim($rawOutput))) {
        $context = ["file" => $filePath, "error_output" => $errorOutput];
        logMessage("Empty or unreadable gdalinfo output for EPSG", $context);
        sendSSE(["error" => "EPSG検証のためのgdalinfo出力が空", "details" => $errorOutput], "error");
        exit;
    }
    $rawOutput = preg_replace('/[\x00-\x1F\x7F]/u', '', $rawOutput);
    $rawOutput = mb_convert_encoding($rawOutput, 'UTF-8', 'auto');
    $gdalOutputJson = json_decode($rawOutput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson) {
        $context = ["file" => $filePath, "json_error" => json_last_error_msg(), "raw_output_length" => strlen($rawOutput), "raw_output_start" => substr($rawOutput, 0, 500)];
        logMessage("JSON decode failed for EPSG verification", $context);
        sendSSE(["error" => "EPSG検証のためのJSONデコードに失敗", "details" => json_last_error_msg() . " (出力長: " . strlen($rawOutput) . ")"], "error");
        exit;
    }
    $imageEPSG = null;
    if (isset($gdalOutputJson["coordinateSystem"]["wkt"])) {
        $wkt = $gdalOutputJson["coordinateSystem"]["wkt"];
        if (preg_match('/ID\["EPSG",(\d+)\]\]/', $wkt, $matches)) {
            $imageEPSG = $matches[1];
        }
    }
    if ($hasWorldFile && $imageEPSG && $imageEPSG != $sourceEPSG) {
        $context = ["file" => $filePath, "image_epsg" => $imageEPSG, "source_epsg" => $sourceEPSG];
        logMessage("EPSG mismatch, proceeding with world file", $context);
        sendSSE(["log" => "座標系不整合を検出（画像EPSG: {$imageEPSG}, 指定EPSG: {$sourceEPSG}）。ワールドファイルを優先して続行"]);
    } elseif (!$hasWorldFile && $imageEPSG && $imageEPSG != $sourceEPSG) {
        $context = ["file" => $filePath, "image_epsg" => $imageEPSG, "source_epsg" => $sourceEPSG];
        logMessage("EPSG mismatch without world file", $context);
        sendSSE(["error" => "座標系の不整合", "details" => "画像EPSG: {$imageEPSG}, 指定EPSG: {$sourceEPSG}。ワールドファイルが必要です"], "error");
        exit;
    }
    return true;
}

// ワールドファイル適用
function applyWorldFile($inputPath, $outputPath, $worldFile, $sourceEPSG) {
    global $gdalTranslate, $gdalInfo;
    checkCommand($gdalTranslate, "gdal_translate");
    checkCommand($gdalInfo, "gdalinfo");

    // ディスク容量
    $freeSpace = disk_free_space('/tmp');
    if ($freeSpace === false || $freeSpace / (1024 * 1024) < 500) {
        $context = ["free_space_mb" => $freeSpace ? round($freeSpace / (1024 * 1024), 2) : "unknown"];
        logMessage("Insufficient disk space", $context);
        sendSSE(["error" => "ディスク容量不足", "details" => "利用可能な容量: " . ($freeSpace ? round($freeSpace / (1024 * 1024), 2) : "不明") . " MB"], "error");
        exit;
    }

    // 入力ファイル
    if (!file_exists($inputPath) || !is_readable($inputPath)) {
        $context = ["input" => $inputPath];
        logMessage("Input file does not exist or is not readable", $context);
        sendSSE(["error" => "入力ファイルが存在しないか読み込めません: $inputPath"], "error");
        exit;
    }

    // gdalinfo検証
    $gdalOutputFile = "/tmp/gdalinfo_apply_" . uniqid() . ".json";
    $gdalErrorFile = "/tmp/gdalinfo_apply_error_" . uniqid() . ".log";
    exec("$gdalInfo -json -nomd " . escapeshellarg($inputPath) . " > " . escapeshellarg($gdalOutputFile) . " 2> " . escapeshellarg($gdalErrorFile), $dummyOutput, $gdalReturnVar);
    if ($gdalReturnVar !== 0 || !file_exists($gdalOutputFile)) {
        $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
        $context = ["input" => $inputPath, "gdal_error" => $errorOutput];
        logMessage("gdalinfo failed for input file", $context);
        sendSSE(["error" => "入力ファイルの検証に失敗", "details" => $errorOutput], "error");
        if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
        exit;
    }
    $rawOutput = file_get_contents($gdalOutputFile);
    $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
    unlink($gdalOutputFile);
    if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
    if ($rawOutput === false || empty(trim($rawOutput))) {
        $context = ["input" => $inputPath, "error_output" => $errorOutput];
        logMessage("Empty or unreadable gdalinfo output", $context);
        sendSSE(["error" => "gdalinfo出力が空または読み込めません", "details" => $errorOutput], "error");
        exit;
    }
    $rawOutput = preg_replace('/[\x00-\x1F\x7F]/u', '', $rawOutput);
    $rawOutput = mb_convert_encoding($rawOutput, 'UTF-8', 'auto');
    $gdalOutputJson = json_decode($rawOutput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson) {
        $context = [
            "input" => $inputPath,
            "json_error" => json_last_error_msg(),
            "raw_output_length" => strlen($rawOutput),
            "raw_output_start" => substr($rawOutput, 0, 500),
            "error_output" => $errorOutput
        ];
        logMessage("JSON decode failed", $context);
        sendSSE(["error" => "JSONデコードに失敗", "details" => json_last_error_msg() . " (出力長: " . strlen($rawOutput) . ")"], "error");
        exit;
    }
    if (!isset($gdalOutputJson["size"]) || !is_array($gdalOutputJson["size"]) || count($gdalOutputJson["size"]) < 2) {
        $context = ["input" => $inputPath, "json_output" => json_encode($gdalOutputJson, JSON_UNESCAPED_UNICODE)];
        logMessage("Size field missing or invalid", $context);
        sendSSE(["error" => "画像サイズの取得に失敗", "details" => "サイズ情報が無効"], "error");
        exit;
    }
    $width = (int)$gdalOutputJson["size"][0];
    $height = (int)$gdalOutputJson["size"][1];
    if ($width <= 0 || $height <= 0) {
        $context = ["input" => $inputPath, "width" => $width, "height" => $height];
        logMessage("Invalid image dimensions", $context);
        sendSSE(["error" => "画像サイズが無効", "details" => "幅: $width, 高さ: $height"], "error");
        exit;
    }

    // ワールドファイル
    $geoTransform = readWorldFile($worldFile);
    $ulx = $geoTransform[4];
    $uly = $geoTransform[5];
    $lrx = $ulx + $width * $geoTransform[0] + $height * $geoTransform[1];
    $lry = $uly + $width * $geoTransform[2] + $height * $geoTransform[3];

    // ディレクトリ権限
    $tmpDir = dirname($outputPath);
    if (!is_writable($tmpDir)) {
        $context = ["tmp_dir" => $tmpDir];
        logMessage("Output directory is not writable", $context);
        sendSSE(["error" => "出力ディレクトリに書き込み権限がありません: $tmpDir"], "error");
        exit;
    }

    // gdal_translate実行
    $context = [
        "input" => $inputPath,
        "output" => $outputPath,
        "world_file" => $worldFile,
        "source_epsg" => $sourceEPSG,
        "ulx" => $ulx,
        "uly" => $uly,
        "lrx" => $lrx,
        "lry" => $lry,
        "width" => $width,
        "height" => $height
    ];
    logMessage("Applying world file", $context);
    sendSSE(["log" => "ワールドファイル適用: $worldFile -> $outputPath"]);
    $command = "$gdalTranslate -a_ullr $ulx $uly $lrx $lry -a_srs EPSG:$sourceEPSG -co COMPRESS=DEFLATE " . escapeshellarg($inputPath) . " " . escapeshellarg($outputPath) . " 2>&1";
    exec($command, $output, $returnVar);
    if ($returnVar !== 0 || !file_exists($outputPath)) {
        $context["output_log"] = implode("\n", $output);
        logMessage("Failed to apply world file", $context);
        sendSSE(["error" => "ワールドファイル適用失敗", "details" => implode("\n", $output)], "error");
        exit;
    }

    // ファイル権限
    chmod($outputPath, 0664);
    @chown($outputPath, 'www-data');
    @chgrp($outputPath, 'www-data');

    // 検証
    $verifyOutputFile = "/tmp/gdalinfo_verify_" . uniqid() . ".json";
    $verifyErrorFile = "/tmp/gdalinfo_verify_error_" . uniqid() . ".log";
    exec("$gdalInfo -json -nomd " . escapeshellarg($outputPath) . " > " . escapeshellarg($verifyOutputFile) . " 2> " . escapeshellarg($verifyErrorFile), $dummyOutput, $verifyReturnVar);
    if ($verifyReturnVar !== 0 || !file_exists($verifyOutputFile)) {
        $errorOutput = file_exists($verifyErrorFile) ? file_get_contents($verifyErrorFile) : "";
        $context["verify_error"] = $errorOutput;
        logMessage("Invalid intermediate file", $context);
        sendSSE(["error" => "中間ファイルの検証に失敗", "details" => $errorOutput], "error");
        if (file_exists($verifyErrorFile)) unlink($verifyErrorFile);
        exit;
    }
    $verifyOutput = file_get_contents($verifyOutputFile);
    $errorOutput = file_exists($verifyErrorFile) ? file_get_contents($verifyErrorFile) : "";
    unlink($verifyOutputFile);
    if (file_exists($verifyErrorFile)) unlink($verifyErrorFile);
    $verifyOutput = preg_replace('/[\x00-\x1F\x7F]/u', '', $verifyOutput);
    $verifyJson = json_decode($verifyOutput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !$verifyJson || !isset($verifyJson["geoTransform"])) {
        $context["verify_output"] = substr($verifyOutput, 0, 500);
        logMessage("JSON decode failed for verification", $context);
        sendSSE(["error" => "中間ファイルの検証に失敗", "details" => json_last_error_msg() . " (エラー出力: $errorOutput)"], "error");
        exit;
    }

    $context["verify_geo_transform"] = $verifyJson["geoTransform"];
    logMessage("World file applied successfully", $context);
    sendSSE(["log" => "ワールドファイル適用完了: $outputPath"]);
    return $outputPath;
}

// 最大ズーム計算
function calculateMaxZoom($filePath, $sourceEPSG) {
    global $gdalInfo;
    checkCommand($gdalInfo, "gdalinfo");
    if (!file_exists($filePath)) {
        $context = ["file" => $filePath];
        logMessage("File does not exist for zoom calculation", $context);
        sendSSE(["error" => "ズーム計算失敗: ファイルが存在しません", "details" => "ファイル: $filePath"], "error");
        exit;
    }
    $gdalOutputFile = "/tmp/gdalinfo_zoom_" . uniqid() . ".json";
    $gdalErrorFile = "/tmp/gdalinfo_zoom_error_" . uniqid() . ".log";
    exec("$gdalInfo -json -nomd " . escapeshellarg($filePath) . " > " . escapeshellarg($gdalOutputFile) . " 2> " . escapeshellarg($gdalErrorFile), $dummyOutput, $gdalReturnVar);
    if ($gdalReturnVar !== 0 || !file_exists($gdalOutputFile)) {
        $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
        $context = ["file" => $filePath, "gdal_error" => $errorOutput];
        logMessage("gdalinfo failed for zoom calculation", $context);
        sendSSE(["error" => "ズーム計算に失敗", "details" => $errorOutput], "error");
        if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
        exit;
    }
    $rawOutput = file_get_contents($gdalOutputFile);
    $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
    unlink($gdalOutputFile);
    if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
    if ($rawOutput === false || empty(trim($rawOutput))) {
        $context = ["file" => $filePath, "error_output" => $errorOutput];
        logMessage("Empty or unreadable gdalinfo output", $context);
        sendSSE(["error" => "gdalinfo出力が空または読み込めません", "details" => $errorOutput], "error");
        exit;
    }
    $rawOutput = preg_replace('/[\x00-\x1F\x7F]/u', '', $rawOutput);
    $rawOutput = mb_convert_encoding($rawOutput, 'UTF-8', 'auto');
    $gdalOutputJson = json_decode($rawOutput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson) {
        $context = [
            "file" => $filePath,
            "json_error" => json_last_error_msg(),
            "raw_output_length" => strlen($rawOutput),
            "raw_output_start" => substr($rawOutput, 0, 500),
            "error_output" => $errorOutput
        ];
        logMessage("JSON decode failed for zoom calculation", $context);
        sendSSE(["error" => "JSONデコードに失敗", "details" => json_last_error_msg() . " (出力長: " . strlen($rawOutput) . ")"], "error");
        exit;
    }
    if (!isset($gdalOutputJson["size"]) || !is_array($gdalOutputJson["size"]) || count($gdalOutputJson["size"]) < 2 || !isset($gdalOutputJson["geoTransform"])) {
        $context = ["file" => $filePath, "json_output" => json_encode($gdalOutputJson, JSON_UNESCAPED_UNICODE)];
        logMessage("Invalid size or geoTransform", $context);
        sendSSE(["error" => "ズーム計算失敗、座標情報なし", "details" => "サイズまたはジオトランスフォームが無効"], "error");
        exit;
    }
    $width = (int)$gdalOutputJson["size"][0];
    $height = (int)$gdalOutputJson["size"][1];
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
    $context = ["file" => $filePath, "max_zoom" => $maxZoom, "gsd" => $gsd, "width" => $width, "height" => $height];
    logMessage("Calculated max zoom", $context);
    sendSSE(["log" => "最大ズーム: $maxZoom (GSD: $gsd m/pixel)"]);
    return $maxZoom;
}

// POSTリクエスト
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    logMessage("Invalid request method");
    sendSSE(["error" => "POSTリクエストのみ"], "error");
    exit;
}

// パラメータ
if (!isset($_POST["file"])) {
    logMessage("Missing file path");
    sendSSE(["error" => "ファイルパス未指定"], "error");
    exit;
}
$filePath = realpath($_POST["file"]);
if (!$filePath || !file_exists($filePath)) {
    $context = ["file" => $_POST["file"]];
    logMessage("File does not exist", $context);
    sendSSE(["error" => "ファイルが存在しません"], "error");
    exit;
}
$fileName = isset($_POST["fileName"]) && !empty($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : "image_" . uniqid();
$sourceEPSG = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "32654";
$context = ["file" => $filePath, "file_name" => $fileName, "source_epsg" => $sourceEPSG];
logMessage("Parameters received", $context);
sendSSE(["log" => "パラメータ: file=$filePath, fileName=$fileName, EPSG=$sourceEPSG"]);

// ワールドファイル
$worldFile = checkWorldFile($filePath);

// EPSG検証（ワールドファイルの有無を考慮）
verifyEPSG($filePath, $sourceEPSG, !is_null($worldFile));

// 出力ファイルパス
$outputFilePath = $filePath;
if ($worldFile) {
    $worldFileAppliedPath = "/tmp/" . htmlspecialchars($fileName) . "_worldfile_applied.tif";
    $outputFilePath = applyWorldFile($filePath, $worldFileAppliedPath, $worldFile, $sourceEPSG);
} else {
    $context = ["file" => $filePath];
    logMessage("No world file, checking image georeferencing", $context);
    $gdalOutputFile = "/tmp/gdalinfo_noworld_" . uniqid() . ".json";
    $gdalErrorFile = "/tmp/gdalinfo_noworld_error_" . uniqid() . ".log";
    exec("$gdalInfo -json -nomd " . escapeshellarg($filePath) . " > " . escapeshellarg($gdalOutputFile) . " 2> " . escapeshellarg($gdalErrorFile), $dummyOutput, $gdalReturnVar);
    if ($gdalReturnVar !== 0 || !file_exists($gdalOutputFile)) {
        $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
        $context["error_output"] = $errorOutput;
        logMessage("gdalinfo failed", $context);
        sendSSE(["error" => "gdalinfo失敗", "details" => $errorOutput], "error");
        if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
        exit;
    }
    $rawOutput = file_get_contents($gdalOutputFile);
    $errorOutput = file_exists($gdalErrorFile) ? file_get_contents($gdalErrorFile) : "";
    unlink($gdalOutputFile);
    if (file_exists($gdalErrorFile)) unlink($gdalErrorFile);
    if ($rawOutput === false || empty(trim($rawOutput))) {
        $context["error_output"] = $errorOutput;
        logMessage("Empty or unreadable gdalinfo output", $context);
        sendSSE(["error" => "gdalinfo出力が空または読み込めません", "details" => $errorOutput], "error");
        exit;
    }
    $rawOutput = preg_replace('/[\x00-\x1F\x7F]/u', '', $rawOutput);
    $rawOutput = mb_convert_encoding($rawOutput, 'UTF-8', 'auto');
    $gdalJson = json_decode($rawOutput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !$gdalJson || !isset($gdalJson["geoTransform"]) || !isset($gdalJson["size"])) {
        $context["json_error"] = json_last_error_msg();
        $context["error_output"] = $errorOutput;
        logMessage("No valid georeferencing in image", $context);
        sendSSE(["error" => "地理情報がありません", "details" => json_last_error_msg() . " (エラー出力: $errorOutput)"], "error");
        exit;
    }
}

// 最大ズーム計算
$maxZoom = calculateMaxZoom($outputFilePath, $sourceEPSG);

// 成功レスポンス
$context = ["file" => $outputFilePath, "max_zoom" => $maxZoom];
logMessage("Process completed successfully", $context);
sendSSE(["success" => true, "max_zoom" => $maxZoom], "success");
?>