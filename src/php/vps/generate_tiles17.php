<?php
// ===== gdal2tiles 安定化・north-up 強制・省メモリ・白黒同時縁抜き版 =====
// 前提：Imagickは使わない / 近似縁抜きは nearblack 優先、無ければ gdalwarp 2パスで合成
// 旧版(2025-09-15)を土台に：
//  - gdal2tiles 前に EPSG:3857 へは warp しない（回転だけ除去）→ --s_srs に元SRSを渡す
//  - 画素数しきい値は gdalwarp -ts で実行（Imagickなし）
//  - WebPは 3 or 4 band へ正規化（Gray/Gray+Alpha対策）
//  - 白黒同時透過: nearblack -black → -white の 2パス（両方失敗時は gdalwarp 2パス＋srcalpha 合成）
//  - サイズ制限は「重いズーム層から」削除（毎周 clearstatcache）
//  - ディレクトリサイズは .webp のみ集計

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

define("EARTH_RADIUS_M", 6378137);
define("MAX_FILE_SIZE_BYTES", 200000000); // 200MB
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
$logFile  = "/tmp/php_script.log";

// Binaries
$gdalInfo      = "/usr/bin/gdalinfo";
$gdalTranslate = "/usr/bin/gdal_translate";
$gdalWarp      = "/usr/bin/gdalwarp";
$gdal2Tiles    = "/usr/bin/gdal2tiles.py";
$gdalTransform = "/usr/bin/gdaltransform";
$nearblack     = "/usr/bin/nearblack";
$mbUtil        = "/var/www/venv/bin/mb-util";
$goPmTiles     = "/usr/local/bin/go-pmtiles";
$pythonPath    = "/var/www/venv/lib/python3.12/site-packages";

putenv('GDAL_CACHEMAX=512'); // 省メモリ

function sendSSE($data, $event = "message") {
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
    echo "#\n\n";
    flush();
}
function logMessage($m){ global $logFile; file_put_contents($logFile, date("Y-m-d H:i:s")." - $m\n", FILE_APPEND); }
function checkCommand($p,$n){ if(!file_exists($p)||!is_executable($p)){ sendSSE(["error"=>"$n 未インストール","details"=>"Path: $p"],"error"); exit; } }
function checkWebPSupport(){ global $gdalInfo; checkCommand($gdalInfo,"gdalinfo"); exec("$gdalInfo --formats 2>&1 | grep -i WEBP",$o,$r); return !empty($o)&&$r===0; }

function calculateTileDirectorySize($tileDir){
    $tot=0;$cnt=0;
    if(!is_dir($tileDir)) return [0,0];
    $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($tileDir, FilesystemIterator::SKIP_DOTS));
    foreach($it as $f){ if($f->isFile() && strtolower($f->getExtension())==='webp'){ $tot+=$f->getSize(); $cnt++; } }
    return [$tot,$cnt];
}
function perZoomSizes($tileDir){
    $sizes=[];
    for($z=0;$z<=30;$z++){
        $d=rtrim($tileDir,'/')."/$z";
        if(is_dir($d)){
            $bytes=0;
            $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($d, FilesystemIterator::SKIP_DOTS));
            foreach($it as $f){ if($f->isFile() && strtolower($f->getExtension())==='webp'){ $bytes+=$f->getSize(); } }
            $sizes[$z]=$bytes;
        }
    }
    return $sizes;
}
function deleteZoom($tileDir,$z){
    $d=rtrim($tileDir,'/')."/$z/";
    if(is_dir($d)){ exec("rm -rf ".escapeshellarg($d)); return true; }
    return false;
}
function deleteHighestZoomDirectory($tileDir, $z){
    $d=rtrim($tileDir,'/')."/$z/"; if(is_dir($d)){ exec("rm -rf ".escapeshellarg($d)); return true; } return false;
}

