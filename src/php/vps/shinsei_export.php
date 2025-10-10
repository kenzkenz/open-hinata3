<?php
// /api/shinsei_export.php
// FormData 受け取り → 申請データセットZIP生成 → 即ダウンロード返却（保存しない）
// PHP 8+ / ZipArchive
declare(strict_types=1);
ini_set('display_errors','0'); error_reporting(E_ALL);

// ===== 設定 =====
$baseUploadDir = "/var/www/html/public_html/uploads/"; // ユーザーごとに作業する親

// ===== 共通関数 =====
function send_error(string $msg, int $code=400): void {
    http_response_code($code);
    header('Content-Type: text/plain; charset=UTF-8');
    echo $msg; exit;
}
function xml(string $s): string {
    return htmlspecialchars($s, ENT_XML1|ENT_QUOTES, 'UTF-8');
}
function cleanup_dir(string $path): void {
    if (!is_dir($path)) return;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) { $f->isDir() ? @rmdir($f->getRealPath()) : @unlink($f->getRealPath()); }
    @rmdir($path);
}
function zip_dir(string $dir, string $zipPath): void {
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE|ZipArchive::OVERWRITE) !== true) {
        throw new RuntimeException('Zip open failed: '.$zipPath);
    }
    $dir = rtrim($dir, '/\\');
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $file) {
        $full = $file->getRealPath();
        $local = substr($full, strlen($dir)+1);
        if ($file->isDir()) $zip->addEmptyDir($local);
        else $zip->addFile($full, $local);
    }
    $zip->close();
}
// サブZIP名（拡張子 .zip を含めて 30 バイト以内に収める）
function build_subzip_name(string $no3, string $safeTitle): string {
    $base = "{$no3} {$safeTitle}";
    $maxBytes = 30 - 4; // ".zip" を除いた最大バイト数
    // mb_strcut でバイト長ベースに安全に切る
    if (strlen($base) > $maxBytes) {
        $base = rtrim(mb_strcut($base, 0, $maxBytes, 'UTF-8'));
    }
    return $base . '.zip';
}

// ===== 入力検証（FormData）=====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: POST'); send_error('Method Not Allowed', 405); }
if (!class_exists('ZipArchive')) send_error('ZipArchive not available', 500);

// dir
$rawDir = $_POST['dir'] ?? $_GET['dir'] ?? 'default';
$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$rawDir);
if ($subDir === '' || $subDir === null) $subDir = 'default';

// payload(JSON)
$payload = $_POST['payload'] ?? '';
if ($payload === '' && !empty($_FILES['payload']['tmp_name'])) {
    $payload = file_get_contents($_FILES['payload']['tmp_name']);
}
$req = json_decode($payload, true);
if (!is_array($req)) send_error('Bad Request: payload(JSON) expected');
$apps = $req['applications'] ?? null;
if (!is_array($apps) || !$apps) send_error('Bad Request: applications[] required');

// ===== ユーザー別作業ディレクトリ =====
$uploadDir = rtrim($baseUploadDir, '/').'/'.$subDir.'/';
if (!is_dir($uploadDir)) {
    if (!@mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
        send_error("ディレクトリの作成に失敗しました: {$uploadDir}", 500);
    }
}
$work = rtrim($uploadDir, '/').'/work_'.bin2hex(random_bytes(6));
@mkdir($work, 0775, true);
if (!is_dir($work)) send_error("作業ディレクトリ作成失敗: {$work}", 500);

