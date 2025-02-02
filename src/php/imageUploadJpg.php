<?php
require_once "pwd.php";

// ファイルアップロード処理を関数化
function uploadFile($file, $dir, $baseName = null)
{
    $file_tmp = $file["tmp_name"];
    $original_name = $file["name"];
    $file_size = $file["size"]; // ファイルサイズを取得
    $max_size = 20 * 1024 * 2024; // 10MB

    // ファイルサイズが10MBを超えている場合、エラーを返す
    if ($file_size > $max_size) {
        $response = array('error' => 'ファイルサイズが20MBを超えています');
        echo json_encode($response);
        exit; // 処理終了
    }

    $extension = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));

    // ベース名が指定されていない場合、新しい名前を生成
    if ($baseName === null) {
        $baseName = uniqid(mt_rand(), false);
    }

    // 対応する拡張子の検査
    if (in_array($extension, ['gif', 'jpg', 'jpeg', 'png', 'tiff', 'tfw', 'tif', 'jgw', 'pgw'])) {
        $image = "$baseName.$extension";
    } else {
        $response = array('error' => '対応していない拡張子です');
        echo json_encode($response);
        exit; // 処理終了
    }

    // 画像ファイルの場合のみ、さらに検査
    if (in_array($extension, ['gif', 'jpg', 'jpeg', 'png', 'tiff', 'tif'])) {
        if (!@exif_imagetype($file_tmp)) {
            $response = array('error' => '無効な画像ファイルです');
            echo json_encode($response);
            exit; // 処理終了
        }
    }

    // ファイル移動
    $result = @move_uploaded_file($file_tmp, $dir . $image);
    if ($result) {
        return $image;
    } else {
        $response = array('error' => 'ファイルの移動に失敗しました');
        echo json_encode($response);
        exit; // 処理終了
    }
}

// メイン処理
$dir = './image/';
$response = [];
$baseName = null;

if (isset($_FILES["file_1"])) {
    $response['file1'] = uploadFile($_FILES["file_1"], $dir);
    // ファイル1のベース名を保存
    $baseName = pathinfo($response['file1'], PATHINFO_FILENAME);
}

if (isset($_FILES["file_2"])) {
    if ($baseName !== null) {
        // ファイル2の名前をファイル1に合わせる
        $response['file2'] = uploadFile($_FILES["file_2"], $dir, $baseName);
    } else {
        $response['file2'] = uploadFile($_FILES["file_2"], $dir);
    }
}

// 結果をJSONで出力
echo json_encode($response);
?>
