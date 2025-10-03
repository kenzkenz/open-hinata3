<?php

// ===== gdal2tiles 安定化・north-up 強制・省メモリ版（2025-09-15） =====
// 変更点:
//  - gdal2tiles 直前で必ず north-up を保証（証拠ログ付き）
//  - メモリ対策: GDAL_CACHEMAX, --processes=1, 非可逆 WebP（品質指定）
//  - 画素数しきい値で事前ダウンサンプリング（任意）
//  - 透過はアルファ維持（黒縁は nearblack -setalpha を任意適用）
//  - gdaltransform のパスを明示

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
define("MAX_FILE_SIZE_BYTES", 200000000); // 200MB 上限
$logFile = "/tmp/php_script.log";

// 外部コマンドパス
$gdalInfo      = "/usr/bin/gdalinfo";
$gdalTranslate = "/usr/bin/gdal_translate";
$gdalWarp      = "/usr/bin/gdalwarp";
$gdal2Tiles    = "/usr/bin/gdal2tiles.py";
$gdalTransform = "/usr/bin/gdaltransform"; // ★ 追加
$nearblack     = "/usr/bin/nearblack";      // 任意（存在すれば使用）
$mbUtil        = "/var/www/venv/bin/mb-util";
$goPmTiles     = "/usr/local/bin/go-pmtiles";
$pythonPath    = "/var/www/venv/lib/python3.12/site-packages";

// GDAL キャッシュ（MB）。メモリ対策。
putenv('GDAL_CACHEMAX=512'); // 256〜1024 で調整

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

// ディレクトリサイズ計算（.webp のみ集計）
function calculateTileDirectorySize($tileDir) {
    $totalSize = 0; $totalTiles = 0;
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

// 最大ズームフォルダ削除
function deleteHighestZoomDirectory($tileDir, $currentMaxZoom) {
    $zoomDir = rtrim($tileDir, '/').'/'.$currentMaxZoom.'/';
    if (is_dir($zoomDir)) {
        exec("rm -rf " . escapeshellarg($zoomDir));
        return true;
    }
    return false;
}

// 最大ズーム計算（GSDベース）
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
        if ($tileResolution <= $gsd) { $maxZoom = $z; break; }
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

// 解像度をズームレベル24にリサンプリング（未使用: 参考）
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
    copyWorldFile($inputPath, $outputPath);
}

// ===== north-up / GCP 検査と強制焼き直し =====
function inspectGeoRef($path) {
    global $gdalInfo;
    $cmd = "$gdalInfo -json " . escapeshellarg($path);
    exec($cmd, $out, $ret);
    if ($ret !== 0) return [true, INF, INF, null];
    $j = json_decode(implode("\n", $out), true);
    $hasGCPs = !empty($j['gcps']);
    $rotX = 0.0; $rotY = 0.0;
    if (isset($j['geoTransform'])) {
        $gt = $j['geoTransform'];
        $rotX = isset($gt[2]) ? abs($gt[2]) : 0.0; // ピクセルX方向の回転/せん断
        $rotY = isset($gt[4]) ? abs($gt[4]) : 0.0; // ピクセルY方向の回転/せん断
    }
    return [$hasGCPs, $rotX, $rotY, $j];
}