// ===== 本体処理 =====
$exportItems = [];
try {
    $no = 1;
    foreach ($apps as $app) {
        $no3    = str_pad((string)$no, 3, '0', STR_PAD_LEFT); // 001..999
        $title  = trim((string)($app['title'] ?? ("application_{$no3}")));
        // タイトルの危険文字除去
        $safeTitle = preg_replace('/[\\x00-\\x1F\\x7F<>:"\\\\|?*]/u', '', $title);
        if ($safeTitle === '') $safeTitle = "application_{$no3}";

        // サブZIP名（30バイト以内）
        $subZipName = build_subzip_name($no3, $safeTitle);
        $subZipPath = "{$work}/{$subZipName}";

        // 手続ID（半角英数15）
        $pid = substr(preg_replace('/[^A-Za-z0-9]/', '', (string)($app['procedureId'] ?? "PROC{$no3}")), 0, 15);
        if ($pid === '') $pid = "PROC{$no3}";

        // サブZIPの中身フォルダ = 「署名・送信」
        $subRoot = "{$work}/" . pathinfo($subZipName, PATHINFO_FILENAME);
        $sigDir  = "{$subRoot}/署名・送信";
        @mkdir($sigDir, 0775, true);                 // 署名・送信/
        @mkdir("{$sigDir}/添付ファイル", 0775, true); // 添付（空でOK）

        // index.rdf（UTF-8, DocumentResource で本文指定）
        file_put_contents("{$sigDir}/index.rdf", build_index_rdf($pid));

        // [手続ID].xml（最小骨）
        file_put_contents("{$sigDir}/{$pid}.xml", build_procedure_xml($app, $pid));

        // サブZIP化（「NNN タイトル.zip」の中に 署名・送信/ ...）
        zip_dir($subRoot, $subZipPath);

        $exportItems[] = ['zipName'=>basename($subZipPath)];
        $no++;
    }

    // ルート直下 export.xml / info.xml
    file_put_contents("{$work}/export.xml", build_export_xml($exportItems));
    file_put_contents("{$work}/info.xml",   build_info_xml($apps));

    // 最終ZIP（保存せず返却）
    $final = "{$work}/shinsei-export.zip";
    zip_dir($work, $final);

    // 出力
    while (ob_get_level() > 0) { @ob_end_clean(); }
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="shinsei-export.zip"');
    header('Content-Length: '.filesize($final));
    readfile($final);

} catch (Throwable $e) {
    while (ob_get_level() > 0) { @ob_end_clean(); }
    send_error('Internal Error: '.$e->getMessage(), 500);
} finally {
    // 保存なし方針：必ず掃除
    cleanup_dir($work);
}

// ===== ビルダ =====

// RDF: 本文XMLを main として宣言（UTF-8）
function build_index_rdf(string $pid): string {
    $file = xml("{$pid}.xml");
    return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <DocumentResource rdf:about="{$file}">
    <DocumentType>main</DocumentType>
    <Title>{$file}</Title>
  </DocumentResource>
</rdf:RDF>
XML;
}

// 申請様式（表題・最小骨。後で正式スキーマに差し替え可能）
function build_procedure_xml(array $app, string $pid): string {
    $dest      = xml((string)($app['destOfficeCode'] ?? ''));
    $applicant = xml((string)($app['applicant']['name'] ?? ''));
    $parcels   = $app['parcels'] ?? [];

    $parcelsXml = '';
    foreach ($parcels as $p) {
        $todofuken   = xml((string)($p['todofuken']   ?? ''));
        $shikuchoson = xml((string)($p['shikuchoson'] ?? ''));
        $ooaza       = xml((string)($p['ooaza']       ?? ''));
        $chiban      = xml((string)($p['chiban']      ?? ''));
        if (!$todofuken || !$shikuchoson || !$chiban) continue;
        $parcelsXml .= "    <Parcel><Pref>{$todofuken}</Pref><City>{$shikuchoson}</City><Oaza>{$ooaza}</Oaza><Chiban>{$chiban}</Chiban></Parcel>\n";
    }

    $pidEsc = xml($pid);
    $genAt  = xml(date('c'));
    return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<Application procedureId="{$pidEsc}">
  <Destination officeCode="{$dest}"/>
  <Applicant><Name>{$applicant}</Name></Applicant>
  <Objects>
{$parcelsXml}  </Objects>
  <Meta>
    <GeneratedBy>OH3</GeneratedBy>
    <GeneratedAt>{$genAt}</GeneratedAt>
  </Meta>
</Application>
XML;
}

// ルート export.xml（総合ソフト取り込み互換：<Export><Files><File name="..."/>）
function build_export_xml(array $items): string {
    $rows = '';
    foreach ($items as $it) {
        $zip = xml((string)$it['zipName']);
        $rows .= '    <File name="'.$zip.'" />' . "\r\n";
    }
    $body = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<Export>
  <Files>
$rows  </Files>
</Export>
XML;
    // Windows互換のため CRLF に統一（BOMなし）
    return str_replace("\n", "\r\n", $body);
}

// ルート info.xml（最小メタ：任意）
function build_info_xml(array $apps): string {
    $count = count($apps);
    $body = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<ExportInfo>
  <ApplicationCount>{$count}</ApplicationCount>
  <Note>OH3 minimal export</Note>
</ExportInfo>
XML;
    return str_replace("\n", "\r\n", $body);
}
