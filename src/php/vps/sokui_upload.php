<?php

// 役割: ユーザーごとのディレクトリ配下に画像/動画を保存して、保存結果(パス/URL)を返すだけ。
// DBは触らない。JSONで応答。

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *'); // 必要に応じて制限

// ===== 設定 =====
const BASE_UPLOAD_DIR = '/var/www/html/public_html/uploads'; // 末尾スラなし
const BASE_URL = 'https://kenzkenz.net/uploads';      // 末尾スラなし
const MAX_BYTES = 50 * 1024 * 1024; // 最大 50MB（必要に応じて調整）
const DIR_MODE = 0750;
const FILE_MODE = 0640;

// ===== ユーティリティ =====
function send_error(string $msg, int $code = 400, array $extra = []): never
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

function sanitize_dir(string $s): string
{
    // 英数/_/- のみ許可。先頭末尾のドット/スラは排除。空ならエラーへ。
    $s = preg_replace('/[^A-Za-z0-9_\-]/', '', $s ?? '');
    return trim($s, "./");
}

function guess_ext_from_mime(string $mime, string $fallbackKind): string
{
    static $map = [
        'image/jpeg' => '.jpg', 'image/png' => '.png', 'image/webp' => '.webp', 'image/gif' => '.gif',
        'image/heic' => '.heic', 'image/heif' => '.heif',
        'video/mp4' => '.mp4', 'video/quicktime' => '.mov', 'video/webm' => '.webm', 'video/3gpp' => '.3gp',
    ];
    if (isset($map[$mime])) return $map[$mime];
    if ($fallbackKind === 'image') return '.jpg';
    if ($fallbackKind === 'video') return '.mp4';
    return '.bin';
}

function ensure_dir(string $absPath): void
{
    if (is_dir($absPath)) return;
    if (!mkdir($absPath, DIR_MODE, true)) {
        send_error('ディレクトリ作成に失敗しました', 500, ['path' => $absPath]);
    }
    @chmod($absPath, DIR_MODE);
}

function rand_name(int $bytes = 12): string
{
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}

function bytes_to_mb(int $bytes, int $precision = 3): float
{
    return round($bytes / 1048576, $precision); // 1MB = 1024*1024
}

// ===== 入力検証 =====
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('POSTのみ受け付けます', 405);
}

$dir = sanitize_dir((string)($_POST['dir'] ?? ''));
$kind = strtolower((string)($_POST['kind'] ?? 'image')); // 省略時は image 扱い
if ($dir === '') send_error('dir は必須です');
if (!in_array($kind, ['image', 'video'], true)) send_error('kind は image か video を指定してください');

