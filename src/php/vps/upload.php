<?php

ob_clean(); // 出力バッファをクリア
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$uploadDir = "/var/www/html/public_html/uploads/";

if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

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

echo json_encode(["success" => true, "file" => $tiffPath, "tfw" => $tfwPath]);


//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// アップロードディレクトリ
//$uploadDir = "/var/www/html/public_html/uploads/";
//
//// `uploads` ディレクトリがない場合は作成
//if (!is_dir($uploadDir)) {
//    if (!mkdir($uploadDir, 0777, true)) {
//        error_log("エラー: アップロードディレクトリの作成に失敗", 3, $uploadDir . "/error_log.txt");
//        echo json_encode(["error" => "アップロードディレクトリの作成に失敗しました"]);
//        exit;
//    }
//}
//
//// ファイルが送信されているか確認
//if (!isset($_FILES["file"])) {
//    error_log("エラー: ファイルが送信されていません", 3, $uploadDir . "/error_log.txt");
//    echo json_encode(["error" => "ファイルが送信されていません"]);
//    exit;
//}
//
//// アップロードエラーの確認
//if ($_FILES["file"]["error"] != UPLOAD_ERR_OK) {
//    error_log("アップロードエラー: " . $_FILES["file"]["error"], 3, $uploadDir . "/error_log.txt");
//    echo json_encode(["error" => "ファイルアップロードに失敗しました (エラーコード: " . $_FILES["file"]["error"] . ")"]);
//    exit;
//}
//
//// MIME タイプの確認
//$fileMimeType = mime_content_type($_FILES["file"]["tmp_name"]);
//if ($fileMimeType !== "image/tiff") {
//    error_log("エラー: 許可されていない MIME タイプ - " . $fileMimeType, 3, $uploadDir . "/error_log.txt");
//    echo json_encode(["error" => "許可されていないファイル形式です (TIFF のみ許可)"]);
//    exit;
//}
//
//// ファイル名の決定
//$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
//$fileName = uniqid() . "." . $fileExt;
//$filePath = $uploadDir . $fileName;
//
//// `move_uploaded_file()` の実行とエラーログの記録
//if (!move_uploaded_file($_FILES["file"]["tmp_name"], $filePath)) {
//    error_log("エラー: move_uploaded_file() 失敗 - " . $_FILES["file"]["tmp_name"] . " → " . $filePath, 3, $uploadDir . "/error_log.txt");
//    echo json_encode(["error" => "ファイルの保存に失敗しました"]);
//    exit;
//}
//
//// アップロード成功
//chmod($filePath, 0644);
//error_log("ファイルアップロード成功: " . $filePath, 3, $uploadDir . "/error_log.txt");
//echo json_encode(["success" => true, "file" => $filePath]);

?>
