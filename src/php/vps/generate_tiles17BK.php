<?php
// ===== gdal2tiles 安定化・north-up強制・省メモリ版（白黒とも縁だけ透過） =====
// 2025-09-15 系の旧版をベースに、以下を反映：
//  - 透過は nearblack 二段（黒→白）で「縁だけ」をアルファ化。中央の白黒は保持
//  - gdalwarp -srcnodata フォールバックは無効化（中央保護）
//  - ログ表記（edge-only）, 変数名, chmod/chgrp の括弧ミス修正
//  - WEBP 2バンド対策, north-up 強制, 画素数しきい値, サイズ上限調整は維持

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

// 定数とベースURL
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
define("EARTH_RADIUS_M", 6378137);
define("MAX_FILE_SIZE_BYTES", 200000000); // 200MB 上限
$logFile = "/tmp/php_script.log";

// 外部コマンドパス
$gdalInfo      = "/usr/bin/gdalinfo";
$gdalTranslate = "/usr/bin/gdal_translate";
$gdalWarp      = "/usr/bin/gdalwarp";
$gdal2Tiles    = "/usr/bin/gdal2tiles.py";
$gdalTransform = "/usr/bin/gdaltransform";
$nearblack     = "/usr/bin/nearblack";
$mbUtil        = "/var/www/venv/bin/mb-util";
$goPmTiles     = "/usr/local/bin/go-pmtiles";
$pythonPath    = "/var/www/venv/lib/python3.12/site-packages";

// GDAL キャッシュ
putenv('GDAL_CACHEMAX=512');

// SSE送信
function sendSSE($data, $event = "message") {
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
    echo "#\n\n";
    flush();
}

// ログファイル追記
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

// ディレクトリサイズ（.webpのみ）
function calculateTileDirectorySize($tileDir) {
    $totalSize = 0; $totalTiles = 0;
    if (!is_dir($tileDir)) return [0, 0];
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($tileDir, RecursiveDirectoryIterator::SKIP_DOTS));
    foreach ($it as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'webp') {
            $totalSize += $file->getSize();
            $totalTiles++;
        }
    }
    return [$totalSize, $totalTiles];
}

// 最大ズームのディレクトリを削除
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
    $j = json_decode(implode("\n", $gdalOutput), true);
    if ($gdalReturnVar !== 0 || !$j || !isset($j["size"]) || !isset($j["geoTransform"])) {
        logMessage("gdalinfo failed for zoom calculation");
        sendSSE(["error" => "ズーム計算失敗、座標情報なし"], "error");
        exit;
    }
    $width = $j["size"][0]; $height = $j["size"][1];
    $gt = $j["geoTransform"];
    $gsd = max(abs($gt[1]), abs($gt[5]));
    $maxZoom = 0;
    for ($z = 0; $z <= 30; $z++) {
        $tileRes = (2 * M_PI * EARTH_RADIUS_M) / (256 * pow(2, $z));
        if ($tileRes <= $gsd) { $maxZoom = $z; break; }
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
    $exts = ['tfw', 'jgw', 'pgw'];
    foreach ($exts as $ext) {
        $wf = preg_replace('/\.[^.]+$/', ".$ext", $filePath);
        if (file_exists($wf)) {
            logMessage("World file found: $wf");
            sendSSE(["log" => "ワールドファイル確認: $wf"]);
            return $wf;
        }
    }
    logMessage("No world file found for: $filePath");
    sendSSE(["log" => "ワールドファイルが見つかりません"]);
    return null;
}

// ワールドファイルコピー
function copyWorldFile($srcFilePath, $dstFilePath) {
    $exts = ['tfw', 'jgw', 'pgw'];
    foreach ($exts as $ext) {
        $src = preg_replace('/\.[^.]+$/', ".$ext", $srcFilePath);
        if (file_exists($src)) {
            $dst = preg_replace('/\.[^.]+$/', ".$ext", $dstFilePath);
            if (copy($src, $dst)) {
                sendSSE(["log" => "ワールドファイルコピー: $dst"]);
                return $dst;
            }
            sendSSE(["log" => "ワールドファイルコピー失敗: $src"]);
        }
    }
    return null;
}