function calculateMaxZoom($filePath, $sourceEPSG){
    global $gdalInfo;
    exec("$gdalInfo -json ".escapeshellarg($filePath),$out,$ret);
    $j=json_decode(implode("\n",$out),true);
    if($ret!==0 || !$j || !isset($j["size"]) || !isset($j["geoTransform"])){
        sendSSE(["error"=>"ズーム計算失敗、座標情報なし"],"error"); exit;
    }
    $gt=$j["geoTransform"]; $gsd=max(abs($gt[1]),abs($gt[5]));
    $maxZoom=0;
    for($z=0;$z<=30;$z++){
        $tileRes=(2*M_PI*EARTH_RADIUS_M)/(256*pow(2,$z));
        if($tileRes <= $gsd){ $maxZoom=$z; break; }
    }
    logMessage("Calculated max zoom: $maxZoom (GSD: $gsd m/pixel)");
    sendSSE(["log"=>"計算された最大ズーム: $maxZoom (GSD: $gsd m/pixel)"]);
    return [$maxZoom,$gsd,$j["size"][0],$j["size"][1]];
}
function checkWorldFile($filePath){
    foreach(['tfw','jgw','pgw'] as $ext){
        $wf=preg_replace('/\.[^.]+$/',".$ext",$filePath);
        if(file_exists($wf)){ sendSSE(["log"=>"ワールドファイル確認: $wf"]); return $wf; }
    }
    sendSSE(["log"=>"ワールドファイルが見つかりません"]); return null;
}
function inspectGeoRef($path){
    global $gdalInfo; exec("$gdalInfo -json ".escapeshellarg($path),$out,$ret);
    if($ret!==0) return [true,INF,INF,null];
    $j=json_decode(implode("\n",$out),true);
    $hasGCPs=!empty($j['gcps']); $rx=0.0; $ry=0.0;
    if(isset($j['geoTransform'])){ $gt=$j['geoTransform']; $rx=isset($gt[2])?abs($gt[2]):0.0; $ry=isset($gt[4])?abs($gt[4]):0.0; }
    return [$hasGCPs,$rx,$ry,$j];
}
function forceNorthUp($pathIn,$sourceEPSG,$fileName){
    global $gdalWarp;
    list($has,$rx,$ry)=inspectGeoRef($pathIn);
    $needs=$has || $rx>1e-9 || $ry>1e-9;
    if(!$needs) return $pathIn;
    $out="/tmp/{$fileName}_northup.tif";
    $order=$has ? "-order 1" : "";
    $cmd="$gdalWarp -t_srs EPSG:$sourceEPSG -r bilinear -overwrite -dstalpha -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -co BIGTIFF=IF_SAFER -wo NUM_THREADS=ALL_CPUS $order "
        .escapeshellarg($pathIn)." ".escapeshellarg($out);
    exec($cmd,$wout,$rc);
    if($rc!==0 || !file_exists($out)){ sendSSE(["error"=>"north-up 焼き直し失敗","details"=>implode("\n",(array)$wout)],"error"); exit; }
    list($h2,$rx2,$ry2)=inspectGeoRef($out);
    sendSSE(["log"=>"north-up確認: hasGCPs=$h2 rotX=$rx2 rotY=$ry2"]);
    if($h2||$rx2>1e-9||$ry2>1e-9){ sendSSE(["error"=>"焼き直し後も回転/せん断/GCPが残存"],"error"); exit; }
    return $out;
}
function enforcePixelBudget($pathIn,$maxPixels,$fileName){
    global $gdalInfo,$gdalWarp;
    exec("$gdalInfo -json ".escapeshellarg($pathIn),$out,$ret);
    if($ret!==0) return $pathIn;
    $j=json_decode(implode("\n",$out),true);
    if(!isset($j['size'])) return $pathIn;
    $w=(int)$j['size'][0]; $h=(int)$j['size'][1]; $px=(float)$w*(float)$h;
    if($px <= $maxPixels) return $pathIn;
    $ratio=sqrt($maxPixels/$px); $nw=max(1,(int)round($w*$ratio)); $nh=max(1,(int)round($h*$ratio));
    $outPath="/tmp/{$fileName}_pxbudget.tif";
    $cmd="$gdalWarp -ts $nw $nh -r bilinear -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        .escapeshellarg($pathIn)." ".escapeshellarg($outPath);
    exec($cmd,$logs,$rc);
    if($rc!==0 || !file_exists($outPath)) return $pathIn;
    sendSSE(["log"=>"画素数しきい値で縮小: $w x $h -> $nw x $nh"]);
    return $outPath;
}
function getBandInfo($path){
    global $gdalInfo; exec("$gdalInfo -json ".escapeshellarg($path),$out,$ret);
    if($ret!==0) return [null,[]];
    $j=json_decode(implode("\n",$out),true);
    $bands=$j['bands']??[]; $c=count($bands); $ints=[];
    foreach($bands as $b){ $ints[]=$b['colorInterpretation']??''; }
    sendSSE(["log"=>"BandInfo: count=$c interps=".implode(',',$ints)]);
    return [$c,$ints];
}
function ensureWebpBandLayout($pathIn,$fileName){
    global $gdalTranslate;
    list($c,$ints)=getBandInfo($pathIn);
    if($c===null) return $pathIn;
    if($c===3 || $c===4) return $pathIn;
    $out="/tmp/{$fileName}_webp_rgba.tif";
    if($c===2){
        $cmd="$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -b 1 -b 1 -b 1 -b 2 "
            .escapeshellarg($pathIn)." ".escapeshellarg($out);
        exec($cmd,$l,$rc);
        if($rc===0 && file_exists($out)){ sendSSE(["log"=>"2バンド→RGBAへ正規化"]); return $out; }
        $cmd="$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -b 1 -b 1 -b 1 "
            .escapeshellarg($pathIn)." ".escapeshellarg($out);
        exec($cmd,$l2,$rc2);
        if($rc2===0 && file_exists($out)){ sendSSE(["log"=>"2バンド→RGBへ正規化（FB）"]); return $out; }
        return $pathIn;
    }
    if($c===1){
        $cmd="$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -expand rgb "
            .escapeshellarg($pathIn)." ".escapeshellarg($out);
        exec($cmd,$l,$rc);
        if($rc===0 && file_exists($out)){ sendSSE(["log"=>"1バンド→RGBへ展開"]); return $out; }
        $cmd="$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -b 1 -b 1 -b 1 "
            .escapeshellarg($pathIn)." ".escapeshellarg($out);
        exec($cmd,$l2,$rc2);
        if($rc2===0 && file_exists($out)){ sendSSE(["log"=>"1バンド→RGBへ複写（FB）"]); return $out; }
        return $pathIn;
    }
    $cmd="$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -expand rgb "
        .escapeshellarg($pathIn)." ".escapeshellarg($out);
    exec($cmd,$l,$rc);
    if($rc===0 && file_exists($out)){ sendSSE(["log"=>"パレット等→RGBへ展開"]); return $out; }
    return $pathIn;
}