function forceNorthUp($pathIn, $sourceEPSG, $fileName) {
    global $gdalWarp;
    list($hasGCPs, $rotX, $rotY) = inspectGeoRef($pathIn);
    $needs = $hasGCPs || $rotX > 1e-9 || $rotY > 1e-9;
    if (!$needs) return $pathIn; // 既に north-up

    $pathOut = "/tmp/{$fileName}_northup.tif";

    // GCPベースなら -order 1（アフィン）か、非線形なら -tps を検討
    $order = $hasGCPs ? "-order 1" : "";

    // ★ アルファ維持のため常に -dstalpha を付与（無くても自動生成される）
    $cmd =
        "$gdalWarp -t_srs EPSG:$sourceEPSG -r bilinear -overwrite " .
        "-dstalpha -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -co BIGTIFF=IF_SAFER " .
        "-wo NUM_THREADS=ALL_CPUS $order " .
        escapeshellarg($pathIn) . " " . escapeshellarg($pathOut);

    exec($cmd, $wOut, $wRet);
    if ($wRet !== 0 || !file_exists($pathOut)) {
        sendSSE(["error" => "north-up 焼き直し失敗", "details" => implode("
", (array)$wOut)], "error");
        exit;
    }

    list($hasGCPs2, $rotX2, $rotY2) = inspectGeoRef($pathOut);
    sendSSE(["log" => "north-up確認: hasGCPs=$hasGCPs2 rotX=$rotX2 rotY=$rotY2"]);
    if ($hasGCPs2 || $rotX2 > 1e-9 || $rotY2 > 1e-9) {
        sendSSE(["error" => "焼き直し後も回転/せん断/GCPが残存（-tps などを検討）"], "error");
        exit;
    }
    return $pathOut;
}

// 画素数しきい値での強制ダウンサンプリング（省メモリ）
function enforcePixelBudget($pathIn, $maxPixels, $fileName) {
    global $gdalInfo, $gdalWarp;
    exec("$gdalInfo -json " . escapeshellarg($pathIn), $out, $ret);
    if ($ret !== 0) return $pathIn;
    $j = json_decode(implode("
", $out), true);
    if (!isset($j['size'])) return $pathIn;
    $w = (int)$j['size'][0]; $h = (int)$j['size'][1];
    $px = (float)($w) * (float)($h);
    if ($px <= $maxPixels) return $pathIn;

    $ratio = sqrt($maxPixels / $px);
    $nw = max(1, (int)round($w * $ratio));
    $nh = max(1, (int)round($h * $ratio));
    $outPath = "/tmp/{$fileName}_pxbudget.tif";
    $cmd = "$gdalWarp -ts $nw $nh -r bilinear -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 " . escapeshellarg($pathIn) . " " . escapeshellarg($outPath);
    exec($cmd, $logs, $rc);
    if ($rc !== 0 || !file_exists($outPath)) return $pathIn;
    sendSSE(["log" => "画素数しきい値で縮小: $w x $h -> $nw x $nh"]);
    return $outPath;
}

// ===== WEBP 用に 3 (RGB) または 4 (RGBA) バンドへ正規化 =====
function getBandInfo($path) {
    global $gdalInfo;
    exec("$gdalInfo -json " . escapeshellarg($path), $out, $ret);
    if ($ret !== 0) return [null, []];
    $j = json_decode(implode("
", $out), true);
    $bands = isset($j['bands']) ? $j['bands'] : [];
    $count = count($bands);
    $interps = [];
    foreach ($bands as $b) {
        $interps[] = isset($b['colorInterpretation']) ? $b['colorInterpretation'] : '';
    }
    // ログ
    sendSSE(["log" => "BandInfo: count=$count interps=" . implode(',', $interps)]);
    return [$count, $interps];
}

function ensureWebpBandLayout($pathIn, $fileName) {
    global $gdalTranslate;
    list($count, $interps) = getBandInfo($pathIn);
    if ($count === null) return $pathIn;

    // 既に 3 or 4 バンドならそのまま
    if ($count === 3 || $count === 4) return $pathIn;

    $out = "/tmp/{$fileName}_webp_rgba.tif";

    if ($count === 2) {
        // 2バンド（例: Gray + Alpha）→ RGBA に変換（Gray を RGB に複写、2番目を Alpha に）
        $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 " .
            "-b 1 -b 1 -b 1 -b 2 " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd, $log, $rc);
        if ($rc === 0 && file_exists($out)) { sendSSE(["log" => "2バンド→RGBAへ正規化"]); return $out; }
        // フォールバック: RGB だけに
        $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -b 1 -b 1 -b 1 " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd, $log2, $rc2);
        if ($rc2 === 0 && file_exists($out)) { sendSSE(["log" => "2バンド→RGBへ正規化（フォールバック）"]); return $out; }
        return $pathIn;
    }

    if ($count === 1) {
        // 1バンド（Gray）→ RGB に展開
        $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -expand rgb " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd, $log, $rc);
        if ($rc === 0 && file_exists($out)) { sendSSE(["log" => "1バンド→RGBへ展開"]); return $out; }
        // フォールバック: 手動で複写
        $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -b 1 -b 1 -b 1 " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd, $log2, $rc2);
        if ($rc2 === 0 && file_exists($out)) { sendSSE(["log" => "1バンド→RGBへ複写（フォールバック）"]); return $out; }
        return $pathIn;
    }

    // その他（パレットなど）は RGB に展開
    $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -expand rgb " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
    exec($cmd, $log, $rc);
    if ($rc === 0 && file_exists($out)) { sendSSE(["log" => "パレット等→RGBへ展開"]); return $out; }
    return $pathIn;
}

// ===== WEBP 透過用：外縁の黒/白をアルファへ（nearblack 優先、fallback: gdalwarp -srcnodata） =====
function applyEdgeAlpha($pathIn, $fileName, $edgeMode = 'black', $edgeNear = 16) {
    global $nearblack, $gdalWarp;
    $out = "/tmp/{$fileName}_edgealpha.tif";
    $near = is_numeric($edgeNear) ? max(0, (int)$edgeNear) : 16;

    // nearblack が使えるなら優先（黒/白の近似をアルファ0に）
    if (file_exists($nearblack) && is_executable($nearblack)) {
        $modeFlag = ($edgeMode === 'white') ? '-white' : '-black';
        $cmd = "$nearblack -setalpha $modeFlag -near $near " . escapeshellarg($pathIn) . " -o " . escapeshellarg($out);
        exec($cmd, $nbLog, $nbRet);
        if ($nbRet === 0 && file_exists($out)) {
            sendSSE(["log" => "nearblack により外縁（$edgeMode, near=$near）をアルファ化"]);
            return $out;
        }
    }

    // フォールバック: 完全黒/白を nodata としてアルファ化
    $src = ($edgeMode === 'white') ? '255 255 255' : '0 0 0';
    $cmd = "$gdalWarp -srcnodata \"$src\" -dstalpha -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 " .
        escapeshellarg($pathIn) . " " . escapeshellarg($out);
    exec($cmd, $wlog, $wret);
    if ($wret === 0 && file_exists($out)) {
        sendSSE(["log" => "gdalwarp により外縁（$edgeMode）をアルファ化"]);
        return $out;
    }

    // 失敗時はそのまま返す
    sendSSE(["log" => "外縁アルファ化に失敗（nearblack/gdalwarpとも不可）。元画像を継続"]);
    return $pathIn;
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
$fileName    = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
$subDir      = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]);
$resolution  = isset($_POST["resolution"]) && is_numeric($_POST["resolution"]) ? intval($_POST["resolution"]) : null;
$sourceEPSG  = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "2450";
$transparent = isset($_POST["transparent"]) ? $_POST["transparent"] : "1"; // デフォルト1
if (!in_array($transparent, ["0", "1"])) {
    sendSSE(["error" => "無効なtransparent値: 0または1を指定してください"], "error");
    logMessage("Invalid transparent value: $transparent");
    exit;
}
$transparent = (int)$transparent; // 文字列を整数に変換
$edgeMode = (isset($_POST["edgeMode"]) && strtolower($_POST["edgeMode"]) === "white") ? "white" : "black"; // 外縁の色（black|white）
$edgeNear = (isset($_POST["edgeNear"]) && is_numeric($_POST["edgeNear"])) ? intval($_POST["edgeNear"]) : 2; // 近似しきい値（0～）
logMessage("Parameters: fileName=$fileName, subDir=$subDir, resolution=$resolution, sourceEPSG=$sourceEPSG, transparent=$transparent, edgeMode=$edgeMode, edgeNear=$edgeNear");
sendSSE(["log" => "パラメータ: fileName=$fileName, subDir=$subDir, transparent=$transparent, edgeMode=$edgeMode, edgeNear=$edgeNear"]);

// 処理中ファイルの作成
$fileBaseName   = pathinfo($filePath, PATHINFO_FILENAME);
$processingFile = "/tmp/{$fileBaseName}_{$subDir}_processing.txt";
if (!file_put_contents($processingFile, "Processing: $filePath for $subDir at " . date("Y-m-d H:i:s"))) {
    sendSSE(["error" => "処理中ファイルの作成に失敗"], "error");
    exit;
}
chmod($processingFile, 0664);
@chown($processingFile, 'www-data');
@chgrp($processingFile, 'www-data');
sendSSE(["log" => "処理中ファイルを作成: $processingFile"]);

// コマンド存在確認
checkCommand($gdalTranslate, "gdal_translate");
checkCommand($gdalWarp,      "gdalwarp");
checkCommand($gdal2Tiles,    "gdal2tiles.py");
checkCommand($gdalTransform, "gdaltransform"); // ★ 追加
checkCommand($mbUtil,        "mb-util");
checkCommand($goPmTiles,     "go-pmtiles");

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

// ワールドファイル確認（情報ログ）
checkWorldFile($filePath);

// 中間ファイルクリーンアップ
cleanTempFiles($fileName);
sendSSE(["log" => "中間ファイル削除"]);

// 最大ズーム計算
list($max_zoom, $gsd, $width, $height) = calculateMaxZoom($filePath, $sourceEPSG);

// ズーム24以上の場合は24に制限（重過ぎるのを防ぐ）
$outputFilePath = $filePath;
$resampledPath  = null;
if ($max_zoom > 24) {
    sendSSE(["log" => "<span style='color: red'>ズームレベル $max_zoom が24を超過、最大ズームを24に制限</span>"]);
    $max_zoom = 24;
    sendSSE(["log" => "最大ズームレベルを24に設定"]);
}

// JPEG入力 → GeoTIFF 化
$tempOutputPath = null;
$ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
if (in_array($ext, ['jpg', 'jpeg'])) {
    sendSSE(["log" => "JPEG処理開始"]);
    $tempOutputPath = "/tmp/" . $fileName . "_processed.tif";
    $preprocessCommand = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tempOutputPath);
    exec($preprocessCommand, $preprocessOutput, $preprocessReturnVar);
    if ($preprocessReturnVar !== 0 || !file_exists($tempOutputPath)) {
        logMessage("JPEG processing failed: " . implode("\n", $preprocessOutput));
        sendSSE(["error" => "JPEG処理失敗", "details" => implode("\n", $preprocessOutput)], "error");
        exit;
    }
    $outputFilePath = $tempOutputPath;
    sendSSE(["log" => "JPEG処理完了"]);
}

// 透過処理（アルファを作る）
$transparentPath = null;
if ($transparent === 1) {
    $transparentPath = "/tmp/" . $fileName . "_transparent.tif";
    sendSSE(["log" => "透過処理開始（-dstalpha）"]);
    // -srcnodata は指定しない（黒/白もデータに残す）。縁抜きは nearblack を後段で任意適用。
    $transparentCommand = "$gdalWarp -dstalpha -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -wo NUM_THREADS=ALL_CPUS " . escapeshellarg($outputFilePath) . " " . escapeshellarg($transparentPath);
    exec($transparentCommand, $tOut, $tRet);
    if ($tRet !== 0 || !file_exists($transparentPath)) {
        logMessage("Transparency processing failed: " . implode("\n", (array)$tOut));
        sendSSE(["error" => "透過処理失敗", "details" => implode("\n", (array)$tOut)], "error");
        exit;
    }
    $outputFilePath = $transparentPath;
    sendSSE(["log" => "透過処理完了"]);

    // 縁抜きは後段の applyEdgeAlpha() で一括実施（ここでは行わない）
}
else {
    sendSSE(["log" => "透過処理をスキップ（アルファなし）"]);
}

// ★ gdal2tiles 直前で「必ず」north-up を保証
$outputFilePath = forceNorthUp($outputFilePath, $sourceEPSG, $fileName);
list($hasGCPsF, $rotXF, $rotYF) = inspectGeoRef($outputFilePath);
sendSSE(["log" => "gdal2tiles直前: hasGCPs=$hasGCPsF rotX=$rotXF rotY=$rotYF"]);

// ★ 画素数しきい値での省メモリ縮小（必要な場合のみ）
$outputFilePath = enforcePixelBudget($outputFilePath, 200_000_000 /* 2億px */, $fileName);

// ★ WEBP が受け付ける 3/4 バンドへ正規化（Gray+Alpha=2バンド対策）
$outputFilePath = ensureWebpBandLayout($outputFilePath, $fileName);

// ★ 外縁の黒/白を透過（transparent=1 のときのみ適用）
if ($transparent === 1) {
    $outputFilePath = applyEdgeAlpha($outputFilePath, $fileName, $edgeMode, $edgeNear);
    list($bandCountAfter, $interpsAfter) = getBandInfo($outputFilePath);
    sendSSE(["log" => "edgeAlpha 後バンド: $bandCountAfter (" . implode(',', $interpsAfter) . ")"]);
    if ($bandCountAfter < 4) {
        sendSSE(["log" => "注意: アルファが見つからないため RGBA へ昇格" ]);
        // RGBAに昇格（Alpha=255を作成）
        $tmpRGBA = "/tmp/{$fileName}_force_rgba.tif";
        $cmdRGBA = "/usr/bin/gdal_translate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -b 1 -b 2 -b 3 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tmpRGBA);
        exec($cmdRGBA, $rlog, $rc);
        if ($rc === 0 && file_exists($tmpRGBA)) { $outputFilePath = $tmpRGBA; }
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
$upperLeft  = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
sendSSE(["log" => "座標取得完了"]);

// 座標変換
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
    global $gdalTransform;
    checkCommand($gdalTransform, "gdaltransform");
    $cmd = "echo " . escapeshellarg("$x $y") . " | $gdalTransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd, $output);
    $coords = explode(" ", trim($output[0] ?? ""));
    return count($coords) >= 2 ? [floatval($coords[0]), floatval($coords[1])] : null;
}
sendSSE(["log" => "座標変換開始"]);
$minCoord = transformCoords($upperLeft[0],  $lowerRight[1], $sourceEPSG);
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1],  $sourceEPSG);
if (!$minCoord || !$maxCoord) {
    sendSSE(["error" => "座標変換失敗"], "error");
    exit;
}
$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];
sendSSE(["log" => "座標変換完了: " . json_encode($bbox4326)]);

// 解像度指定があればそれを最大ズームに採用
$max_zoom = $resolution ?: $max_zoom;

// 出力ディレクトリ等
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$tileDir      = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
$mbTilesPath  = "$tileDir{$fileBaseName}.mbtiles";
$pmTilesPath  = "$tileDir{$fileBaseName}.pmtiles";
$tileURL      = "$BASE_URL$subDir/$fileBaseName/{$fileBaseName}.pmtiles";

// ディレクトリ作成
if (!is_dir($tileDir) && !mkdir($tileDir, 0775, true)) {
    sendSSE(["error" => "ディレクトリ作成失敗"], "error");
    exit;
}
chmod($tileDir, 0775);
@chown($tileDir, 'www-data');
@chgrp($tileDir, 'www-data');
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

// WebPタイル生成（省メモリ設定）
sendSSE(["log" => "WebPタイル生成開始"]);
$processes   = 1;                 // ★ 安定優先（必要に応じて 2 まで）
$webpSwitch  = "--webp-quality 90"; // ★ 可逆を外し、まずは軽く
$tileCommand = "$gdal2Tiles --tiledriver WEBP -z 0-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes $processes $webpSwitch " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tileDir);

$process = proc_open($tileCommand, [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]], $pipes);
$output = [];
if (is_resource($process)) {
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    while (!feof($pipes[1]) || !feof($pipes[2])) {
        $stdout = fgets($pipes[1]);
        $stderr = fgets($pipes[2]);
        if ($stdout && trim($stdout) !== '.') {
            $cleanedStdout = preg_replace('/^\.+|\.+$/', '', trim($stdout));
            if ($cleanedStdout !== '') sendSSE(["log" => $cleanedStdout]);
            $output[] = $cleanedStdout;
        }
        if ($stderr) { $output[] = "[ERROR] " . trim($stderr); }
        usleep(100000);
    }
    fclose($pipes[0]); fclose($pipes[1]); fclose($pipes[2]);
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

// タイルサイズ調整（上限 200MB）
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
@chown($mbTilesPath, 'www-data');
@chgrp($mbTilesPath, 'www-data');
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
@chown($pmTilesPath, 'www-data');
@chgrp($pmTilesPath, 'www-data');
sendSSE(["log" => "PMTiles生成完了"]);

// クリーンアップ
function deleteSourceAndTempFiles($filePath, $tempOutputPath, $transparentPath, $resampledPath = null, $processingFile = null) {
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file !== '.' && $file !== '..' && "$dir/$file" !== $filePath) { @unlink("$dir/$file"); }
    }
    if ($tempOutputPath   && file_exists($tempOutputPath))   @unlink($tempOutputPath);
    if ($transparentPath  && file_exists($transparentPath))  @unlink($transparentPath);
    if ($resampledPath    && file_exists($resampledPath))    @unlink($resampledPath);
    if ($processingFile   && file_exists($processingFile)) { @unlink($processingFile); logMessage("Deleted processing file: $processingFile"); sendSSE(["log" => "処理中ファイル削除: $processingFile"]); }
}
deleteSourceAndTempFiles($filePath, $tempOutputPath, $transparentPath, $resampledPath, $processingFile);
sendSSE(["log" => "元データと中間データ削除"]);

