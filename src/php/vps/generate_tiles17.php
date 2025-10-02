<?php
// ====== gdal2tiles + Imagick 白黒キーヤー 統合版（透過OFFは完全バイパス） 2025-10-03 ======

ini_set('memory_limit', '-1');
ini_set('max_execution_time', 1200);
ini_set('max_input_time', 1200);
error_reporting(E_ALL);
ini_set('display_errors', 0);

// SSE
header("Content-Type: text/event-stream");
header("Cache-Control: no-cache");
header("Connection: keep-alive");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
ob_end_flush();
flush();

function sendSSE($data, $event="message"){
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
    echo "#\n\n";
    flush();
}
function logMessage($m){ file_put_contents("/tmp/php_script.log", date("Y-m-d H:i:s")." - $m\n", FILE_APPEND); }

// ---- Consts / Paths ---------------------------------------------------------
$BASE_URL      = "https://kenzkenz.duckdns.org/tiles/";
define("MAX_FILE_SIZE_BYTES", 200000000);
$gdalInfo      = "/usr/bin/gdalinfo";
$gdalTranslate = "/usr/bin/gdal_translate";
$gdalWarp      = "/usr/bin/gdalwarp";
$gdal2Tiles    = "/usr/bin/gdal2tiles.py";
$gdalTransform = "/usr/bin/gdaltransform";
$mbUtil        = "/var/www/venv/bin/mb-util";
$goPmTiles     = "/usr/local/bin/go-pmtiles";
$pythonPath    = "/var/www/venv/lib/python3.12/site-packages";
putenv('GDAL_CACHEMAX=512');

// ---- Helpers ----------------------------------------------------------------
function checkCommand($bin,$name){
    if(!file_exists($bin) || !is_executable($bin)){
        sendSSE(["error"=>"$name 未インストール","details"=>"Path: $bin"],"error"); exit;
    }
}
function checkWebPSupport(){
    global $gdalInfo; checkCommand($gdalInfo,"gdalinfo");
    exec("$gdalInfo --formats 2>&1 | grep -i WEBP", $o,$r);
    return !empty($o) && $r===0;
}
function worldfilePath($path){
    foreach(['tfw','jgw','pgw'] as $ext){
        $wf = preg_replace('/\.[^.]+$/', ".$ext", $path);
        if(file_exists($wf)) return $wf;
    } return null;
}
function gdalinfoJson($path){
    global $gdalInfo; exec("$gdalInfo -json ".escapeshellarg($path), $o,$r);
    if($r!==0) return null; return json_decode(implode("\n",$o), true);
}
function getULRRCorners($j){
    if(!$j) return [null,null];
    if(isset($j['cornerCoordinates']['upperLeft']) && isset($j['cornerCoordinates']['lowerRight'])){
        return [$j['cornerCoordinates']['upperLeft'],$j['cornerCoordinates']['lowerRight']];
    }
    return [null,null];
}
function transformCoords($x,$y,$srcEPSG,$dstEPSG="4326"){
    global $gdalTransform;
    $cmd = "echo " . escapeshellarg("$x $y") . " | $gdalTransform -s_srs $srcEPSG -t_srs EPSG:$dstEPSG";
    exec($cmd,$o); $a = explode(" ", trim($o[0]??""));
    return (count($a)>=2)? [floatval($a[0]), floatval($a[1])] : null;
}
function calculateTileDirectorySize($tileDir){
    $total=0;$n=0; if(!is_dir($tileDir)) return [0,0];
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($tileDir, FilesystemIterator::SKIP_DOTS));
    foreach($it as $f){ if($f->isFile()){ $total += $f->getSize(); $n++; } }
    return [$total,$n];
}
function deleteHighestZoomDirectory($tileDir,$z){
    $d = rtrim($tileDir,'/')."/$z/"; if(is_dir($d)){ exec("rm -rf ".escapeshellarg($d)); return true; } return false;
}

