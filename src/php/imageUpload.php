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

    // 対応する拡張子の検査
    if (!in_array($extension, ['gif', 'jpg', 'jpeg', 'png', 'tiff', 'tfw', 'tif'])) {
        echo json_encode(['error' => '対応していない拡張子です']);
        exit;
    }

    // 画像ファイルの検証
    if (in_array($extension, ['gif', 'jpg', 'jpeg', 'png', 'tiff', 'tif']) && !@exif_imagetype($file_tmp)) {
        echo json_encode(['error' => '無効な画像ファイルです']);
        exit;
    }

    // 新しいファイル名を生成
    $newFileName = uniqid(mt_rand(), false) . "." . $extension;

    // ファイルを移動
    if (@move_uploaded_file($file_tmp, $dir . $newFileName)) {
        echo json_encode(['file' => $newFileName]);
    } else {
        echo json_encode(['error' => 'ファイルの移動に失敗しました']);
    }
}

// メイン処理
$dir = './image/';
if (isset($_FILES["file"])) {
    uploadFile($_FILES["file"], $dir);
} else {
    echo json_encode(['error' => 'ファイルがアップロードされていません']);
}
?>
