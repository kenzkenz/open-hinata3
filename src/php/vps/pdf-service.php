<?php
declare(strict_types=1);

/**
 * PDF Preview/Export Service
 * - action=open     (POST multipart: file) -> { token, pages, name }
 * - action=thumb    (GET: token,page)      -> low  jpeg (144dpi, width=300)   + cache
 * - action=preview  (GET: token,page)      -> mid  jpeg (144dpi, width=1200)  + cache
 * - action=export   (GET: token,page)      -> high jpeg (300dpi)              + cache
 * - GC: 30分アクセスの無い token を掃除
 *
 * 色対策（地図PDFなど向け）:
 * 1) MuPDF(mutool) で RGB 化（スポット色/OP/透明の扱いが安定）
 * 2) 失敗/未導入 → Ghostscript（OP有効, ICC明示, sRGB固定）
 * 3) それでも不可 → Imagick（ICC割り当て→sRGB変換）
 * 4) JPEG は 4:4:4 サンプリングで細線にじみを抑制
 */

/* ===== 設定 ===== */
const CACHE_TTL_SEC = 60 * 30;     // token 生存 30分（アクセスで延命）
const BASE_DIR      = 'pdfcache';  // sys_tmp 下のキャッシュディレクトリ
const THUMB_W       = 300;         // サムネ幅(px)
const PREVIEW_W     = 1200;        // プレビュー幅(px)
const PREVIEW_DPI   = 144;         // プレビュー/サムネ DPI
const EXPORT_DPI    = 300;         // 本番出力 DPI
const Q_PREVIEW     = 82;          // プレビュー JPEG 品質
const Q_EXPORT      = 92;          // 本番 JPEG 品質
const MAX_UPLOAD_MB = 25;          // アップロード上限(MB)

// ICC プロファイル（環境に合わせて変更・sRGB は必須）
const ICC_SRGB = '/usr/share/color/icc/sRGB.icc';
const ICC_CMYK = '/usr/share/color/icc/ghostscript/USWebCoatedSWOP.icc'; // 例

// バックエンド実行ファイルのパス（環境に合わせて）
const USE_MUPDF = true;
const MUPDF_BIN = '/usr/bin/mutool';    // 例: /usr/local/bin/mutool
const USE_GS    = true;
const GS_BIN    = '/usr/bin/gs';        // 例: /usr/local/bin/gs

/* ===== 共通ユーティリティ ===== */
ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');