// ===== 白黒同時縁抜き =====
// nearblack があれば： -black → -white を連続適用（既存alphaを保持しつつ0を追加）
// 無ければ gdalwarp 2パス：1) -srcnodata "0 0 0" -dstalpha → 2) -srcalpha -srcnodata "255 255 255" -dstalpha
function applyEdgeAlphaDual($pathIn,$fileName,$nearBlackVal=16,$nearWhiteVal=16){
    global $nearblack,$gdalWarp;
    $nearB=max(0,(int)$nearBlackVal); $nearW=max(0,(int)$nearWhiteVal);

    // nearblack 2パス
    if(file_exists($nearblack) && is_executable($nearblack)){
        $t1="/tmp/{$fileName}_edge_b.tif"; $out="/tmp/{$fileName}_edge_bw.tif";
        $cmd1="$nearblack -setalpha -black -near $nearB ".escapeshellarg($pathIn)." -o ".escapeshellarg($t1);
        exec($cmd1,$l1,$r1);
        if($r1===0 && file_exists($t1)){
            $cmd2="$nearblack -setalpha -white -near $nearW ".escapeshellarg($t1)." -o ".escapeshellarg($out);
            exec($cmd2,$l2,$r2);
            if($r2===0 && file_exists($out)){
                sendSSE(["log"=>"nearblack により黒/白同時縁抜き（near: $nearB/$nearW）"]);
                return $out;
            }
        }
        // 部分成功でもう一方失敗したら片側だけでも t1 を返す
        if(file_exists($t1)){ sendSSE(["log"=>"nearblack 片側のみ成功（white失敗）。黒のみ適用"]); return $t1; }
    }

    // フォールバック：gdalwarp 2パス合成
    $t1="/tmp/{$fileName}_edge_b.tif"; $out="/tmp/{$fileName}_edge_bw.tif";
    $cmd1="$gdalWarp -srcnodata \"0 0 0\" -dstalpha -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        .escapeshellarg($pathIn)." ".escapeshellarg($t1);
    exec($cmd1,$w1,$r1);
    if($r1!==0 || !file_exists($t1)){ sendSSE(["log"=>"gdalwarp 黒縁アルファ化に失敗。元画像継続"]); return $pathIn; }
    // 2パス目は既存 alpha もマスクとして使う（-srcalpha）、さらに白を nodata にして新たに -dstalpha 生成
    $cmd2="$gdalWarp -srcalpha -srcnodata \"255 255 255\" -dstalpha -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 "
        .escapeshellarg($t1)." ".escapeshellarg($out);
    exec($cmd2,$w2,$r2);
    if($r2===0 && file_exists($out)){ sendSSE(["log"=>"gdalwarp により黒/白同時縁抜き（合成）"]); return $out; }
    sendSSE(["log"=>"白側の合成に失敗。黒のみ適用"]); return $t1;
}

