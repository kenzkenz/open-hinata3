<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// JSON データの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["url2"]) || empty($data["url2"])) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]);
    exit;
}

$filePath = realpath($data["url2"]);

// ファイルが存在しない場合
if ($filePath === false || !file_exists($filePath)) {
    echo json_encode(["error" => "指定されたファイルが見つかりません"]);
    exit;
}

// ファイル削除
if (unlink($filePath)) {
    echo json_encode(["success" => "ファイルが削除されました"]);
} else {
    echo json_encode(["error" => "ファイルの削除に失敗しました"]);
}

?>