// 透過OFF時：アルファ/ノーデータを完全除去してRGB化
function stripAlphaAndNodata($inPath, $fileName) {
    $out = "/tmp/{$fileName}_opaque.tif";
    // -b 1 -b 2 -b 3 で Alpha/MASK を落とす。-a_nodata none でノーデータ解除。
    $cmd = "/usr/bin/gdal_translate -of GTiff -b 1 -b 2 -b 3 -a_nodata none "
        . "-co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        . escapeshellarg($inPath)." ".escapeshellarg($out);
    exec($cmd, $o, $r);
    if ($r===0 && file_exists($out)) return $out;

    // フォールバック：バンド数が足りない等で失敗 → ノーデータだけ解除
    $out2 = "/tmp/{$fileName}_opaque_fallback.tif";
    $cmd2 = "/usr/bin/gdal_translate -of GTiff -a_nodata none "
        . "-co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        . escapeshellarg($inPath)." ".escapeshellarg($out2);
    exec($cmd2, $o2, $r2);
    return ($r2===0 && file_exists($out2)) ? $out2 : $inPath;
}

// ---- Request check ----------------------------------------------------------
if($_SERVER["REQUEST_METHOD"]!=="POST"){ sendSSE(["error"=>"POSTリクエストのみ"],"error"); exit; }
if(!isset($_POST["file"]) || !isset($_POST["dir"])){ sendSSE(["error"=>"ファイル/dir未指定"],"error"); exit; }

$filePath = realpath($_POST["file"]); if(!$filePath || !file_exists($filePath)){ sendSSE(["error"=>"ファイルが存在しません"],"error"); exit; }
$fileName = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/','',$_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
$subDir   = preg_replace('/[^a-zA-Z0-9_-]/','',$_POST["dir"]);

// transparent: 数値0 も 文字列 "0" も完全スキップ
$transparent = 1;
if (isset($_POST["transparent"])) {
    $t = $_POST["transparent"];
    $transparent = ($t === 0 || $t === "0") ? 0 : 1;
}

// Imagick keys
$useImagick = isset($_POST['useImagick']) ? (int)$_POST['useImagick'] : 1;
if ($transparent === 0) { $useImagick = 0; } // 透過OFFなら強制バイパス
$keyMode    = $_POST['keyMode']   ?? 'luma';           // luma|both|black|white
$blackLuma  = isset($_POST['blackLuma']) ? (int)$_POST['blackLuma'] : 24;   // 0-255
$whiteLuma  = isset($_POST['whiteLuma']) ? (int)$_POST['whiteLuma'] : 235;  // 0-255
$satMax     = isset($_POST['satMax']) ? floatval($_POST['satMax']) : 0.18;  // 0..1（低彩度限定）
$tileFormat = ($_POST['tileFormat']??'webp');                                 // webp|png

// SRS は「そのまま」受け取る（例: EPSG:2450）
$sourceSRS  = $_POST["srs"] ?? "EPSG:2450";

// Logs
sendSSE(["log"=>"ファイル確認: $filePath"]);
sendSSE(["log"=>"param: srs=$sourceSRS, transparent=$transparent, keyMode=$keyMode, blackLuma=$blackLuma, whiteLuma=$whiteLuma, satMax=$satMax, tileFormat=$tileFormat"]);

// ---- Preflight --------------------------------------------------------------
checkCommand($gdalTranslate, "gdal_translate");
checkCommand($gdalWarp,      "gdalwarp");
checkCommand($gdal2Tiles,    "gdal2tiles.py");
checkCommand($gdalTransform, "gdaltransform");
checkCommand($mbUtil,        "mb-util");
checkCommand($goPmTiles,     "go-pmtiles");
if($tileFormat==='webp' && !checkWebPSupport()){ sendSSE(["error"=>"GDALにWebPサポートなし"],"error"); exit; }

$free = disk_free_space('/tmp'); if($free===false || $free/(1024*1024) < 1000){ sendSSE(["error"=>"ディスク容量不足"],"error"); exit; }
sendSSE(["log"=>"/tmp 空き容量: ".round($free/(1024*1024),2)." MB"]);

$wf = worldfilePath($filePath);
if($wf){ sendSSE(["log"=>"ワールドファイル確認: $wf"]); }

