<?php
// /api/validate_dataset.php
// 申請データセットZIPの自己診断（構成・名前・RDFの最低限チェック）
declare(strict_types=1);
ini_set('display_errors','0'); error_reporting(E_ALL);
header('Content-Type: text/plain; charset=UTF-8');

function fail($m){ http_response_code(400); echo "NG: $m\n"; exit; }
function ok($m){ echo "OK: $m\n"; }
function require_ext($cls,$msg){ if(!class_exists($cls)) fail("$msg not available"); }

require_ext('ZipArchive','ZipArchive');

$tmpZip = null;
if (!empty($_FILES['file']['tmp_name'])) {
    $tmpZip = $_FILES['file']['tmp_name'];
} else {
    $tmpZip = $_GET['file'] ?? '';
}
if (!$tmpZip || !is_file($tmpZip)) fail("ZIPが見つかりません: {$tmpZip}");

$zip = new ZipArchive();
if ($zip->open($tmpZip)!==true) fail('ZIPを開けません');

$names = [];
for($i=0;$i<$zip->numFiles;$i++){ $names[] = $zip->getNameIndex($i); }

$hasExport = in_array('export.xml', $names, true);
$hasInfo   = in_array('info.xml', $names, true);
if(!$hasExport) fail('ルートに export.xml がありません');
if(!$hasInfo)   fail('ルートに info.xml がありません');
ok('ルート: export.xml / info.xml あり');

$subZips = array_values(array_filter($names, fn($n)=>preg_match('/^... .+\.zip$/u',$n)));
if(!$subZips) fail('サブZIP（例: "001 任意名.zip"）がありません');
ok('サブZIP数: '.count($subZips));

foreach($subZips as $sub) {
    // 30文字以内（拡張子含む）
    if (mb_strlen($sub,'UTF-8')>30) fail("サブZIP名が長すぎます: {$sub}");
    // サブZIPをメモリ展開して中身確認
    $stream = $zip->getStream($sub);
    if(!$stream) fail("サブZIPを開けません: {$sub}");
    $tmp = tempnam(sys_get_temp_dir(),'vld_');
    file_put_contents($tmp, stream_get_contents($stream));
    fclose($stream);

    $z2 = new ZipArchive();
    if ($z2->open($tmp)!==true) fail("サブZIP不正: {$sub}");

    // 必須フォルダとファイル
    $needDir = '署名・送信/';
    $hasDir = false; $files2=[];
    for($j=0;$j<$z2->numFiles;$j++){
        $n = $z2->getNameIndex($j);
        $files2[]=$n;
        if (str_starts_with($n,$needDir)) $hasDir=true;
    }
    if(!$hasDir) fail("{$sub} に '署名・送信/' フォルダがありません");

    // 署名・送信/直下に index.rdf と [手続ID].xml
    $rdf = array_values(array_filter($files2, fn($n)=>$n===$needDir.'index.rdf'));
    if(!$rdf) fail("{$sub} の '署名・送信/' に index.rdf がありません");

    // [手続ID].xml 探索
    $mains = array_values(array_filter($files2, fn($n)=>preg_match('#^署名・送信/[A-Za-z0-9]{1,15}\.xml$#',$n)));
    if(!$mains) fail("{$sub} の '署名・送信/' に [手続ID].xml がありません");
    if(count($mains)>1) fail("{$sub} の 本文XML が複数あります: ".implode(', ',$mains));
    $mainXmlName = basename($mains[0]);

    // RDFの中身: DocumentResource(main) で本文を指しているか最低限チェック
    $rdfStream = $z2->getStream($needDir.'index.rdf');
    $rdfBody = $rdfStream ? stream_get_contents($rdfStream) : '';
    if($rdfStream) fclose($rdfStream);
    if(!$rdfBody) fail("{$sub} index.rdf を読めません");

    if (!preg_match('/<DocumentResource[^>]*about="'.preg_quote($mainXmlName,'/').'"/u',$rdfBody)) {
        fail("{$sub} index.rdf の DocumentResource@about が本文名({$mainXmlName})を指していません");
    }
    if (!preg_match('/<DocumentType>\s*main\s*<\/DocumentType>/u',$rdfBody)) {
        fail("{$sub} index.rdf の DocumentType が main ではありません");
    }
    ok("{$sub} OK: 署名・送信/ 配下, index.rdf, {$mainXmlName} の関連あり");

    $z2->close();
    @unlink($tmp);
}
$zip->close();
ok('全サブZIPの検証に成功しました（最小要件クリア）');
