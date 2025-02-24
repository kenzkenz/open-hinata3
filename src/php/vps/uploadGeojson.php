<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

error_reporting(E_ALL);
ini_set("display_errors", 1);

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";

// `$_POST["dir"]` を安全な形式に修正
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_\/-]/', '', $_POST["dir"]) : "default"; // `/` を許可
$subDir = str_replace('..', '', $subDir); // `..` を削除して安全なパスにする

// フルパスのアップロードディレクトリ
$uploadDir = $baseUploadDir . $subDir . "/";

// ディレクトリの確認ログ
error_log("アップロードディレクトリ: " . $uploadDir);

// ディレクトリがない場合は作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {  // ✅ 第三引数に `true` を追加
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
}

// geojson のチェック
if (!isset($_FILES["file"])) {
    echo json_encode(["error" => "geojson ファイルをアップロードしてください"]);
    exit;
}

// アップロードされたファイルの拡張子を確認
$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
if (!in_array($fileExt, ["geojson"])) {
    echo json_encode(["error" => "許可されていないファイル形式です (geojson のみ許可)"]);
    exit;
}

// 一意のファイル名を作成
$fileBaseName = uniqid();
$geojsonPath = $uploadDir . $fileBaseName . ".geojson";

// geojson ファイルの保存
if (!move_uploaded_file($_FILES["file"]["tmp_name"], $geojsonPath)) {
    echo json_encode(["error" => "geojson の保存に失敗しました"]);
    exit;
}

echo json_encode([
    "success" => true,
    "file" => $geojsonPath,
    "dir" => $subDir
]);


//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// ベースのアップロードディレクトリ
//$baseUploadDir = "/var/www/html/public_html/uploads/";
//
//// JSON データの取得 (ディレクトリ名取得)
//$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default"; // 安全なディレクトリ名に変換
//
//// フルパスのアップロードディレクトリ
//$uploadDir = $baseUploadDir . $subDir . "/";
//
//// ディレクトリがない場合は作成
//if (!is_dir($uploadDir)) {
//    if (!mkdir($uploadDir, 0777, true)) {
//        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
//        exit;
//    }
//}
//
//// geojson のチェック
//if (!isset($_FILES["file"])) {
//    echo json_encode(["error" => "geojson ファイルをアップロードしてください"]);
//    exit;
//}
//
//// アップロードされたファイルの拡張子を確認
//$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
//if (!in_array($fileExt, ["geojson"])) {
//    echo json_encode(["error" => "許可されていないファイル形式です (geojson のみ許可)"]);
//    exit;
//}
//
//// 一意のファイル名を作成（保存時は `.gdojson` に統一）
//$fileBaseName = uniqid();
//$tiffPath = $uploadDir . $fileBaseName . ".geojson";
//
//// gdojson ファイルの保存
//if (!move_uploaded_file($_FILES["file"]["tmp_name"], $tiffPath)) {
//    echo json_encode(["error" => "geojson の保存に失敗しました"]);
//    exit;
//}
//
//echo json_encode([
//    "success" => true,
//    "file" => $tiffPath,
//    "dir" => $subDir
//]);
//?>
