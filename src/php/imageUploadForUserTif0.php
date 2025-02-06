<?php
require_once "pwd.php";

// ファイルアップロード処理
function uploadFile($file, $dir, $code)
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

    // 新しいファイル名を生成 (code-ランダムID.拡張子)
    $newFileName = $code . '-' . uniqid(mt_rand(), false) . "." . $extension;

    // アップロード先フォルダを作成
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $filePath = $dir . $newFileName;

    if (@move_uploaded_file($file_tmp, $filePath)) {
        $response = ['file' => $newFileName];

        // TIFFをJPGに変換
        if (in_array($extension, ['tiff', 'tif'])) {
            $jpgFileName = $dir . 'thumbnail-' . pathinfo($newFileName, PATHINFO_FILENAME) . ".jpg";
            if (convertTiffToJpg($filePath, $jpgFileName)) {
                $response['thumbnail'] = basename($jpgFileName);
            } else {
                $response['error'] = 'TIFFの変換に失敗しました';
            }
        }
        echo json_encode($response);
    } else {
        echo json_encode(['error' => 'ファイルの移動に失敗しました']);
    }
}

// TIFFをJPGに変換する関数（Imagick使用）
function convertTiffToJpg($inputFile, $outputFile)
{
    try {
        $image = new Imagick($inputFile);
        $image->setImageFormat('jpeg');
        $image->resizeImage(100, 0, Imagick::FILTER_LANCZOS, 1); // 横100px、アスペクト比維持
        $image->setImageCompressionQuality(90);
        $image->writeImage($outputFile);
        $image->destroy();
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// メイン処理
if (isset($_FILES["file"], $_POST["code"], $_POST["userId"])) {
    $code = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["code"]); // コードのサニタイズ
    $userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["userId"]); // ユーザーIDのサニタイズ
    $dir = "./uploads/" . $userId . "/";
    uploadFile($_FILES["file"], $dir, $code);
} else {
    echo json_encode(['error' => '必要なパラメータが不足しています']);
}

//require_once "pwd.php";
//
//// ファイルアップロード処理
//function uploadFile($file, $dir, $code)
//{
//    $file_tmp = $file["tmp_name"];
//    $original_name = $file["name"];
//    $file_size = $file["size"];
//    $max_size = 20 * 1024 * 1024; // 20MB
//
//    // ファイルサイズが20MBを超えている場合、エラーを返す
//    if ($file_size > $max_size) {
//        echo json_encode(['error' => 'ファイルサイズが20MBを超えています']);
//        exit;
//    }
//
//    $extension = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
//
//    // 対応する拡張子の検査
//    if (!in_array($extension, ['gif', 'jpg', 'jpeg', 'png', 'tiff', 'tfw', 'tif'])) {
//        echo json_encode(['error' => '対応していない拡張子です']);
//        exit;
//    }
//
//    // 画像ファイルの検証
//    if (in_array($extension, ['gif', 'jpg', 'jpeg', 'png', 'tiff', 'tif']) && !@exif_imagetype($file_tmp)) {
//        echo json_encode(['error' => '無効な画像ファイルです']);
//        exit;
//    }
//
//    // 新しいファイル名を生成 (code-ランダムID.拡張子)
//    $newFileName = $code . '-' . uniqid(mt_rand(), false) . "." . $extension;
//
//    // ファイルを移動
//    if (!is_dir($dir)) {
//        mkdir($dir, 0777, true);
//    }
//
//    if (@move_uploaded_file($file_tmp, $dir . $newFileName)) {
//        echo json_encode(['file' => $newFileName]);
//    } else {
//        echo json_encode(['error' => 'ファイルの移動に失敗しました']);
//    }
//}
//
//// メイン処理
//if (isset($_FILES["file"], $_POST["code"], $_POST["userId"])) {
//    $code = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["code"]); // コードのサニタイズ
//    $userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["userId"]); // ユーザーIDのサニタイズ
//    $dir = "./uploads/" . $userId . "/";
//    uploadFile($_FILES["file"], $dir, $code);
//} else {
//    echo json_encode(['error' => '必要なパラメータが不足しています']);
//}
?>