// georef 検査
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
        $rotX = isset($gt[2]) ? abs($gt[2]) : 0.0;
        $rotY = isset($gt[4]) ? abs($gt[4]) : 0.0;
    }
    return [$hasGCPs, $rotX, $rotY, $j];
}

// north-up 強制
function forceNorthUp($pathIn, $sourceEPSG, $fileName) {
    global $gdalWarp;
    list($hasGCPs, $rotX, $rotY) = inspectGeoRef($pathIn);
    $needs = $hasGCPs || $rotX > 1e-9 || $rotY > 1e-9;
    if (!$needs) return $pathIn;

    $pathOut = "/tmp/{$fileName}_northup.tif";
    $order = $hasGCPs ? "-order 1" : "";
    $cmd = "$gdalWarp -t_srs EPSG:$sourceEPSG -r bilinear -overwrite "
        . "-dstalpha -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -co BIGTIFF=IF_SAFER "
        . "-wo NUM_THREADS=ALL_CPUS $order "
        . escapeshellarg($pathIn) . " " . escapeshellarg($pathOut);

    exec($cmd, $wOut, $wRet);
    if ($wRet !== 0 || !file_exists($pathOut)) {
        sendSSE(["error" => "north-up 焼き直し失敗", "details" => implode("\n", (array)$wOut)], "error");
        exit;
    }
    list($hasGCPs2, $rotX2, $rotY2) = inspectGeoRef($pathOut);
    sendSSE(["log" => "north-up確認: hasGCPs=$hasGCPs2 rotX=$rotX2 rotY=$rotY2"]);
    if ($hasGCPs2 || $rotX2 > 1e-9 || $rotY2 > 1e-9) {
        sendSSE(["error" => "焼き直し後も回転/せん断/GCPが残存（-tps等検討）"], "error");
        exit;
    }
    return $pathOut;
}

// 画素数しきい値で縮小
function enforcePixelBudget($pathIn, $maxPixels, $fileName) {
    global $gdalInfo, $gdalWarp;
    exec("$gdalInfo -json " . escapeshellarg($pathIn), $out, $ret);
    if ($ret !== 0) return $pathIn;
    $j = json_decode(implode("\n", $out), true);
    if (!isset($j['size'])) return $pathIn;
    $w = (int)$j['size'][0]; $h = (int)$j['size'][1];
    $px = (float)$w * (float)$h;
    if ($px <= $maxPixels) return $pathIn;

    $ratio = sqrt($maxPixels / $px);
    $nw = max(1, (int)round($w * $ratio));
    $nh = max(1, (int)round($h * $ratio));
    $outPath = "/tmp/{$fileName}_pxbudget.tif";
    $cmd = "$gdalWarp -ts $nw $nh -r bilinear -overwrite "
        . "-co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        . escapeshellarg($pathIn) . " " . escapeshellarg($outPath);
    exec($cmd, $logs, $rc);
    if ($rc !== 0 || !file_exists($outPath)) return $pathIn;
    sendSSE(["log" => "画素数しきい値で縮小: $w x $h -> $nw x $nh"]);
    return $outPath;
}

// バンド情報
function getBandInfo($path) {
    global $gdalInfo;
    exec("$gdalInfo -json " . escapeshellarg($path), $out, $ret);
    if ($ret !== 0) return [null, []];
    $j = json_decode(implode("\n", $out), true);
    $bands = isset($j['bands']) ? $j['bands'] : [];
    $count = count($bands);
    $interps = [];
    foreach ($bands as $b) { $interps[] = $b['colorInterpretation'] ?? ''; }
    sendSSE(["log" => "BandInfo: count=$count interps=" . implode(',', $interps)]);
    return [$count, $interps];
}