// タイルディレクトリクリーンアップ（pmtiles 以外削除）
function deleteTileDirContents($tileDir, $fileBaseName) {
    $keepFiles = ["{$fileBaseName}.pmtiles"];
    foreach (scandir($tileDir) as $item) {
        if ($item === '.' || $item === '..' || in_array($item, $keepFiles)) continue;
        $fullPath = rtrim($tileDir, '/').'/'.$item;
        if (is_dir($fullPath)) { exec("rm -rf " . escapeshellarg($fullPath)); }
        elseif (is_file($fullPath)) { @unlink($fullPath); }
    }
}
deleteTileDirContents($tileDir, $fileBaseName);
sendSSE(["log" => "タイルディレクトリクリーンアップ"]);

// PMTilesサイズ
$pmTilesSizeMB = file_exists($pmTilesPath) ? round(filesize($pmTilesPath) / (1024 * 1024), 2) : 0;
sendSSE(["log" => "サイズ: $pmTilesSizeMB MB / 最大ズーム:$max_zoom"]);

// 成功レスポンス
sendSSE([
    "success"        => true,
    "tiles_url"      => $tileURL,
    "tiles_dir"      => $tileDir,
    "bbox"           => $bbox4326,
    "max_zoom"       => $max_zoom,
    "pmtiles_size_mb"=> $pmTilesSizeMB,
    "tileCommand"    => $tileCommand,
], "success");

?>