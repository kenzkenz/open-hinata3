<?php
// ===== CORS & METHOD HANDLING =====
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Access-Control-Max-Age: 86400");

// OPTIONS は No Content（フロントは .json() しないこと）
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 以降は常に JSON
header('Content-Type: application/json; charset=utf-8');

// 余計な出力で JSON が壊れないように
ini_set('display_errors', '0');
ini_set('html_errors', '0');
if (function_exists('ob_get_level') && ob_get_level() > 0) { @ob_end_clean(); }

// 環境: GDALの .aux.xml を抑止
putenv("GDAL_PAM_ENABLED=NO");

// ===== Helpers =====
function send_json($data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function send_error(string $msg, int $status = 400, array $extra = []) {
    $payload = array_merge(['success' => false, 'error' => $msg], $extra);
    send_json($payload, $status);
}

function file_upload_error_message($code) {
    // https://www.php.net/manual/en/features.file-upload.errors.php
    return match ($code) {
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE (form)',
        UPLOAD_ERR_PARTIAL => 'File partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
        default => 'Unknown upload error',
    };
}

function run_cmd(string $cmd): array {
    $out = [];
    $code = 0;
    exec($cmd . ' 2>&1', $out, $code);
    return [$code, implode("\n", $out)];
}

// ===== Config =====
$baseUploadDir = "/var/www/html/public_html/uploads/";

// ディレクトリ名（英数-_のみ）。空なら default
$rawDir = $_POST['dir'] ?? 'default';
$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', $rawDir);
if ($subDir === '' || $subDir === null) { $subDir = 'default'; }

$uploadDir = rtrim($baseUploadDir, "/") . "/" . $subDir . "/";

// ディレクトリ作成
if (!is_dir($uploadDir)) {
    if (!@mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
        send_error("ディレクトリの作成に失敗しました: {$uploadDir}", 500);
    }
}

// ===== Input Validation =====
if (!isset($_FILES['file'])) {
    send_error("ファイルをアップロードしてください", 400);
}

if (!isset($_FILES['file']['error']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $code = $_FILES['file']['error'] ?? -1;
    $msg  = $code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE
        ? 'File too large'
        : file_upload_error_message($code);
    $status = ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) ? 413 : 400;
    send_error("アップロードエラー: {$msg}", $status, ['php_error_code' => $code]);
}

// 拡張子チェック
$origName = $_FILES['file']['name'] ?? 'unknown';
$fileExt  = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
$allowed  = ['tif', 'tiff', 'jpg', 'jpeg', 'png', 'pdf'];
if (!in_array($fileExt, $allowed, true)) {
    send_error("許可されていないファイル形式です (TIFF, JPEG, PNG, PDF のみ許可)", 415, ['ext' => $fileExt]);
}

// 一意名
$fileBaseName = bin2hex(random_bytes(8)); // uniqidより衝突耐性
$imagePath = $uploadDir . $fileBaseName . "." . $fileExt;

// 保存
if (!@move_uploaded_file($_FILES['file']['tmp_name'], $imagePath)) {
    send_error("ファイルの保存に失敗しました", 500);
}

// ===== PDF は単独処理 =====
if ($fileExt === 'pdf') {
    $jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";
    // ImageMagick (convert) で1ページ目を 100px 幅に
    $cmd = "convert -density 150 " . escapeshellarg($imagePath) . "[0] -resize 100x -quality 90 " . escapeshellarg($jpegThumbnailPath);
    [$rc, $out] = run_cmd($cmd);
    if ($rc !== 0 || !is_file($jpegThumbnailPath)) {
        send_error("PDF のサムネイル作成に失敗しました", 500, ['cmd' => $cmd, 'cmd_rc' => $rc, 'cmd_out' => $out]);
    }
    send_json([
        'success'   => true,
        'type'      => 'pdf',
        'file'      => $imagePath,
        'thumbnail' => $jpegThumbnailPath,
        'dir'       => $subDir,
        'name'      => $origName,
    ]);
}

// ===== PDF 以外は worldfile 必須 =====
$worldExt = match ($fileExt) {
    'tif', 'tiff' => 'tfw',
    'jpg', 'jpeg' => 'jgw',
    'png' => 'pgw',
    default => null,
};

if ($worldExt === null) {
    // 到達しない想定だが保険
    @unlink($imagePath);
    send_error("ワールドファイル拡張子を判定できませんでした", 400);
}

if (!isset($_FILES['worldfile'])) {
    @unlink($imagePath);
    send_error("ワールドファイル (.$worldExt) をアップロードしてください", 400);
}
if (!isset($_FILES['worldfile']['error']) || $_FILES['worldfile']['error'] !== UPLOAD_ERR_OK) {
    $code = $_FILES['worldfile']['error'] ?? -1;
    @unlink($imagePath);
    $status = ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) ? 413 : 400;
    send_error("ワールドファイルのアップロードに失敗: " . file_upload_error_message($code), $status, ['php_error_code' => $code]);
}

