<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// フォームデータから取得
$serverUrl = $_POST["serverUrl"] ?? null;

if (!$serverUrl) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]);
    exit;
}

$filePath = realpath($serverUrl);

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




