<?php
declare(strict_types=1);

/**
 * PDF Preview/Export Service
 * - action=open     (POST multipart: file) -> { token, pages, name }
 * - action=thumb    (GET: token,page)   -> low jpeg (144dpi, width=300)  + cache
 * - action=preview  (GET: token,page)   -> mid jpeg (144dpi, width=1200) + cache
 * - action=export   (GET: token,page)   -> hi  jpeg (300dpi)             + cache
 * - GC: 30分アクセスの無い token を掃除
 *
 * 色対策:
 * - use CropBox / interpret ICC / RGB指定 / sRGB固定化 / 透明は白でフラット
 * - 任意でICCプロファイルを適用（環境のパスに合わせて変更）
 */

/* ===== 設定 ===== */
const CACHE_TTL_SEC = 60 * 30;     // token 生存 30分（アクセスで延命）
const BASE_DIR      = 'pdfcache';  // sys_tmp 下のキャッシュディレクトリ
const THUMB_W       = 300;         // サムネ幅
const PREVIEW_W     = 1200;        // プレビュー幅
const PREVIEW_DPI   = 144;         // プレビュー/サムネ DPI
const EXPORT_DPI    = 300;         // 本番出力 DPI
const Q_PREVIEW     = 82;          // プレビュー JPEG 品質
const Q_EXPORT      = 92;          // 本番 JPEG 品質
const MAX_UPLOAD_MB = 25;          // アップロード上限

// ICC プロファイル（必要に応じて環境のパスに変更/空文字で無効化）
const ICC_SRGB = '/usr/share/color/icc/sRGB.icc';
const ICC_CMYK = '/usr/share/color/icc/ghostscript/USWebCoatedSWOP.icc'; // 例

/* ===== 共通ユーティリティ ===== */
ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');

function fail(int $code, string $msg): void {
    http_response_code($code);
    header('Content-Type', 'text/plain; charset=utf-8');
    echo $msg; exit;
}
function json_out(array $obj): void {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}
function ensure_dir(string $dir): void {
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0700, true) && !is_dir($dir)) {
            fail(500, "cannot create dir: $dir");
        }
    }
}
function base_path(): string {
    $tmp = sys_get_temp_dir();
    $base = rtrim($tmp, '/\\') . DIRECTORY_SEPARATOR . BASE_DIR;
    ensure_dir($base);
    return $base;
}
function token_dir(string $token): string {
    return base_path() . DIRECTORY_SEPARATOR . $token;
}
function touch_dir(string $dir): void {
    @touch($dir);
}
function gc_old_tokens(): void {
    $base = base_path();
    $now = time();
    foreach (@glob($base . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR) ?: [] as $dir) {
        $mt = @filemtime($dir) ?: 0;
        if ($now - $mt > CACHE_TTL_SEC) {
            foreach (@glob($dir . DIRECTORY_SEPARATOR . '*') ?: [] as $f) @unlink($f);
            @rmdir($dir);
        }
    }
}
function safe_basename(string $name): string {
    $name = preg_replace('/[^\w\-.]+/u', '_', $name) ?? 'file';
    $name = trim($name, '._- ');
    return $name !== '' ? $name : 'file';
}
function cache_file(string $token, string $kind, int $page): string {
    $dir = token_dir($token) . DIRECTORY_SEPARATOR . $kind;
    ensure_dir($dir);
    return $dir . DIRECTORY_SEPARATOR . "p{$page}.jpg";
}
function send_jpeg(string $bin, string $filename): void {
    header('Content-Type: image/jpeg');
    header('Content-Disposition: inline; filename="'.$filename.'"');
    header('Content-Length: ' . strlen($bin));
    echo $bin; exit;
}
function send_cached(string $path): bool {
    if (!is_file($path)) return false;
    $etag = '"' . md5_file($path) . '"';
    header('ETag: ' . $etag);
    header('Cache-Control: max-age=1800, public');
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
        http_response_code(304); exit;
    }
    $bin = file_get_contents($path);
    send_jpeg($bin, basename($path));
    return true;
}

/* ===== PDF 1ページをJPEGに変換（色対策込み） ===== */
function render_pdf_page(string $pdfPath, int $page1, int $dpi, int $quality, ?int $maxW = null): string {
    if (!extension_loaded('imagick')) fail(500, 'Imagick extension not loaded');
    if (!is_file($pdfPath)) fail(404, 'pdf not found');

    try {
        // リソース制限（大きいPDF対策・必要なら調整）
        try {
            $lim = new Imagick();
            $lim->setResourceLimit(Imagick::RESOURCETYPE_MEMORY, 512 * 1024 * 1024);
            $lim->setResourceLimit(Imagick::RESOURCETYPE_MAP,    1024 * 1024 * 1024);
            $lim->clear(); $lim->destroy();
        } catch (\Throwable $e) {}

        $im = new Imagick();
        // 読み込み前オプション
        $im->setOption('pdf:use-cropbox', 'true');     // CropBox を優先
        $im->setOption('pdf:interpret-icc', 'true');   // ICC を解釈
        $im->setOption('pdf:process-color-model', 'rgb'); // RGBで処理
        $im->setResolution($dpi, $dpi);

        // 0始まり
        $idx = max(0, $page1 - 1);
        $im->readImage(sprintf('%s[%d]', $pdfPath, $idx));

        // ICC プロファイル（CMYK→sRGB 変換）
        try {
            if (ICC_CMYK && is_file(ICC_CMYK)) $im->profileImage('icc', file_get_contents(ICC_CMYK));
            if (ICC_SRGB && is_file(ICC_SRGB)) $im->profileImage('icc', file_get_contents(ICC_SRGB));
        } catch (\Throwable $e) {}

        // 透明→白背景
        if ($im->getImageAlphaChannel()) {
            $im->setImageBackgroundColor('white');
            $im = $im->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
        }

        // sRGB固定・メタ除去
        try { $im->stripImage(); } catch (\Throwable $e) {}
        try { $im->setImageColorspace(Imagick::COLORSPACE_SRGB); } catch (\Throwable $e) {}

        // リサイズ（プレビュー/サムネ用）
        if ($maxW && $maxW > 0) {
            $w = $im->getImageWidth(); $h = $im->getImageHeight();
            if ($w > $maxW) {
                $ratio = $maxW / $w;
                $im->resizeImage((int)($w * $ratio), (int)($h * $ratio), Imagick::FILTER_LANCZOS, 1);
            }
        }

        // JPEG
        $im->setImageFormat('jpeg');
        $im->setImageCompression(Imagick::COMPRESSION_JPEG);
        $im->setImageCompressionQuality($quality);

        $bin = $im->getImagesBlob();
        $im->clear(); $im->destroy();

        if (!$bin) fail(500, 'empty output');
        return $bin;

    } catch (\Throwable $e) {
        $msg = $e->getMessage();
        if (stripos($msg, 'not allowed') !== false || stripos($msg, 'policy') !== false) {
            $msg .= "\nHint: ImageMagick policy.xml が PDF を禁止している可能性があります。";
        }
        fail(500, "imagick error: " . $msg);
    }
}