function fail(int $code, string $msg): void {
    http_response_code($code);
    header('Content-Type: text/plain; charset=utf-8');
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
function touch_dir(string $dir): void { @touch($dir); }
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
function has_bin(string $path): bool {
    return is_file($path) && is_executable($path);
}

/* ===== MuPDF(mutool) で 1 ページを RGB ラスタライズ → JPEG =====
 * - スポット色/OP/透明の扱いが比較的安定
 * - 出力は PNG → Imagick で JPEG(4:4:4) に変換
 */
function mupdf_render_page(string $pdfPath, int $page1, int $dpi, ?int $maxW, int $quality): ?string {
    if (!USE_MUPDF || !has_bin(MUPDF_BIN)) return null;
    if (!is_file($pdfPath)) return null;
    if (!ICC_SRGB || !is_file(ICC_SRGB)) return null;

    $page = max(1, $page1);
    $tmpDir = sys_get_temp_dir() . '/mupdf_' . bin2hex(random_bytes(8));
    @mkdir($tmpDir, 0700, true);
    $outPng = $tmpDir . '/p.png';

    // -c <icc> : 出力ICC（sRGB）を明示、-A 8: アンチエイリアス
    $cmd = sprintf(
        '%s draw -o %s -r %d -A 8 -c %s -F png %s %d 2>&1',
        escapeshellarg(MUPDF_BIN),
        escapeshellarg($outPng),
        (int)$dpi,
        escapeshellarg(ICC_SRGB),
        escapeshellarg($pdfPath),
        $page
    );
    @exec($cmd, $out, $code);
    if ($code !== 0 || !is_file($outPng)) { @unlink($outPng); @rmdir($tmpDir); return null; }

    try {
        if (!extension_loaded('imagick')) {
            // まれな構成用（品質や縮小制御は不可）
            $bin = file_get_contents($outPng);
            @unlink($outPng); @rmdir($tmpDir);
            return $bin ?: null;
        }
        $im = new Imagick();
        $im->readImage($outPng);

        if ($maxW && $maxW > 0) {
            $w = $im->getImageWidth(); $h = $im->getImageHeight();
            if ($w > $maxW) {
                $ratio = $maxW / $w;
                $im->resizeImage((int)($w * $ratio), (int)($h * $ratio), Imagick::FILTER_LANCZOS, 1);
            }
        }
        if ($im->getImageAlphaChannel()) {
            $im->setImageBackgroundColor('white');
            $im = $im->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
        }

        // sRGB を明示しメタ削除
        try { $im->profileImage('icc', file_get_contents(ICC_SRGB)); } catch (\Throwable $e) {}
        try { $im->setImageColorspace(Imagick::COLORSPACE_SRGB); } catch (\Throwable $e) {}
        try { $im->stripImage(); } catch (\Throwable $e) {}

        // JPEG 4:4:4
        $im->setImageFormat('jpeg');
        $im->setImageCompression(Imagick::COMPRESSION_JPEG);
        $im->setImageCompressionQuality($quality);
        $im->setImageProperty('jpeg:sampling-factor','4:4:4');

        $bin = $im->getImagesBlob();
        $im->clear(); $im->destroy();

        @unlink($outPng); @rmdir($tmpDir);
        return $bin ?: null;

    } catch (\Throwable $e) {
        @unlink($outPng); @rmdir($tmpDir);
        return null;
    }
}

/* ===== Ghostscript で 1 ページを RGB ラスタライズ → JPEG =====
 * - OP有効 / ICC明示 / sRGB固定 / CropBox
 */
function gs_render_page(string $pdfPath, int $page1, int $dpi, ?int $maxW, int $quality): ?string {
    if (!USE_GS || !has_bin(GS_BIN)) return null;
    if (!is_file($pdfPath)) return null;
    if (!ICC_SRGB || !is_file(ICC_SRGB)) return null;

    $page = max(1, $page1);
    $tmpDir = sys_get_temp_dir() . '/gs_' . bin2hex(random_bytes(8));
    @mkdir($tmpDir, 0700, true);
    $outPng = $tmpDir . '/p.png';

    $cmd = [
        escapeshellarg(GS_BIN),
        '-dSAFER','-dBATCH','-dNOPAUSE',
        '-sDEVICE=png16m',
        '-r' . (int)$dpi,
        '-dFirstPage=' . (int)$page,
        '-dLastPage='  . (int)$page,
        '-dUseCropBox',
        '-dUseCIEColor',
        '-dRenderOverprint=true',
        '-dColorConversionStrategy=/RGB',
        '-dColorConversionStrategyForImages=/RGB',
        '-sProcessColorModel=DeviceRGB',
        '-sDefaultRGBProfile=' . escapeshellarg(ICC_SRGB),
        '-sOutputICCProfile='  . escapeshellarg(ICC_SRGB),
        '-dGraphicsAlphaBits=4','-dTextAlphaBits=4',
        '-o', escapeshellarg($outPng),
        escapeshellarg($pdfPath)
    ];
    @exec(implode(' ', $cmd) . ' 2>&1', $out, $code);
    if ($code !== 0 || !is_file($outPng)) { @unlink($outPng); @rmdir($tmpDir); return null; }

    try {
        $im = new Imagick();
        $im->readImage($outPng);

        if ($maxW && $maxW > 0) {
            $w = $im->getImageWidth(); $h = $im->getImageHeight();
            if ($w > $maxW) {
                $ratio = $maxW / $w;
                $im->resizeImage((int)($w * $ratio), (int)($h * $ratio), Imagick::FILTER_LANCZOS, 1);
            }
        }
        if ($im->getImageAlphaChannel()) {
            $im->setImageBackgroundColor('white');
            $im = $im->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
        }
        try { $im->profileImage('icc', file_get_contents(ICC_SRGB)); } catch (\Throwable $e) {}
        try { $im->setImageColorspace(Imagick::COLORSPACE_SRGB); } catch (\Throwable $e) {}
        try { $im->stripImage(); } catch (\Throwable $e) {}

        $im->setImageFormat('jpeg');
        $im->setImageCompression(Imagick::COMPRESSION_JPEG);
        $im->setImageCompressionQuality($quality);
        $im->setImageProperty('jpeg:sampling-factor','4:4:4');

        $bin = $im->getImagesBlob();
        $im->clear(); $im->destroy();

        @unlink($outPng); @rmdir($tmpDir);
        return $bin ?: null;

    } catch (\Throwable $e) {
        @unlink($outPng); @rmdir($tmpDir);
        return null;
    }
}

/* ===== Imagick で 1 ページを JPEG（ICC割当→sRGB変換） =====
 * - 最後のフォールバック用
 */
function imagick_render_page(string $pdfPath, int $page1, int $dpi, int $quality, ?int $maxW = null): string {
    if (!extension_loaded('imagick')) fail(500, 'Imagick extension not loaded');
    if (!is_file($pdfPath)) fail(404, 'pdf not found');

    try {
        // リソース制限
        try {
            $lim = new Imagick();
            $lim->setResourceLimit(Imagick::RESOURCETYPE_MEMORY, 512 * 1024 * 1024);
            $lim->setResourceLimit(Imagick::RESOURCETYPE_MAP,    1024 * 1024 * 1024);
            $lim->clear(); $lim->destroy();
        } catch (\Throwable $e) {}

        $im = new Imagick();
        $im->setOption('pdf:use-cropbox', 'true');
        $im->setOption('pdf:interpret-icc', 'true');
        $im->setOption('pdf:process-color-model', 'rgb');
        $im->setResolution($dpi, $dpi);

        $idx = max(0, $page1 - 1);
        $im->readImage(sprintf('%s[%d]', $pdfPath, $idx));

        if ($im->getImageAlphaChannel()) {
            $im->setImageBackgroundColor('white');
            $im = $im->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
        }

        // ICC 割当 → sRGB 変換
        try { if (ICC_CMYK && is_file(ICC_CMYK)) $im->profileImage('icc', file_get_contents(ICC_CMYK)); } catch (\Throwable $e) {}
        try { if (ICC_SRGB && is_file(ICC_SRGB)) $im->profileImage('icc', file_get_contents(ICC_SRGB)); } catch (\Throwable $e) {}
        try { $im->setImageColorspace(Imagick::COLORSPACE_SRGB); } catch (\Throwable $e) {}
        try { $im->stripImage(); } catch (\Throwable $e) {}

        if ($maxW && $maxW > 0) {
            $w = $im->getImageWidth(); $h = $im->getImageHeight();
            if ($w > $maxW) {
                $ratio = $maxW / $w;
                $im->resizeImage((int)($w * $ratio), (int)($h * $ratio), Imagick::FILTER_LANCZOS, 1);
            }
        }

        $im->setImageFormat('jpeg');
        $im->setImageCompression(Imagick::COMPRESSION_JPEG);
        $im->setImageCompressionQuality($quality);
        $im->setImageProperty('jpeg:sampling-factor','4:4:4');

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

/* ===== 統合レンダラ：MuPDF → GS → Imagick ===== */
function render_pdf_page(string $pdfPath, int $page1, int $dpi, int $quality, ?int $maxW = null): string {
    $bin = mupdf_render_page($pdfPath, $page1, $dpi, $maxW, $quality);
    if (is_string($bin) && $bin !== '') return $bin;

    $bin = gs_render_page($pdfPath, $page1, $dpi, $maxW, $quality);
    if (is_string($bin) && $bin !== '') return $bin;

    return imagick_render_page($pdfPath, $page1, $dpi, $quality, $maxW);
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

    $size = (int)($_FILES['file']['size'] ?? 0);
    if ($size > MAX_UPLOAD_MB * 1024 * 1024) fail(413, 'file too large');

    $token = bin2hex(random_bytes(16));
    $dir = token_dir($token); ensure_dir($dir);
    $pdfPath = $dir . DIRECTORY_SEPARATOR . 'doc.pdf';
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $pdfPath)) {
        if (!copy($_FILES['file']['tmp_name'], $pdfPath)) {
            @rmdir($dir); fail(500, 'failed to store upload');
        }
    }
    touch_dir($dir);

    $pages = count_pdf_pages($pdfPath);

    $orig = $_FILES['file']['name'] ?? 'document.pdf';
    $base = safe_basename(pathinfo($orig, PATHINFO_FILENAME) ?: 'document');

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['token'=>$token,'pages'=>$pages,'name'=>$base], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

    // 返答後、裏でサムネ全生成（温め）
    if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); }
    try {
        for ($i = 1; $i <= $pages; $i++) {
            $thumbPath = cache_file($token, 'thumb', $i);
            if (is_file($thumbPath)) continue;
            $bin = render_pdf_page($pdfPath, $i, PREVIEW_DPI, Q_PREVIEW, THUMB_W);
            file_put_contents($thumbPath, $bin);
            touch_dir($dir); // TTL延長
        }
    } catch (\Throwable $e) { /* no-op */ }
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