$worldFilePath = $uploadDir . $fileBaseName . "." . $worldExt;
if (!@move_uploaded_file($_FILES['worldfile']['tmp_name'], $worldFilePath)) {
    @unlink($imagePath);
    send_error("ワールドファイルの保存に失敗しました", 500);
}

// ===== TIFF（白黒=単バンド）対応 =====
function is_grayscale_tiff(string $path): ?bool {
    [$rc, $out] = run_cmd("gdalinfo -json " . escapeshellarg($path));
    if ($rc !== 0) return null; // 判定不能（GDAL未インストールなど）→null
    $json = json_decode($out, true);
    if (!is_array($json) || !isset($json['bands'])) return null;
    return count($json['bands']) === 1;
}

if ($fileExt === 'tif' || $fileExt === 'tiff') {
    $gray = is_grayscale_tiff($imagePath);
    if ($gray === true) {
        $grayFilePath   = $uploadDir . $fileBaseName . "_gray.tif";
        $outputFilePath = $uploadDir . $fileBaseName . "_processed.tif";

        // 1) 単バンドを明示、2) タイル化+圧縮、3) オーバービュー作成
        [$rc1, $o1] = run_cmd("gdal_translate -expand gray " . escapeshellarg($imagePath) . " " . escapeshellarg($grayFilePath));
        [$rc2, $o2] = run_cmd("gdal_translate -co TILED=YES -co COMPRESS=DEFLATE " . escapeshellarg($grayFilePath) . " " . escapeshellarg($outputFilePath));
        [$rc3, $o3] = run_cmd("gdaladdo --config COMPRESS_OVERVIEW DEFLATE -r average " . escapeshellarg($outputFilePath) . " 2 4 8 16");

        if ($rc1 !== 0 || $rc2 !== 0 || $rc3 !== 0 || !is_file($outputFilePath)) {
            // 後始末
            @unlink($grayFilePath);
            send_error("TIFF の前処理に失敗しました", 500, [
                'step1' => ['rc' => $rc1, 'out' => $o1],
                'step2' => ['rc' => $rc2, 'out' => $o2],
                'step3' => ['rc' => $rc3, 'out' => $o3],
            ]);
        }
        // 置き換え
        @unlink($imagePath);
        if (!@rename($outputFilePath, $imagePath)) {
            @unlink($grayFilePath);
            send_error("TIFF の置き換えに失敗しました", 500);
        }
        @unlink($grayFilePath);
    }
}

// ===== サムネイル作成（PDF以外） =====
$jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";

if ($fileExt === 'tif' || $fileExt === 'tiff' || $fileExt === 'png') {
    // GDAL 経由で 100px 幅
    $cmd = "gdal_translate -of JPEG -co PAM=NO -outsize 100 0 " . escapeshellarg($imagePath) . " " . escapeshellarg($jpegThumbnailPath);
    [$rc, $out] = run_cmd($cmd);
    if ($rc !== 0 || !is_file($jpegThumbnailPath)) {
        // フォールバック: ImageMagick if available
        $cmd2 = "convert " . escapeshellarg($imagePath) . " -resize 100x -quality 90 " . escapeshellarg($jpegThumbnailPath);
        [$rc2, $out2] = run_cmd($cmd2);
        if ($rc2 !== 0 || !is_file($jpegThumbnailPath)) {
            send_error("サムネイル作成に失敗しました", 500, ['gdal' => ['rc' => $rc, 'out' => $out], 'convert' => ['rc' => $rc2, 'out' => $out2]]);
        }
    }
} else {
    // JPEG系はGDで縮小
    $src = @imagecreatefromjpeg($imagePath);
    if (!$src) {
        // convert フォールバック
        $cmd = "convert " . escapeshellarg($imagePath) . " -resize 100x -quality 90 " . escapeshellarg($jpegThumbnailPath);
        [$rc, $out] = run_cmd($cmd);
        if ($rc !== 0 || !is_file($jpegThumbnailPath)) {
            send_error("JPEGサムネイル作成に失敗しました", 500, ['convert' => ['rc' => $rc, 'out' => $out]]);
        }
    } else {
        [$w, $h] = getimagesize($imagePath);
        $nw = 100;
        $nh = ($h / max($w, 1)) * 100;
        $thumb = imagecreatetruecolor((int)$nw, (int)$nh);
        imagecopyresampled($thumb, $src, 0, 0, 0, 0, (int)$nw, (int)$nh, (int)$w, (int)$h);
        imagejpeg($thumb, $jpegThumbnailPath, 90);
        imagedestroy($thumb);
        imagedestroy($src);
        if (!is_file($jpegThumbnailPath)) {
            send_error("JPEGサムネイル書き出しに失敗しました", 500);
        }
    }
}

// ===== 成功レスポンス =====
send_json([
    'success'    => true,
    'type'       => $fileExt,
    'file'       => $imagePath,
    'worldfile'  => $worldFilePath,
    'thumbnail'  => $jpegThumbnailPath,
    'dir'        => $subDir,
    'name'       => $origName,
], 200);