if (!isset($_FILES['media'])) send_error('media がありません');
$up = $_FILES['media'];
if (!is_array($up) || ($up['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $code = (int)($up['error'] ?? UPLOAD_ERR_NO_FILE);
    send_error('アップロードエラー', 400, ['upload_err' => $code]);
}
if (($up['size'] ?? 0) <= 0) send_error('ファイルサイズが0です');
if ($up['size'] > MAX_BYTES) send_error('ファイルサイズが上限を超えています', 413, ['limit' => MAX_BYTES]);

// MIME判定
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $up['tmp_name']);
finfo_close($finfo);

$allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
$allowedVideo = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'];
if ($kind === 'image' && !in_array($mime, $allowedImage, true)) send_error('画像MIMEではありません', 400, ['mime' => $mime]);
if ($kind === 'video' && !in_array($mime, $allowedVideo, true)) send_error('動画MIMEではありません', 400, ['mime' => $mime]);

// ===== 保存先決定 =====
// /uploads/{dir}/sokui/{image|video}/
$relBase = $dir . '/sokui/' . ($kind === 'video' ? 'video' : 'image');
$absBase = rtrim(BASE_UPLOAD_DIR, '/') . '/' . $relBase;
$urlBase = rtrim(BASE_URL, '/') . '/' . $relBase;

ensure_dir($absBase);

// ファイル名はランダム＋拡張子
$ext = guess_ext_from_mime($mime, $kind);
$rand = rand_name();
$filename = $rand . $ext;

$absPath = $absBase . '/' . $filename;
$relPath = $relBase . '/' . $filename;
$url = $urlBase . '/' . $filename;

// 衝突回避
for ($i = 0; $i < 3 && file_exists($absPath); $i++) {
    $rand = rand_name();
    $filename = $rand . $ext;
    $absPath = $absBase . '/' . $filename;
    $relPath = $relBase . '/' . $filename;
    $url = $urlBase . '/' . $filename;
}

// 保存
if (!move_uploaded_file($up['tmp_name'], $absPath)) {
    send_error('保存に失敗しました', 500);
}
@chmod($absPath, FILE_MODE);

// 成功レスポンス（サイズはMBを返す）
$sizeBytes = (int)$up['size'];
echo json_encode([
    'ok' => true,
    'kind' => $kind,
    'mime' => $mime,
    'size_mb' => bytes_to_mb($sizeBytes, 3), // ★ MB（小数3桁）
    'size_bytes' => $sizeBytes,                 // （必要なら併用）
    'filename' => $filename,
    'abs_path' => $absPath,
    'rel_path' => $relPath,
    'url' => $url,
    'dir' => $dir,
    'saved_at' => date('c'),
], JSON_UNESCAPED_UNICODE);




// 役割: ユーザーごとのディレクトリ配下に画像/動画を保存して、保存結果(パス/URL)を返すだけ。
//// DBは触らない。JSONで応答。
//
//declare(strict_types=1);
//ini_set('display_errors', '0');
//error_reporting(E_ALL);
//header('Content-Type: application/json; charset=UTF-8');
//header('Access-Control-Allow-Origin: *'); // 必要に応じて制限
//
//// ===== 設定 =====
//const BASE_UPLOAD_DIR = '/var/www/html/public_html/uploads'; // 末尾スラなし
//const BASE_URL        = 'https://kenzkenz.net/uploads';      // 末尾スラなし
//const MAX_BYTES       = 50 * 1024 * 1024; // 最大 50MB（必要に応じて調整）
//const DIR_MODE        = 0750;
//const FILE_MODE       = 0640;
//
//// ===== ユーティリティ =====
//function send_error(string $msg, int $code=400, array $extra=[]): never {
//    http_response_code($code);
//    echo json_encode(['ok'=>false,'error'=>$msg]+$extra, JSON_UNESCAPED_UNICODE);
//    exit;
//}
//
//function sanitize_dir(string $s): string {
//    // 英数/_/- のみ許可。先頭末尾のドット/スラは排除。空ならエラーへ。
//    $s = preg_replace('/[^A-Za-z0-9_\-]/', '', $s ?? '');
//    return trim($s, "./");
//}
//
//function guess_ext_from_mime(string $mime, string $fallbackKind): string {
//    static $map = [
//        'image/jpeg'=>'.jpg', 'image/png'=>'.png', 'image/webp'=>'.webp', 'image/gif'=>'.gif',
//        'image/heic'=>'.heic', 'image/heif'=>'.heif',
//        'video/mp4'=>'.mp4', 'video/quicktime'=>'.mov', 'video/webm'=>'.webm', 'video/3gpp'=>'.3gp',
//    ];
//    if (isset($map[$mime])) return $map[$mime];
//    // kindからのフォールバック
//    if ($fallbackKind === 'image') return '.jpg';
//    if ($fallbackKind === 'video') return '.mp4';
//    return '.bin';
//}
//
//function ensure_dir(string $absPath): void {
//    if (is_dir($absPath)) return;
//    if (!mkdir($absPath, DIR_MODE, true)) {
//        send_error('ディレクトリ作成に失敗しました', 500, ['path'=>$absPath]);
//    }
//    @chmod($absPath, DIR_MODE);
//}
//
//function rand_name(int $bytes=12): string {
//    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
//}
//
//// ===== 入力検証 =====
//if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
//    send_error('POSTのみ受け付けます', 405);
//}
//
//$dir  = sanitize_dir((string)($_POST['dir'] ?? ''));
//$kind = strtolower((string)($_POST['kind'] ?? 'image')); // 省略時は image 扱い
//if ($dir === '') send_error('dir は必須です');
//if (!in_array($kind, ['image','video'], true)) send_error('kind は image か video を指定してください');
//
//if (!isset($_FILES['media'])) send_error('media がありません');
//$up = $_FILES['media'];
//if (!is_array($up) || ($up['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
//    $code = (int)($up['error'] ?? UPLOAD_ERR_NO_FILE);
//    send_error('アップロードエラー', 400, ['upload_err'=>$code]);
//}
//if (($up['size'] ?? 0) <= 0) send_error('ファイルサイズが0です');
//if ($up['size'] > MAX_BYTES) send_error('ファイルサイズが上限を超えています', 413, ['limit'=>MAX_BYTES]);
//
//// MIME判定
//$finfo = finfo_open(FILEINFO_MIME_TYPE);
//$mime  = finfo_file($finfo, $up['tmp_name']);
//finfo_close($finfo);
//
//$allowedImage = ['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'];
//$allowedVideo = ['video/mp4','video/quicktime','video/webm','video/3gpp'];
//if ($kind === 'image' && !in_array($mime, $allowedImage, true)) send_error('画像MIMEではありません', 400, ['mime'=>$mime]);
//if ($kind === 'video' && !in_array($mime, $allowedVideo, true)) send_error('動画MIMEではありません', 400, ['mime'=>$mime]);
//
//// ===== 保存先決定 =====
//// /uploads/{dir}/sokui/{image|video}/
//$relBase  = $dir . '/sokui/' . ($kind === 'video' ? 'video' : 'image');
//$absBase  = rtrim(BASE_UPLOAD_DIR, '/') . '/' . $relBase;
//$urlBase  = rtrim(BASE_URL, '/') . '/' . $relBase;
//
//ensure_dir($absBase);
//
//// ファイル名はランダム＋拡張子。元名はDB側で保持する想定なら別途返せる
//$ext      = guess_ext_from_mime($mime, $kind);
//$rand     = rand_name();
//$filename = $rand . $ext;
//
//$absPath  = $absBase . '/' . $filename;
//$relPath  = $relBase . '/' . $filename;
//$url      = $urlBase . '/' . $filename;
//
//// 衝突回避（ほぼ起きないが念のため）
//for ($i=0; $i<3 && file_exists($absPath); $i++) {
//    $rand     = rand_name();
//    $filename = $rand . $ext;
//    $absPath  = $absBase . '/' . $filename;
//    $relPath  = $relBase . '/' . $filename;
//    $url      = $urlBase . '/' . $filename;
//}
//
//// 保存
//if (!move_uploaded_file($up['tmp_name'], $absPath)) {
//    send_error('保存に失敗しました', 500);
//}
//@chmod($absPath, FILE_MODE);
//
//// 成功レスポンス
//echo json_encode([
//    'ok'         => true,
//    'kind'       => $kind,
//    'mime'       => $mime,
//    'size'       => (int)$up['size'],
//    'filename'   => $filename,
//    'abs_path'   => $absPath,   // 自サーバー内のフルパス
//    'rel_path'   => $relPath,   // /uploads/ からの相対
//    'url'        => $url,       // WEB上のURL
//    'dir'        => $dir,
//    'saved_at'   => date('c'),
//], JSON_UNESCAPED_UNICODE);