// WEBP 3/4バンドへ正規化
function ensureWebpBandLayout($pathIn, $fileName) {
    global $gdalTranslate;
    list($count, $interps) = getBandInfo($pathIn);
    if ($count === null) return $pathIn;
    if ($count === 3 || $count === 4) return $pathIn;

    $out = "/tmp/{$fileName}_webp_rgba.tif";
    if ($count === 2) {
        $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
            . "-b 1 -b 1 -b 1 -b 2 " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd, $log, $rc);
        if ($rc === 0 && file_exists($out)) { sendSSE(["log" => "2バンド→RGBAへ正規化"]); return $out; }
        $cmd2 = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
            . "-b 1 -b 1 -b 1 " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd2, $log2, $rc2);
        if ($rc2 === 0 && file_exists($out)) { sendSSE(["log" => "2バンド→RGBへ正規化（フォールバック）"]); return $out; }
        return $pathIn;
    }
    if ($count === 1) {
        $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
            . "-expand rgb " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd, $log, $rc);
        if ($rc === 0 && file_exists($out)) { sendSSE(["log" => "1バンド→RGBへ展開"]); return $out; }
        $cmd2 = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
            . "-b 1 -b 1 -b 1 " . escapeshellarg($pathIn) . " " . escapeshellarg($out);
        exec($cmd2, $log2, $rc2);
        if ($rc2 === 0 && file_exists($out)) { sendSSE(["log" => "1バンド→RGBへ複写（フォールバック）"]); return $out; }
        return $pathIn;
    }
    $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -expand rgb "
        . escapeshellarg($pathIn) . " " . escapeshellarg($out);
    exec($cmd, $log, $rc);
    if ($rc === 0 && file_exists($out)) { sendSSE(["log" => "パレット等→RGBへ展開"]); return $out; }
    return $pathIn;
}

// ===== edge-only: nearblack 二段（黒→白）。中央の白黒は保持 =====
function applyEdgeAlpha($pathIn, $fileName, $nearBlack = 10, $nearWhite = 10, $nb = 256) {
    $nearblack = "/usr/bin/nearblack";
    $gdalwarp  = "/usr/bin/gdalwarp";
    $gdalinfo  = "/usr/bin/gdalinfo";

    if (!file_exists($nearblack) || !is_executable($nearblack)) {
        sendSSE(["log" => "nearblack が見つからないため縁透過をスキップ"]);
        return $pathIn;
    }

    // まず alpha チャンネルを必ず持たせる
    $alphaReady = "/tmp/{$fileName}_alpha.tif";
    $cmdAlpha = "$gdalwarp -dstalpha -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        . escapeshellarg($pathIn) . " " . escapeshellarg($alphaReady);
    exec($cmdAlpha, $oA, $rA);
    if ($rA !== 0 || !file_exists($alphaReady)) {
        sendSSE(["error" => "透過処理失敗（-dstalpha）", "details" => implode("\n", (array)$oA)], "error");
        return $pathIn;
    }
    sendSSE(["log" => "透過処理完了（-dstalpha）"]);

    // 黒縁だけアルファ化
    $outBlack = "/tmp/{$fileName}_edge_black.tif";
    $cmdNBk = "$nearblack -setalpha -black -near " . (int)$nearBlack . " -nb " . (int)$nb . " "
        . escapeshellarg($alphaReady) . " -o " . escapeshellarg($outBlack);
    exec($cmdNBk, $oB, $rB);
    if ($rB === 0 && file_exists($outBlack)) {
        sendSSE(["log" => "nearblack 黒パス: near=$nearBlack, nb=$nb (edge-only)"]);
        $current = $outBlack;
    } else {
        sendSSE(["log" => "nearblack 黒パス失敗。黒縁透過はスキップ"]);
        $current = $alphaReady;
    }

    // 白縁だけアルファ化
    $outWhite = "/tmp/{$fileName}_edge_white.tif";
    $cmdNWh = "$nearblack -setalpha -white -near " . (int)$nearWhite . " -nb " . (int)$nb . " "
        . escapeshellarg($current) . " -o " . escapeshellarg($outWhite);
    exec($cmdNWh, $oW, $rW);
    if ($rW === 0 && file_exists($outWhite)) {
        sendSSE(["log" => "nearblack 白パス: near=$nearWhite, nb=$nb (edge-only)"]);
        $final = $outWhite;
    } else {
        sendSSE(["log" => "nearblack 白パス失敗。白縁透過はスキップ"]);
        $final = $current;
    }

    // デバッグ: バンド情報
    exec("$gdalinfo -json " . escapeshellarg($final), $iOut, $iRc);
    if ($iRc === 0) {
        $j = json_decode(implode("\n", $iOut), true);
        if (!empty($j["bands"])) {
            $interps = array_map(fn($b) => $b["colorInterpretation"] ?? "", $j["bands"]);
            sendSSE(["log" => "edgeAlpha 後バンド: " . count($j["bands"]) . " (" . implode(",", $interps) . ")"]);
        }
    }
    return $final;
}

