<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_FILES["file"]["error"] != UPLOAD_ERR_OK) {
    echo json_encode(["error" => "ファイルアップロードに失敗しました"]);
    exit;
}

$uploadDir = "/var/www/html/uploads/";
$filePath = $uploadDir . basename($_FILES["file"]["name"]);

if (move_uploaded_file($_FILES["file"]["tmp_name"], $filePath)) {
    echo json_encode(["success" => true, "file" => $filePath]);
} else {
    echo json_encode(["error" => "ファイルの保存に失敗しました"]);
}
?>
