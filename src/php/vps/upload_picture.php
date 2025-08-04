<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$baseUploadDir = "/var/www/html/public_html/uploads/";
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default";

if (!isset($_FILES["file"])) {
    echo json_encode(["error" => "ファイルをアップロードしてください"]);
    exit;
}

$fileTmpPath = $_FILES['file']['tmp_name'];
$originalFileName = $_FILES['file']['name'];
$fileExt = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
$fileSize = $_FILES['file']['size'];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $fileTmpPath);
finfo_close($finfo);

$imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

$videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
$videoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

if (in_array($fileExt, $imageExts) && in_array($mimeType, $imageMimes)) {
    $typeDir = "picture";
} elseif (in_array($fileExt, $videoExts) && in_array($mimeType, $videoMimes)) {
    $typeDir = "movie";
} else {
    echo json_encode(["success" => false, "message" => "画像または動画ファイルのみアップロードできます"]);
    exit;
}

$uploadDir = $baseUploadDir . $subDir . "/" . $typeDir . "/";
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
} else {
    chmod($uploadDir, 0777);
}

$fileBaseName = uniqid();
$fullFileName = $fileBaseName . "." . $fileExt;
$fullFilePath = $uploadDir . $fullFileName;

// ==============================
// 動画10MB超えなら ffmpeg 圧縮
// ==============================

if (in_array($fileExt, $videoExts) && $fileSize > 10 * 1024 * 1024) {
    $compressedFileName = $fileBaseName . "_compressed.mp4";
    $compressedFilePath = $uploadDir . $compressedFileName;

    $cmd = "ffmpeg -i " . escapeshellarg($fileTmpPath) .
        " -vcodec libx264 -acodec aac -b:v 1M -bufsize 1M -preset fast -y " .
        escapeshellarg($compressedFilePath);

    exec($cmd, $output, $returnVar);

    if ($returnVar !== 0 || !file_exists($compressedFilePath)) {
        echo json_encode(["error" => "動画の圧縮に失敗しました"]);
        exit;
    }

    $fullFileName = $compressedFileName;
    $fullFilePath = $compressedFilePath;
}

// ==============================
// それ以外（画像または動画10MB以下）はそのまま保存
// ==============================
elseif (!move_uploaded_file($fileTmpPath, $fullFilePath)) {
    echo json_encode(["error" => "ファイルの保存に失敗しました"]);
    exit;
}

$relativeWebPath = "uploads/" . $subDir . "/" . $typeDir . "/" . $fullFileName;
$webUrl = "https://kenzkenz.net/" . $relativeWebPath;

echo json_encode([
    "success" => true,
    "type" => $typeDir,
    "picturePath" => $fullFilePath,
    "webUrl" => $webUrl,
    "pictureName" => $originalFileName,
    "dir" => $subDir
]);