// 座標変換
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
    global $gdalTransform;
    checkCommand($gdalTransform, "gdaltransform");
    $cmd = "echo " . escapeshellarg("$x $y") . " | $gdalTransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd, $output);
    $coords = explode(" ", trim($output[0] ?? ""));
    return count($coords) >= 2 ? [floatval($coords[0]), floatval($coords[1])] : null;
}

// グレースケール判定
function isGrayscale($filePath) {
    global $gdalInfo;
    checkCommand($gdalInfo, "gdalinfo");
    exec("$gdalInfo -json " . escapeshellarg($filePath), $infoOutput);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return json_last_error() === JSON_ERROR_NONE && isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
}

// ==== メイン処理 ====
// POSTのみ
if ($_SERVER["REQUEST_METHOD"] !== "POST") { sendSSE(["error" => "POSTリクエストのみ"], "error"); exit; }

// 必須パラメータ
if (!isset($_POST["file"]) || !isset($_POST["dir"])) {
    sendSSE(["error" => "ファイルパスまたはディレクトリ未指定"], "error");
    exit;
}

// ファイル検証
$filePath = realpath($_POST["file"]);
if (!$filePath || !file_exists($filePath)) {
    sendSSE(["error" => "ファイルが存在しません"], "error");
    exit;
}
logMessage("File: $filePath");
sendSSE(["log" => "ファイル確認: $filePath"]);

// パラメータ
$fileName    = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
$subDir      = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]);
$resolution  = isset($_POST["resolution"]) && is_numeric($_POST["resolution"]) ? intval($_POST["resolution"]) : null;
$sourceEPSG  = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "2450";
$transparent = isset($_POST["transparent"]) ? $_POST["transparent"] : "1";
if (!in_array($transparent, ["0", "1"])) {
    sendSSE(["error" => "無効なtransparent値: 0または1を指定してください"], "error");
    exit;
}
$transparent = (int)$transparent;

// 新パラメータ（縁透過制御）
$nearBlack = isset($_POST["nearBlack"]) && is_numeric($_POST["nearBlack"]) ? max(0, (int)$_POST["nearBlack"]) : 10;
$nearWhite = isset($_POST["nearWhite"]) && is_numeric($_POST["nearWhite"]) ? max(0, (int)$_POST["nearWhite"]) : 10;
$nb        = isset($_POST["nb"])        && is_numeric($_POST["nb"])        ? max(0, (int)$_POST["nb"])        : 256;

sendSSE(["log" => "パラメータ: fileName=$fileName, subDir=$subDir, transparent=$transparent, nearBlack=$nearBlack, nearWhite=$nearWhite, nb=$nb"]);

// 処理中ファイルマーク
$fileBaseName   = pathinfo($filePath, PATHINFO_FILENAME);
$processingFile = "/tmp/{$fileBaseName}_{$subDir}_processing.txt";
if (!file_put_contents($processingFile, "Processing: $filePath for $subDir at " . date("Y-m-d H:i:s"))) {
    sendSSE(["error" => "処理中ファイルの作成に失敗"], "error"); exit;
}
chmod($processingFile, 0664);
@chown($processingFile, 'www-data');
@chgrp($processingFile, 'www-data');
sendSSE(["log" => "処理中ファイルを作成: $processingFile"]);

// コマンド確認
checkCommand($gdalTranslate, "gdal_translate");
checkCommand($gdalWarp,      "gdalwarp");
checkCommand($gdal2Tiles,    "gdal2tiles.py");
checkCommand($gdalTransform, "gdaltransform");
checkCommand($mbUtil,        "mb-util");
checkCommand($goPmTiles,     "go-pmtiles");

// WebPサポート
if (!checkWebPSupport()) { sendSSE(["error" => "GDALにWebPサポートなし"], "error"); exit; }
sendSSE(["log" => "WebPサポート確認"]);

// /tmp 空き容量
$freeSpace = disk_free_space('/tmp');
if ($freeSpace === false || $freeSpace / (1024 * 1024) < 1000) { sendSSE(["error" => "ディスク容量不足"], "error"); exit; }
sendSSE(["log" => "/tmp 空き容量: " . round($freeSpace / (1024 * 1024), 2) . " MB"]);

// ワールドファイル確認
checkWorldFile($filePath);

