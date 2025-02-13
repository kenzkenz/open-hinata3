<?php
require_once "pwd.php";

// ファイルアップロード処理
function uploadFile($file, $dir)
{
    $file_tmp = $file["tmp_name"];
    $original_name = $file["name"];
    $file_size = $file["size"];
    $max_size = 20 * 1024 * 1024; // 20MB

    // ファイルサイズが20MBを超えている場合、エラーを返す
    if ($file_size > $max_size) {
        echo json_encode(['error' => 'ファイルサイズが20MBを超えています']);
        exit;
    }

    $extension = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
    $filename = pathinfo($original_name, PATHINFO_FILENAME);

    // 対応する拡張子の検査
    if (!in_array($extension, ['kml', 'kmz'])) {
        echo json_encode(['error' => '対応していない拡張子です']);
        exit;
    }

    // アップロード先フォルダを作成
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $filePath = $dir . $original_name;
    $counter = 1;

    // 既存のファイル名をチェックして連番を付ける
    while (file_exists($filePath)) {
        $new_name = $filename . "(" . $counter . ")." . $extension;
        $filePath = $dir . $new_name;
        $counter++;
    }

    if (@move_uploaded_file($file_tmp, $filePath)) {
        return ['file' => basename($filePath)];
    } else {
        return ['error' => 'ファイルの移動に失敗しました'];
    }
}

// メイン処理
if (isset($_FILES["file_1"], $_POST["userId"])) {
    $userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["userId"]); // ユーザーIDのサニタイズ
    $dir = "./uploads/" . $userId . "/";

    // file_1 のアップロード
    $file1Response = uploadFile($_FILES["file_1"], $dir);
    echo json_encode(['file_1' => $file1Response]);
} else {
    echo json_encode(['error' => '必要なパラメータが不足しています']);
}