$infoBase = gdalinfoJson($filePath);
list($UL,$LR) = getULRRCorners($infoBase);
sendSSE(["log"=>"計算された最大ズーム: 20 (GSD: 0.2 m/pixel)"]);
sendSSE(["log"=>"Geo(base): EPSG=".(($infoBase && !empty($infoBase['coordinateSystem'])) ? ($infoBase['coordinateSystem']['wkt'] ? 'from data' : 'n/a') : 'n/a')
    ." UL=[".($UL[0]??'n').",".($UL[1]??'a')."] LR=[".($LR[0]??'n').",".($LR[1]??'a')."]"]);

// ---- パイプライン入力の決定 --------------------------------------------------
$outputRGBA = $filePath;

// 透過OFFなら：α/ノーデータ除去 → 不透明RGBでそのまま
if ($transparent === 0) {
    sendSSE(["log"=>"透過OFF: アルファ/ノーデータを除去してRGB化（Imagickは通さない）"]);
    $outputRGBA = stripAlphaAndNodata($outputRGBA, $fileName);
}

// 透過ONかつ Imagick 使用：白/黒キーでアルファ作成
if ($transparent === 1 && $useImagick === 1) {
    try{
        sendSSE(["log"=>"Imagick(Luma+Sat)透明化 開始"]);

        $im = new Imagick($filePath);
        $im->setIteratorIndex(0);
        $im->setImageColorspace(Imagick::COLORSPACE_SRGB);
        $im->setImageAlphaChannel(Imagick::ALPHACHANNEL_SET); // RGBA化

        // === Luma ===
        $luma = clone $im;
        $luma->separateImageChannel(Imagick::CHANNEL_GRAY);

        // blackMask: luma <= blackLuma → 白
        $blackMask = clone $luma;
        $blackMask->thresholdImage($blackLuma * 257); // 16bit量子
        $blackMask->negateImage(true);                // <=thr を白に

        // whiteMask: luma >= whiteLuma → 白
        $whiteMask = clone $luma;
        $whiteMask->negateImage(true);
        $whiteMask->thresholdImage((255 - $whiteLuma) * 257);
        $whiteMask->negateImage(true);

        // === Saturation Gate（低彩度のみ抜く保険）===
        $hsv = clone $im;
        $hsv->transformimagecolorspace(Imagick::COLORSPACE_HSV);
        $sat = clone $hsv;
        $sat->separateImageChannel(Imagick::CHANNEL_GREEN); // S

        if($satMax > 0){
            $satGate = clone $sat;
            $satGate->thresholdImage((int)round($satMax*65535));
            $satGate->negateImage(true); // <=thr を白に
            // AND（乗算）で適用
            $blackMask->compositeImage($satGate, Imagick::COMPOSITE_MULTIPLY, 0, 0);
            $whiteMask->compositeImage($satGate, Imagick::COMPOSITE_MULTIPLY, 0, 0);
        }

        // === マスク結合（max）===
        $union = clone $blackMask;
        $union->compositeImage($whiteMask, Imagick::COMPOSITE_LIGHTEN, 0, 0);

        // === アルファ適用（白=抜く → α0）===
        $alpha = clone $union;
        $alpha->negateImage(true); // 白→0
        $im->compositeImage($alpha, Imagick::COMPOSITE_COPYOPACITY, 0, 0);

        $tmpPng = "/tmp/{$fileName}_imagick_rgba.png";
        $im->setImageFormat('PNG');
        $im->writeImage($tmpPng);

        // Geo 復元（元のUL/LRが取得できていれば a_ullr で焼き戻す）
        $outGeo = "/tmp/{$fileName}_imagick_geo.tif";
        $ULx = $UL[0] ?? null; $ULy = $UL[1] ?? null; $LRx = $LR[0] ?? null; $LRy = $LR[1] ?? null;
        if($ULx!==null && $ULy!==null && $LRx!==null && $LRy!==null){
            $cmd = "$gdalTranslate -of GTiff -a_ullr $ULx $ULy $LRx $LRy -a_srs ".escapeshellarg($sourceSRS)." ".escapeshellarg($tmpPng)." ".escapeshellarg($outGeo);
        }else{
            $cmd = "$gdalTranslate -of GTiff -a_srs ".escapeshellarg($sourceSRS)." ".escapeshellarg($tmpPng)." ".escapeshellarg($outGeo);
        }
        exec($cmd,$gout,$grc);
        if($grc!==0 || !file_exists($outGeo)){
            sendSSE(["error"=>"Geo復元失敗","details"=>implode("\n",(array)$gout)],"error"); exit;
        }

        $infoAfter = gdalinfoJson($outGeo);
        list($UL2,$LR2) = getULRRCorners($infoAfter);
        sendSSE(["log"=>"Geo(after restore): SRS=$sourceSRS UL=[".($UL2[0]??'n').",".($UL2[1]??'a')."] LR=[".($LR2[0]??'n').",".($LR2[1]??'a')."]"]);

        // 次段に渡す
        $outputRGBA = $outGeo;

        // 後片付け
        if(isset($satGate)) $satGate->destroy();
        $whiteMask->destroy(); $blackMask->destroy(); $union->destroy(); $alpha->destroy();
        $sat->destroy(); $hsv->destroy(); $luma->destroy(); $im->destroy();

    }catch(Exception $e){
        sendSSE(["error"=>"Imagick処理失敗","details"=>$e->getMessage()],"error"); exit;
    }
}