// 中間掃除
cleanTempFiles($fileName);
sendSSE(["log" => "中間ファイル削除"]);

// 最大ズーム計算
list($max_zoom, $gsd, $width, $height) = calculateMaxZoom($filePath, $sourceEPSG);
if ($max_zoom > 24) {
    sendSSE(["log" => "<span style='color: red'>ズームレベル $max_zoom が24を超過、最大ズームを24に制限</span>"]);
    $max_zoom = 24;
    sendSSE(["log" => "最大ズームレベルを24に設定"]);
}

// 入力拡張子で GeoTIFF 化
$outputFilePath = $filePath;
$tempOutputPath = null;
$ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
if (in_array($ext, ['jpg', 'jpeg'])) {
    sendSSE(["log" => "JPEG処理開始"]);
    $tempOutputPath = "/tmp/" . $fileName . "_processed.tif";
    $cmd = "$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        . escapeshellarg($outputFilePath) . " " . escapeshellarg($tempOutputPath);
    exec($cmd, $out, $rc);
    if ($rc !== 0 || !file_exists($tempOutputPath)) {
        sendSSE(["error" => "JPEG処理失敗", "details" => implode("\n", (array)$out)], "error"); exit;
    }
    sendSSE(["log" => "JPEG処理完了"]);
    $outputFilePath = $tempOutputPath;
}

// gdal2tiles直前 north-up 保証
$outputFilePath = forceNorthUp($outputFilePath, $sourceEPSG, $fileName);
list($hasGCPsF, $rotXF, $rotYF) = inspectGeoRef($outputFilePath);
sendSSE(["log" => "gdal2tiles直前: hasGCPs=$hasGCPsF rotX=$rotXF rotY=$rotYF"]);

// 画素数予算
$outputFilePath = enforcePixelBudget($outputFilePath, 200_000_000 /* 2億px */, $fileName);

// WEBP 3/4バンドへ
$outputFilePath = ensureWebpBandLayout($outputFilePath, $fileName);

// 透過（edge-only）
if ($transparent === 1) {
    $outputFilePath = applyEdgeAlpha($outputFilePath, $fileName, $nearBlack, $nearWhite, $nb);
} else {
    sendSSE(["log" => "透過処理をスキップ（アルファなし）"]);
}

// 座標取得
sendSSE(["log" => "gdalinfo 実行"]);
exec("$gdalInfo -json " . escapeshellarg($outputFilePath), $gdalOutput, $gdalReturnVar);
if ($gdalReturnVar !== 0) { sendSSE(["error" => "gdalinfo 失敗", "details" => implode("\n", $gdalOutput)], "error"); exit; }
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
if (json_last_error() !== JSON_ERROR_NONE || !$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    sendSSE(["error" => "gdalinfo 解析失敗"], "error"); exit;
}
$upperLeft  = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
sendSSE(["log" => "座標取得完了"]);

// 座標変換
sendSSE(["log" => "座標変換開始"]);
$minCoord = transformCoords($upperLeft[0],  $lowerRight[1], $sourceEPSG);
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1],  $sourceEPSG);
if (!$minCoord || !$maxCoord) { sendSSE(["error" => "座標変換失敗"], "error"); exit; }
$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];
sendSSE(["log" => "座標変換完了: " . json_encode($bbox4326)]);

// 解像度指定があれば採用
$max_zoom = $resolution ?: $max_zoom;

// 出力ディレクトリ等
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$tileDir      = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
$mbTilesPath  = "$tileDir{$fileBaseName}.mbtiles";
$pmTilesPath  = "$tileDir{$fileBaseName}.pmtiles";
$tileURL      = "$BASE_URL$subDir/$fileBaseName/{$fileBaseName}.pmtiles";

// ディレクトリ作成＆権限（括弧修正済み）
if (!is_dir($tileDir) && !mkdir($tileDir, 0775, true)) {
    sendSSE(["error" => "ディレクトリ作成失敗"], "error"); exit;
}
chmod($tileDir, 0775);
@chown($tileDir, 'www-data');
@chgrp($tileDir, 'www-data');
sendSSE(["log" => "タイルディレクトリ作成: $tileDir"]);

// グレースケール判定
$isGray = isGrayscale($outputFilePath);
sendSSE(["log" => "グレースケール: " . ($isGray ? "グレースケール" : "カラー")]);