function transformCoords($x,$y,$sourceEPSG,$targetEPSG="4326"){
    global $gdalTransform; checkCommand($gdalTransform,"gdaltransform");
    $cmd="echo ".escapeshellarg("$x $y")." | $gdalTransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd,$o); $c=explode(" ",trim($o[0]??"")); return count($c)>=2?[floatval($c[0]),floatval($c[1])]:null;
}
function isGrayscale($path){
    global $gdalInfo; exec("$gdalInfo -json ".escapeshellarg($path),$o);
    $j=json_decode(implode("\n",$o),true);
    return json_last_error()===JSON_ERROR_NONE && isset($j["bands"]) && count($j["bands"])===1;
}
function cleanTempFiles($fileName){ exec("rm -f /tmp/".escapeshellarg($fileName)."_*.tif"); }

if($_SERVER["REQUEST_METHOD"]!=="POST"){ sendSSE(["error"=>"POSTリクエストのみ"],"error"); exit; }
if(!isset($_POST["file"])||!isset($_POST["dir"])){ sendSSE(["error"=>"ファイルパスまたはディレクトリ未指定"],"error"); exit; }

$filePath=realpath($_POST["file"]);
if(!$filePath||!file_exists($filePath)){ sendSSE(["error"=>"ファイルが存在しません"],"error"); exit; }
sendSSE(["log"=>"ファイル確認: $filePath"]);

$fileName    = isset($_POST["fileName"])?preg_replace('/[^a-zA-Z0-9_-]/','',$_POST["fileName"]):pathinfo($filePath, PATHINFO_FILENAME);
$subDir      = preg_replace('/[^a-zA-Z0-9_-]/','',$_POST["dir"]);
$resolution  = (isset($_POST["resolution"])&&is_numeric($_POST["resolution"])) ? intval($_POST["resolution"]) : null;
$sourceEPSG  = isset($_POST["srs"]) ? preg_replace('/[^0-9]/','',$_POST["srs"]) : "2450";
$transparent = isset($_POST["transparent"]) ? $_POST["transparent"] : "1";
if(!in_array($transparent,["0","1"])){ sendSSE(["error"=>"無効なtransparent値"],"error"); exit; }
$transparent = (int)$transparent;
$edgeNearB   = isset($_POST["nearBlack"])&&is_numeric($_POST["nearBlack"]) ? intval($_POST["nearBlack"]) : 2;
$edgeNearW   = isset($_POST["nearWhite"])&&is_numeric($_POST["nearWhite"]) ? intval($_POST["nearWhite"]) : 2;

sendSSE(["log"=>"パラメータ: fileName=$fileName, subDir=$subDir, transparent=$transparent, nearB=$edgeNearB, nearW=$edgeNearW"]);

$processingFile="/tmp/".pathinfo($filePath,PATHINFO_FILENAME)."_{$subDir}_processing.txt";
file_put_contents($processingFile,"Processing: $filePath for $subDir at ".date("Y-m-d H:i:s"));
chmod($processingFile,0664); @chown($processingFile,'www-data'); @chgrp($processingFile,'www-data');
sendSSE(["log"=>"処理中ファイルを作成: $processingFile"]);