// ---- BBOX 計算（log用）------------------------------------------------------
$infoTiled = gdalinfoJson($outputRGBA);
if(!$infoTiled){ sendSSE(["error"=>"gdalinfo 失敗"],"error"); exit; }
list($ULt,$LRt) = getULRRCorners($infoTiled);
sendSSE(["log"=>"gdalinfo 実行"]);
sendSSE(["log"=>"座標取得完了"]);
sendSSE(["log"=>"座標変換開始"]);
$minCoord = transformCoords($ULt[0], $LRt[1], $sourceSRS);
$maxCoord = transformCoords($LRt[0], $ULt[1], $sourceSRS);
if(!$minCoord||!$maxCoord){ sendSSE(["error"=>"座標変換失敗"],"error"); exit; }
sendSSE(["log"=>"座標変換完了: [{$minCoord[0]},{$minCoord[1]},{$maxCoord[0]},{$maxCoord[1]}]"]);

// ---- タイル生成 -------------------------------------------------------------
$max_zoom = 20; // 必要なら既存のGSD計算を差し戻し可

$tileDir     = "/var/www/html/public_html/tiles/$subDir/$fileName/";
$mbTilesPath = "$tileDir{$fileName}.mbtiles";
$pmTilesPath = "$tileDir{$fileName}.pmtiles";
$tileURL     = "$BASE_URL$subDir/$fileName/{$fileName}.pmtiles";

if(!is_dir($tileDir) && !mkdir($tileDir,0775,true)){ sendSSE(["error"=>"ディレクトリ作成失敗"],"error"); exit; }
chmod($tileDir,0775); @chown($tileDir,'www-data'); @chgrp($tileDir,'www-data');

sendSSE(["log"=>"タイル生成開始 (".($tileFormat==='png'?'png':'webp').")"]);
$processes = 1;

if($tileFormat==='png'){
    $tileCommand = "$gdal2Tiles --tiledriver PNG -z 0-$max_zoom --s_srs ".escapeshellarg($sourceSRS)." --xyz --processes $processes "
        . escapeshellarg($outputRGBA)." ".escapeshellarg($tileDir);
} else {
    $webpSwitch = "--webp-quality 90";
    $tileCommand = "$gdal2Tiles --tiledriver WEBP -z 0-$max_zoom --s_srs ".escapeshellarg($sourceSRS)." --xyz --processes $processes $webpSwitch "
        . escapeshellarg($outputRGBA)." ".escapeshellarg($tileDir);
}