// WebPタイル生成
sendSSE(["log" => "WebPタイル生成開始"]);
$processes   = 1;
$webpSwitch  = "--webp-quality 90";
$tileCommand = "$gdal2Tiles --tiledriver WEBP -z 0-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes $processes $webpSwitch "
    . escapeshellarg($outputFilePath) . " " . escapeshellarg($tileDir);

// gdal2tiles 実行（逐次ログ）
$process = proc_open($tileCommand, [0 => ["pipe","r"], 1 => ["pipe","w"], 2 => ["pipe","w"]], $pipes);
$output = []; $tileReturnVar = 1;
if (is_resource($process)) {
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    while (!feof($pipes[1]) || !feof($pipes[2])) {
        $stdout = fgets($pipes[1]); $stderr = fgets($pipes[2]);
        if ($stdout && trim($stdout) !== '.') {
            $cleaned = preg_replace('/^\.+|\.+$/', '', trim($stdout));
            if ($cleaned !== '') sendSSE(["log" => $cleaned]);
            $output[] = $cleaned;
        }
        if ($stderr) { $output[] = "[ERROR] " . trim($stderr); }
        usleep(100000);
    }
    fclose($pipes[0]); fclose($pipes[1]); fclose($pipes[2]);
    $tileReturnVar = proc_close($process);
}
if ($tileReturnVar !== 0) {
    sendSSE([
        "error" => "gdal2tiles 失敗",
        "tileCommand" => $tileCommand,
        "details" => implode("\n", $output)
    ], "error");
    exit;
}
sendSSE(["log" => "WebPタイル生成完了"]);

// タイルサイズ調整（200MB上限）
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
if ($max_zoom < $minZoom) { sendSSE(["error" => "最小ズームレベル以下"], "error"); exit; }
sendSSE(["log" => "最終最大ズーム: $max_zoom"]);

// MBTiles生成
sendSSE(["log" => "MBTiles生成開始"]);
$mbTilesCommand = "PYTHONPATH=" . escapeshellarg($pythonPath) . " /var/www/venv/bin/python3 "
    . escapeshellarg($mbUtil) . " --image_format=webp "
    . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath);
exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
if ($mbTilesReturnVar !== 0) {
    sendSSE(["error" => "MBTiles生成失敗", "details" => implode("\n", $mbTilesOutput)], "error"); exit;
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

// クリーンアップ（中間・ソース）
function deleteSourceAndTempFiles($filePath, $tempOutputPath, $transparentPath, $resampledPath = null, $processingFile = null) {
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file !== '.' && $file !== '..' && "$dir/$file" !== $filePath) { @unlink("$dir/$file"); }
    }
    if ($tempOutputPath   && file_exists($tempOutputPath))   @unlink($tempOutputPath);
    if ($transparentPath  && file_exists($transparentPath))  @unlink($transparentPath);
    if ($resampledPath    && file_exists($resampledPath))    @unlink($resampledPath);
    if ($processingFile   && file_exists($processingFile)) { @unlink($processingFile); sendSSE(["log" => "処理中ファイル削除: $processingFile"]); }
}
deleteSourceAndTempFiles($filePath, $tempOutputPath, null, null, $processingFile);
sendSSE(["log" => "元データと中間データ削除"]);

// タイルディレクトリ クリーンアップ（pmtiles 以外削除）
function deleteTileDirContents($tileDir, $fileBaseName) {
    $keep = ["{$fileBaseName}.pmtiles"];
    foreach (scandir($tileDir) as $item) {
        if ($item === '.' || $item === '..' || in_array($item, $keep)) continue;
        $full = rtrim($tileDir, '/').'/'.$item;
        if (is_dir($full)) { exec("rm -rf " . escapeshellarg($full)); }
        elseif (is_file($full)) { @unlink($full); }
    }
}
deleteTileDirContents($tileDir, $fileBaseName);
sendSSE(["log" => "タイルディレクトリクリーンアップ"]);

// PMTilesサイズ
$pmTilesSizeMB = file_exists($pmTilesPath) ? round(filesize($pmTilesPath) / (1024 * 1024), 2) : 0;
sendSSE(["log" => "サイズ: $pmTilesSizeMB MB / 最大ズーム:$max_zoom"]);

// 成功
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