checkCommand($gdalTranslate,"gdal_translate");
checkCommand($gdalWarp,"gdalwarp");
checkCommand($gdal2Tiles,"gdal2tiles.py");
checkCommand($gdalTransform,"gdaltransform");
checkCommand($mbUtil,"mb-util");
checkCommand($goPmTiles,"go-pmtiles");
if(!checkWebPSupport()){ sendSSE(["error"=>"GDALにWebPサポートなし"],"error"); exit; }

$freeSpace=disk_free_space('/tmp');
if($freeSpace===false || $freeSpace/(1024*1024)<1000){ sendSSE(["error"=>"ディスク容量不足"],"error"); exit; }
sendSSE(["log"=>"/tmp 空き容量: ".round($freeSpace/(1024*1024),2)." MB"]);

checkWorldFile($filePath);
cleanTempFiles($fileName); sendSSE(["log"=>"中間ファイル削除"]);

list($max_zoom,$gsd,$width,$height)=calculateMaxZoom($filePath,$sourceEPSG);
if($max_zoom>24){ sendSSE(["log"=>"<span style='color:red'>ズーム $max_zoom が24超過→24に制限</span>"]); $max_zoom=24; }

$outputFilePath=$filePath; $tempOutputPath=null; $transparentPath=null; $resampledPath=null;

$ext=strtolower(pathinfo($filePath,PATHINFO_EXTENSION));
if(in_array($ext,['jpg','jpeg'])){
    sendSSE(["log"=>"JPEG処理開始"]);
    $tempOutputPath="/tmp/{$fileName}_processed.tif";
    $cmd="$gdalTranslate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 ".escapeshellarg($outputFilePath)." ".escapeshellarg($tempOutputPath);
    exec($cmd,$o,$rc); if($rc!==0||!file_exists($tempOutputPath)){ sendSSE(["error"=>"JPEG処理失敗","details"=>implode("\n",(array)$o)],"error"); exit; }
    $outputFilePath=$tempOutputPath; sendSSE(["log"=>"JPEG処理完了"]);
}

// 透過ONならアルファ作成（全面ではなく後段の縁抜きで最終調整）
if($transparent===1){
    $transparentPath="/tmp/{$fileName}_transparent.tif";
    $cmd="$gdalWarp -dstalpha -overwrite -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -wo NUM_THREADS=ALL_CPUS "
        .escapeshellarg($outputFilePath)." ".escapeshellarg($transparentPath);
    exec($cmd,$tlog,$trc); if($trc!==0||!file_exists($transparentPath)){ sendSSE(["error"=>"透過処理失敗","details"=>implode("\n",(array)$tlog)],"error"); exit; }
    $outputFilePath=$transparentPath; sendSSE(["log"=>"透過処理完了"]);
}else{
    sendSSE(["log"=>"透過処理スキップ（アルファなし）"]);
}

// ★ gdal2tiles 直前は「north-up のみ」保証（EPSG は元のまま）
$outputFilePath = forceNorthUp($outputFilePath, $sourceEPSG, $fileName);
list($hasF,$rxF,$ryF)=inspectGeoRef($outputFilePath);
sendSSE(["log"=>"gdal2tiles直前: hasGCPs=$hasF rotX=$rxF rotY=$ryF"]);

// 画素数しきい値（例：2億px）
$outputFilePath = enforcePixelBudget($outputFilePath, 200_000_000, $fileName);

// WebP 3/4 band 正規化
$outputFilePath = ensureWebpBandLayout($outputFilePath, $fileName);

// 白黒同時縁抜き（transparent=1 のとき）
if($transparent===1){
    $outputFilePath = applyEdgeAlphaDual($outputFilePath, $fileName, $edgeNearB, $edgeNearW);
    list($bc,$ints)=getBandInfo($outputFilePath);
    if($bc<4){
        // RGBAへ昇格（Alpha=255生成）
        $tmp="/tmp/{$fileName}_force_rgba.tif";
        $cmd="/usr/bin/gdal_translate -of GTiff -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=2 -b 1 -b 2 -b 3 ".escapeshellarg($outputFilePath)." ".escapeshellarg($tmp);
        exec($cmd,$rl,$rc); if($rc===0 && file_exists($tmp)){ $outputFilePath=$tmp; sendSSE(["log"=>"注意: アルファ欠落→RGBA昇格"]); }
    }
}