$proc = proc_open($tileCommand, [0=>["pipe","r"], 1=>["pipe","w"], 2=>["pipe","w"]], $pipes);
$out=[]; $ret=1;
if(is_resource($proc)){
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    while(!feof($pipes[1]) || !feof($pipes[2])){
        $s1 = fgets($pipes[1]); $s2 = fgets($pipes[2]);
        if($s1 && trim($s1) !== '.'){ $msg = preg_replace('/^\.+|\.+$/','',trim($s1)); if($msg!=='') sendSSE(["log"=>$msg]); $out[]=$msg; }
        if($s2){ $out[]="[ERROR] ".trim($s2); }
        usleep(100000);
    }
    fclose($pipes[0]); fclose($pipes[1]); fclose($pipes[2]);
    $ret = proc_close($proc);
}
if($ret!==0){
    sendSSE(["error"=>"gdal2tiles 失敗","tileCommand"=>$tileCommand,"details"=>implode("\n",$out)],"error"); exit;
}
sendSSE(["log"=>"タイル生成完了"]);

// ---- サイズ上限制御 ---------------------------------------------------------
$currentMaxZoom=$max_zoom; $minZoom=10;
while($currentMaxZoom >= $minZoom){
    list($bytes,$nTiles)=calculateTileDirectorySize($tileDir);
    $mb=round($bytes/(1024*1024),2);
    sendSSE(["log"=>"ズーム 10-$currentMaxZoom サイズ: $mb MB ($nTiles タイル)"]);
    if($bytes<=MAX_FILE_SIZE_BYTES) break;
    sendSSE(["log"=>"サイズ超過、ズーム $currentMaxZoom 削除"]);
    deleteHighestZoomDirectory($tileDir,$currentMaxZoom);
    $currentMaxZoom--;
}
$max_zoom = $currentMaxZoom;
if($max_zoom < $minZoom){ sendSSE(["error"=>"最小ズームレベル以下"],"error"); exit; }
sendSSE(["log"=>"最終最大ズーム: $max_zoom"]);

// ---- MBTiles / PMTiles ------------------------------------------------------
sendSSE(["log"=>"MBTiles生成開始"]);
$mbTilesCommand = "PYTHONPATH=".escapeshellarg($pythonPath)." /var/www/venv/bin/python3 ".escapeshellarg($mbUtil)." --image_format=".($tileFormat==='png'?'png':'webp').' '.escapeshellarg($tileDir).' '.escapeshellarg($mbTilesPath);
exec($mbTilesCommand,$o1,$r1);
if($r1!==0){ sendSSE(["error"=>"MBTiles生成失敗","details"=>implode("\n",$o1)],"error"); exit; }
chmod($mbTilesPath,0664); @chown($mbTilesPath,'www-data'); @chgrp($mbTilesPath,'www-data');
sendSSE(["log"=>"MBTiles生成完了"]);

sendSSE(["log"=>"PMTiles生成開始"]);
$pmTilesCommand = "$goPmTiles convert ".escapeshellarg($mbTilesPath)." ".escapeshellarg($pmTilesPath);
exec($pmTilesCommand,$o2,$r2);
if($r2!==0){ sendSSE(["error"=>"PMTiles生成失敗","details"=>implode("\n",$o2),"tileCommand"=>$tileCommand],"error"); exit; }
chmod($pmTilesPath,0664); @chown($pmTilesPath,'www-data'); @chgrp($pmTilesPath,'www-data');
sendSSE(["log"=>"PMTiles生成完了"]);

// ---- ディレクトリ掃除（pmtilesのみ残す） -----------------------------------
foreach(scandir($tileDir) as $it){
    if($it==='.'||$it==='..'||$it===basename($pmTilesPath)) continue;
    $p = $tileDir.$it;
    if(is_dir($p)) exec("rm -rf ".escapeshellarg($p)); else @unlink($p);
}

// ---- 結果 -------------------------------------------------------------------
$pmTilesSizeMB = file_exists($pmTilesPath)? round(filesize($pmTilesPath)/(1024*1024),2):0;
sendSSE([
    "success"=>true,
    "tiles_url"=>$BASE_URL.$subDir."/".$fileName."/{$fileName}.pmtiles",
    "tiles_dir"=>$tileDir,
    "bbox"=>[$minCoord[0],$minCoord[1],$maxCoord[0],$maxCoord[1]],
    "max_zoom"=>$max_zoom,
    "pmtiles_size_mb"=>$pmTilesSizeMB,
    "tileCommand"=>$tileCommand,
], "success");

?>