/* ===== ページ数取得（pingのみ） ===== */
function count_pdf_pages(string $pdfPath): int {
    if (!extension_loaded('imagick')) fail(500, 'Imagick extension not loaded');
    if (!is_file($pdfPath)) fail(404, 'pdf not found');
    $im = new Imagick();
    $im->setOption('pdf:use-cropbox', 'true');
    $im->setResolution(72, 72);
    $im->pingImage($pdfPath);
    $n = $im->getNumberImages();
    $im->clear(); $im->destroy();
    return max(1, (int)$n);
}

/* ===== ルーティング ===== */
gc_old_tokens();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'open') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Method Not Allowed');
    if (empty($_FILES['file']['tmp_name'])) fail(400, 'no file');

    // 上限
    $size = (int)($_FILES['file']['size'] ?? 0);
    if ($size > MAX_UPLOAD_MB * 1024 * 1024) fail(413, 'file too large');

    // MIME（厳密には中身検査）
    $fi = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($fi, $_FILES['file']['tmp_name']);
    finfo_close($fi);

    // token 生成 & 保存
    $token = bin2hex(random_bytes(16));
    $dir = token_dir($token); ensure_dir($dir);
    $pdfPath = $dir . DIRECTORY_SEPARATOR . 'doc.pdf';
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $pdfPath)) {
        if (!copy($_FILES['file']['tmp_name'], $pdfPath)) {
            @rmdir($dir); fail(500, 'failed to store upload');
        }
    }
    touch_dir($dir);

    // ページ数
    $pages = count_pdf_pages($pdfPath);

    // 返答
    $orig = $_FILES['file']['name'] ?? 'document.pdf';
    $base = safe_basename(pathinfo($orig, PATHINFO_FILENAME) ?: 'document');

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['token'=>$token,'pages'=>$pages,'name'=>$base], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

    // レスポンスを即確定し、裏でサムネ全生成（温め）
    if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); }

    try {
        for ($i = 1; $i <= $pages; $i++) {
            $thumbPath = cache_file($token, 'thumb', $i);
            if (is_file($thumbPath)) continue;
            $bin = render_pdf_page($pdfPath, $i, PREVIEW_DPI, Q_PREVIEW, THUMB_W);
            file_put_contents($thumbPath, $bin);
            touch_dir($dir); // TTL延長
        }
    } catch (\Throwable $e) { /* 無視 */ }
    exit;
}

elseif ($action === 'thumb' || $action === 'preview' || $action === 'export') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') fail(405, 'Method Not Allowed');

    $token = $_GET['token'] ?? '';
    $page  = max(1, (int)($_GET['page'] ?? 1));
    if ($token === '') fail(400, 'missing token');

    $dir = token_dir($token);
    $pdfPath = $dir . DIRECTORY_SEPARATOR . 'doc.pdf';
    if (!is_dir($dir) || !is_file($pdfPath)) fail(404, 'token expired or not found');
    touch_dir($dir); // keep alive

    if ($action === 'thumb') {
        $path = cache_file($token, 'thumb', $page);
        if (!send_cached($path)) {
            $bin = render_pdf_page($pdfPath, $page, PREVIEW_DPI, Q_PREVIEW, THUMB_W);
            @file_put_contents($path, $bin);
            send_jpeg($bin, "p{$page}-thumb.jpg");
        }
    } elseif ($action === 'preview') {
        $path = cache_file($token, 'preview', $page);
        if (!send_cached($path)) {
            $bin = render_pdf_page($pdfPath, $page, PREVIEW_DPI, Q_PREVIEW, PREVIEW_W);
            @file_put_contents($path, $bin);
            send_jpeg($bin, "p{$page}-preview.jpg");
        }
    } else { // export
        $path = cache_file($token, 'export', $page);
        if (!send_cached($path)) {
            $bin = render_pdf_page($pdfPath, $page, EXPORT_DPI, Q_EXPORT, null);
            @file_put_contents($path, $bin);
            send_jpeg($bin, "p{$page}.jpg");
        }
    }
}

else {
    fail(400, 'invalid action');
}