sendSSE(["log"=>"gdalinfo 実行"]);
exec("$gdalInfo -json ".escapeshellarg($outputFilePath),$gi,$gr);
if($gr!==0){ sendSSE(["error"=>"gdalinfo 失敗","details"=>implode("\n",$gi)],"error"); exit; }
$j=json_decode(implode("\n",$gi),true);
if(!$j || !isset($j["cornerCoordinates"])){ sendSSE(["error"=>"gdalinfo 解析失敗"],"error"); exit; }
$ul=$j["cornerCoordinates"]["upperLeft"];
$lr=$j["cornerCoordinates"]["lowerRight"];
sendSSE(["log"=>"座標取得完了"]);

sendSSE(["log"=>"座標変換開始"]);
$min=transformCoords($ul[0],$lr[1],$sourceEPSG);
$max=transformCoords($lr[0],$ul[1],$sourceEPSG);
if(!$min||!$max){ sendSSE(["error"=>"座標変換失敗"],"error"); exit; }
$bbox4326=[$min[0],$min[1],$max[0],$max[1]];
sendSSE(["log"=>"座標変換完了: ".json_encode($bbox4326)]);

$max_zoom = $resolution ?: $max_zoom;

// 出力系
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$tileDir      = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
$mbTilesPath  = "$tileDir{$fileBaseName}.mbtiles";
$pmTilesPath  = "$tileDir{$fileBaseName}.pmtiles";
$tileURL      = "$BASE_URL$subDir/$fileBaseName/{$fileBaseName}.pmtiles";

if(!is_dir($tileDir)&&!mkdir($tileDir,0775,true)){ sendSSE(["error"=>"ディレクトリ作成失敗"],"error"); exit; }
chmod($tileDir,0775); @chown($tileDir,'www-data'); @chgrp($tileDir,'www-data');

$isGray = isGrayscale($outputFilePath);
sendSSE(["log"=>"グレースケール: ".($isGray?"グレースケール":"カラー")]);

// gdal2tiles（EPSG:3857 へは事前warpしない／--s_srs に元SRS）
sendSSE(["log"=>"WebPタイル生成開始"]);
$processes  = 1;
$webpSwitch = "--webp-quality 90";
$s_srs_for_tiles = "EPSG:$sourceEPSG";
$tileCommand = "$gdal2Tiles --tiledriver WEBP -z 0-$max_zoom --s_srs ".escapeshellarg($s_srs_for_tiles)." --xyz --processes $processes $webpSwitch "
    .escapeshellarg($outputFilePath)." ".escapeshellarg($tileDir);

$process = proc_open($tileCommand,[0=>["pipe","r"],1=>["pipe","w"],2=>["pipe","w"]],$pipes);
$output=[];
if(is_resource($process)){
    stream_set_blocking($pipes[1],false); stream_set_blocking($pipes[2],false);
    while(!feof($pipes[1]) || !feof($pipes[2])){
        $stdout=fgets($pipes[1]); $stderr=fgets($pipes[2]);
        if($stdout && trim($stdout) !== '.'){ $s=preg_replace('/^\.+|\.+$/','',trim($stdout)); if($s!==''){ sendSSE(["log"=>$s]); $output[]=$s; } }
        if($stderr){ $output[]="[ERROR] ".trim($stderr); }
        usleep(100000);
    }
    fclose($pipes[0]); fclose($pipes[1]); fclose($pipes[2]);
    $tileReturnVar=proc_close($process);
}
if(($tileReturnVar??0)!==0){
    sendSSE(["error"=>"gdal2tiles 失敗","tileCommand"=>$tileCommand,"details"=>implode("\n",$output)],"error"); exit;
}
sendSSE(["log"=>"WebPタイル生成完了"]);

// サイズ制御：重い層から削除
sendSSE(["log"=>"タイルサイズ計算"]);
$minZoom=10;
while(true){
    clearstatcache(true);
    list($total,$nTiles)=calculateTileDirectorySize($tileDir);
    $mb=round($total/(1024*1024),3);
    sendSSE(["log"=>"総サイズ: {$mb} MB ($nTiles タイル)"]);
    if($total<=MAX_FILE_SIZE_BYTES) break;

    $sizes=perZoomSizes($tileDir);
    $candidates=array_filter($sizes,fn($bytes,$z)=>$z>=$minZoom,ARRAY_FILTER_USE_BOTH);
    if(empty($candidates)){ sendSSE(["error"=>"最小ズームレベル以下"],"error"); break; }
    arsort($candidates);
    $zToDrop=array_key_first($candidates);
    $mbz=round($candidates[$zToDrop]/(1024*1024),3);
    sendSSE(["log"=>"サイズ超過、ズーム $zToDrop 削除（{$mbz} MB）"]);
    deleteZoom($tileDir,$zToDrop);
}

