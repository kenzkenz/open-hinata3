<?php


ob_clean(); // 出力バッファをクリア
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

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

// TIFF & TFW のチェック
if (!isset($_FILES["file"]) || !isset($_FILES["tfw"])) {
    echo json_encode(["error" => "TIFF と TFW の両方をアップロードしてください"]);
    exit;
}

// 一意のファイル名を作成
$fileBaseName = uniqid();
$tiffPath = $uploadDir . $fileBaseName . ".tif";
$tfwPath = $uploadDir . $fileBaseName . ".tfw";

// TIFF ファイルの保存
if (!move_uploaded_file($_FILES["file"]["tmp_name"], $tiffPath)) {
    echo json_encode(["error" => "TIFF の保存に失敗しました"]);
    exit;
}

// TFW ファイルの保存
if (!move_uploaded_file($_FILES["tfw"]["tmp_name"], $tfwPath)) {
    unlink($tiffPath); // TIFF を削除
    echo json_encode(["error" => "TFW の保存に失敗しました"]);
    exit;
}

echo json_encode(["success" => true, "file" => $tiffPath, "tfw" => $tfwPath, "dir" => $subDir]);


//
//ob_clean(); // 出力バッファをクリア
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//$uploadDir = "/var/www/html/public_html/uploads/";
//
//if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
//
//// TIFF & TFW のチェック
//if (!isset($_FILES["file"]) || !isset($_FILES["tfw"])) {
//    echo json_encode(["error" => "TIFF と TFW の両方をアップロードしてください"]);
//    exit;
//}
//
//// 一意のファイル名を作成
//$fileBaseName = uniqid();
//$tiffPath = $uploadDir . $fileBaseName . ".tif";
//$tfwPath = $uploadDir . $fileBaseName . ".tfw";
//
//// TIFF ファイルの保存
//if (!move_uploaded_file($_FILES["file"]["tmp_name"], $tiffPath)) {
//    echo json_encode(["error" => "TIFF の保存に失敗しました"]);
//    exit;
//}
//
//// TFW ファイルの保存
//if (!move_uploaded_file($_FILES["tfw"]["tmp_name"], $tfwPath)) {
//    unlink($tiffPath); // TIFF を削除
//    echo json_encode(["error" => "TFW の保存に失敗しました"]);
//    exit;
//}
//
//echo json_encode(["success" => true, "file" => $tiffPath, "tfw" => $tfwPath]);
//
?>
