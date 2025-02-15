<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// GDAL の `.aux.xml` 生成を防ぐ
putenv("GDAL_PAM_ENABLED=NO");

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";

// JSON データの取得 (ディレクトリ名取得)
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default"; // 安全なディレクトリ名に変換

// フルパスのアップロードディレクトリ
$uploadDir = $baseUploadDir . $subDir . "/";

// ディレクトリがない場合は作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
}

// TIFF のチェック
if (!isset($_FILES["file"])) {
    echo json_encode(["error" => "TIFF ファイルをアップロードしてください"]);
    exit;
}

// アップロードされたファイルの拡張子を確認
$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
if (!in_array($fileExt, ["tif", "tiff"])) {
    echo json_encode(["error" => "許可されていないファイル形式です (TIFF のみ許可)"]);
    exit;
}

// 一意のファイル名を作成（保存時は `.tif` に統一）
$fileBaseName = uniqid();
$tiffPath = $uploadDir . $fileBaseName . ".tif";

// TIFF ファイルの保存
if (!move_uploaded_file($_FILES["file"]["tmp_name"], $tiffPath)) {
    echo json_encode(["error" => "TIFF の保存に失敗しました"]);
    exit;
}

// **JPEG サムネイルを生成**
$thumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";
$gdalCommand = "gdal_translate -of JPEG -outsize 100 0 " . escapeshellarg($tiffPath) . " " . escapeshellarg($thumbnailPath);

exec($gdalCommand . " 2>&1", $gdalOutput, $gdalReturnVar);
if ($gdalReturnVar !== 0) {
    echo json_encode(["error" => "JPEG サムネイルの生成に失敗しました", "output" => $gdalOutput]);
    exit;
}

echo json_encode([
    "success" => true,
    "file" => $tiffPath,
    "thumbnail" => $thumbnailPath,
    "dir" => $subDir
]);
?>
