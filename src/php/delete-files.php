<?php
header("Content-Type: application/json");

// JSONデータを受け取る
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["dir"]) || !isset($data["keyword"])) {
    echo json_encode(["status" => "error", "message" => "無効なリクエスト"]);
    exit;
}

// URLのパス部分を取得し、サーバーのルートパスと結合
$parsed_url = parse_url($data["dir"]);
$dir = $_SERVER["DOCUMENT_ROOT"] . $parsed_url["path"];
$keyword = $data["keyword"];

if (!is_dir($dir)) {
    echo json_encode(["status" => "error", "message" => "ディレクトリが存在しません", "dir" => $dir]);
    exit;
}

// ファイルを削除
$filesDeleted = [];
foreach (glob("$dir/*$keyword*") as $file) {
    if (is_file($file) && unlink($file)) {
        $filesDeleted[] = basename($file);
    }
}

// JSONを返す
echo json_encode([
    "status" => "success",
    "message" => count($filesDeleted) . " 個のファイルを削除しました",
    "deleted_files" => $filesDeleted
]);
?>