// 最終 zmax は残っている最大ディレクトリ
$remaining=array_keys(perZoomSizes($tileDir));
$finalMax = empty($remaining) ? $minZoom : max($remaining);
if($finalMax < $minZoom){ sendSSE(["error"=>"最小ズームレベル以下"],"error"); exit; }
sendSSE(["log"=>"最終最大ズーム: $finalMax"]);

sendSSE(["log"=>"MBTiles生成開始"]);
$mbTilesCommand = "PYTHONPATH=".escapeshellarg($pythonPath)." /var/www/venv/bin/python3 ".escapeshellarg($mbUtil)." --image_format=webp ".escapeshellarg($tileDir)." ".escapeshellarg($mbTilesPath);
exec($mbTilesCommand,$mbOut,$mbRc);
if($mbRc!==0){ sendSSE(["error"=>"MBTiles生成失敗","details"=>implode("\n",$mbOut)],"error"); exit; }
chmod($mbTilesPath,0664); @chown($mbTilesPath,'www-data'); @chgrp($mbTilesPath,'www-data');
sendSSE(["log"=>"MBTiles生成完了"]);

sendSSE(["log"=>"PMTiles生成開始"]);
$pmTilesCommand = "$goPmTiles convert ".escapeshellarg($mbTilesPath)." ".escapeshellarg($pmTilesPath);
exec($pmTilesCommand,$pmOut,$pmRc);
if($pmRc!==0){
    sendSSE(["error"=>"PMTiles生成失敗","details"=>implode("\n",$pmOut),"tileCommand"=>$tileCommand],"error"); exit;
}
chmod($pmTilesPath,0664); @chown($pmTilesPath,'www-data'); @chgrp($pmTilesPath,'www-data');
sendSSE(["log"=>"PMTiles生成完了"]);

// 片付け
function deleteSourceAndTempFiles($filePath,$tempOutputPath,$transparentPath,$resampledPath=null,$processingFile=null){
    $dir=dirname($filePath);
    foreach(scandir($dir) as $f){ if($f!=='.'&&$f!=='..'&&"$dir/$f"!==$filePath){ @unlink("$dir/$f"); } }
    if($tempOutputPath && file_exists($tempOutputPath)) @unlink($tempOutputPath);
    if($transparentPath && file_exists($transparentPath)) @unlink($transparentPath);
    if($resampledPath && file_exists($resampledPath)) @unlink($resampledPath);
    if($processingFile && file_exists($processingFile)){ @unlink($processingFile); sendSSE(["log"=>"処理中ファイル削除: $processingFile"]); }
}
deleteSourceAndTempFiles($filePath,$tempOutputPath,$transparentPath,$resampledPath,$processingFile);
sendSSE(["log"=>"元データと中間データ削除"]);

function deleteTileDirContentsExceptPmtiles($tileDir,$fileBaseName){
    $keep=["{$fileBaseName}.pmtiles"];
    foreach(scandir($tileDir) as $i){
        if($i==='.'||$i==='..'||in_array($i,$keep)) continue;
        $p=rtrim($tileDir,'/').'/'.$i;
        if(is_dir($p)) exec("rm -rf ".escapeshellarg($p)); else @unlink($p);
    }
}
deleteTileDirContentsExceptPmtiles($tileDir,$fileBaseName);

$pmTilesSizeMB = file_exists($pmTilesPath)? round(filesize($pmTilesPath)/(1024*1024),2) : 0;
sendSSE(["log"=>"サイズ: $pmTilesSizeMB MB / 最大ズーム:$finalMax"]);

sendSSE([
    "success"=>true,
    "tiles_url"=>$tileURL,
    "tiles_dir"=>$tileDir,
    "bbox"=>$bbox4326,
    "max_zoom"=>$finalMax,
    "pmtiles_size_mb"=>$pmTilesSizeMB,
    "tileCommand"=>$tileCommand
],"success");
?>
