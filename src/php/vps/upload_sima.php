<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";

// JSON データの取得 (ディレクトリ名取得)
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default";

// フルパスのアップロードディレクトリ
$uploadDir = $baseUploadDir . $subDir . "/sima/";

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

// 元のファイル名を取得
$originalFileName = $_FILES["file"]["name"];

// アップロードされたファイルの拡張子を確認
$fileExt = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
if (!in_array($fileExt, ["sim"])) {
    echo json_encode(["error" => "許可されていないファイル形式です (SIMのみ許可)"]);
    exit;
}

// 一意のファイル名を作成
$fileBaseName = uniqid();
$simaPath = $uploadDir . $fileBaseName . "." . $fileExt;

// ファイルの保存
if (!move_uploaded_file($_FILES["file"]["tmp_name"], $simaPath)) {
    echo json_encode(["error" => "ファイルの保存に失敗しました"]);
    exit;
}

// **成功時のレスポンス**
echo json_encode([
    "success" => true,
    "simaPath" => $simaPath,
    "simaName" => $originalFileName,  // 元のファイル名を追加
    "dir" => $subDir
]);

?>

