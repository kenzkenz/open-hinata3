<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// JSON データの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["url2"]) || empty($data["url2"])) {
    echo json_encode(["error" => "ディレクトリパスが指定されていません"]);
    exit;
}

$dirPath = realpath($data["url2"]);

// ディレクトリが存在しない場合
if ($dirPath === false || !is_dir($dirPath)) {
    echo json_encode(["error" => "指定されたディレクトリが見つかりません"]);
    exit;
}

// ディレクトリの中身を削除する関数
function deleteDirectory($dir) {
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        $filePath = $dir . DIRECTORY_SEPARATOR . $file;
        if (is_dir($filePath)) {
            deleteDirectory($filePath); // 再帰的に削除
        } else {
            unlink($filePath);
        }
    }
    return rmdir($dir);
}

// ディレクトリの削除実行
if (deleteDirectory($dirPath)) {
    echo json_encode(["success" => "ディレクトリが削除されました"]);
} else {
    echo json_encode(["error" => "ディレクトリの削除に失敗しました"]);
}
?>






