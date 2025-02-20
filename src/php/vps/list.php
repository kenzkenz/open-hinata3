<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// クエリパラメータ `dir` を取得
$directory = isset($_GET['dir']) ? realpath($_GET['dir']) : __DIR__;

//// セキュリティ対策: `realpath()` で解決し、指定ディレクトリが `uploads/` 内にあるか確認
//$uploads_base = realpath(__DIR__); // `list.php` があるディレクトリを基準
//if (!$directory || strpos($directory, $uploads_base) !== 0 || !is_dir($directory)) {
//    http_response_code(400);
//    echo json_encode(["error" => "Invalid directory"]);
//    exit;
//}

// 指定ディレクトリのファイル一覧を取得
$files = array_values(array_filter(scandir($directory), function($file) {
    return preg_match('/^thumbnail-.*\.(jpg|jpeg)$/i', $file);
}));

// JSON で返す
header('Content-Type: application/json');
echo json_encode($files);
