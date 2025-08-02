<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";

// JSON データの取得 (ディレクトリ名取得)
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default";

// フルパスのアップロードディレクトリ
$uploadDir = $baseUploadDir . $subDir . "/picture/";

// ディレクトリがない場合は作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
} else {
    // 既存のディレクトリのパーミッションを777に変更
    chmod($uploadDir, 0777);
}

// アップロードされたファイルの確認
if (!isset($_FILES["file"])) {
    echo json_encode(["error" => "ファイルをアップロードしてください"]);
    exit;
}

// ファイル情報
$fileTmpPath = $_FILES['file']['tmp_name'];
$originalFileName = $_FILES['file']['name'];
$fileExt = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
$fileSize = $_FILES['file']['size'];

// MIMEタイプと拡張子のホワイトリスト
$allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// MIMEタイプチェック
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $fileTmpPath);
finfo_close($finfo);

// 拡張子・MIMEタイプの両方を確認
if (!in_array($mimeType, $allowedMimeTypes) || !in_array($fileExt, $allowedExtensions)) {
    echo json_encode(["success" => false, "message" => "画像ファイルのみアップロードできます"]);
    exit;
}

// 一意のファイル名を作成
$fileBaseName = uniqid();
$picturePath = $uploadDir . $fileBaseName . "." . $fileExt;

// ファイルの保存
if (!move_uploaded_file($fileTmpPath, $picturePath)) {
    echo json_encode(["error" => "ファイルの保存に失敗しました"]);
    exit;
}

// 相対パスを作成（public_html/uploads/ 以降）
$relativeWebPath = "uploads/" . $subDir . "/picture/" . $fileBaseName . "." . $fileExt;
// Webからアクセス可能なURLに変換
$webUrl = "https://kenzkenz.net/" . $relativeWebPath;


// 成功レスポンス
echo json_encode([
    "success" => true,
    "picturePath" => $picturePath,
    "webUrl" => $webUrl,
    "pictureName" => $originalFileName,
    "dir" => $subDir
]);
