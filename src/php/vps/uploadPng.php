<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// `.aux.xml` の生成を防ぐ
putenv("GDAL_PAM_ENABLED=NO");

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";

// JSON データの取得 (ディレクトリ名取得)
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default";

// フルパスのアップロードディレクトリ
$uploadDir = $baseUploadDir . $subDir . "/";

// ディレクトリがない場合は作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
}

// アップロードされたファイルの確認
if (!isset($_FILES["file"])) {
    echo json_encode(["error" => "ファイルをアップロードしてください"]);
    exit;
}

// アップロードされたファイルの拡張子を確認 (PNG のみ許可)
$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
if ($fileExt !== "png") {
    echo json_encode(["error" => "許可されていないファイル形式です (PNG のみ許可)"]);
    exit;
}

// 一意のファイル名を作成
$fileBaseName = uniqid();
$imagePath = $uploadDir . $fileBaseName . ".png";

// ファイルの保存
if (!move_uploaded_file($_FILES["file"]["tmp_name"], $imagePath)) {
    echo json_encode(["error" => "ファイルの保存に失敗しました"]);
    exit;
}

// **成功時のレスポンス**
echo json_encode([
    "success" => true,
    "file" => $imagePath,
    "dir" => $subDir
]);

?>
