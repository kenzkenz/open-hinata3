<?php
require_once "pwd.php";

// ファイルアップロード処理
function uploadFile($file, $dir, $code, $isSecondary = false, $primaryFileName = "")
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

    // JPEG系ファイルはすべて.jpgに統一
    if (in_array($extension, ['jpeg', 'jpg'])) {
        $extension = 'jpg';
    }

    // 対応する拡張子の検査
    if (!in_array($extension, ['gif', 'jpg', 'png', 'tfw','jgw'])) {
        echo json_encode(['error' => '対応していない拡張子です']);
        exit;
    }

    // 新しいファイル名を生成
    if ($isSecondary) {
        $newFileName = pathinfo($primaryFileName, PATHINFO_FILENAME) . "." . $extension;
    } else {
        $newFileName = $code . '-' . uniqid(mt_rand(), false) . "." . $extension;
    }

    // アップロード先フォルダを作成
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $filePath = $dir . $newFileName;

    if (@move_uploaded_file($file_tmp, $filePath)) {
        $response = ['file' => $newFileName];

        // file_1 の画像を縮小
        if (!$isSecondary && $extension === 'jpg') {
            $resizedFileName = $dir . 'thumbnail-' . pathinfo($newFileName, PATHINFO_FILENAME) . ".jpg";
            if (resizeJpg($filePath, $resizedFileName)) {
                $response['thumbnail'] = basename($resizedFileName);
            } else {
                $response['error'] = '画像の縮小に失敗しました';
            }
        }
        return $response;
    } else {
        return ['error' => 'ファイルの移動に失敗しました'];
    }
}

// JPG を横幅100pxに縮小する関数（Imagick使用）
function resizeJpg($inputFile, $outputFile)
{
    try {
        $image = new Imagick($inputFile);
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
if (isset($_FILES["file_1"], $_FILES["file_2"], $_POST["code"], $_POST["userId"])) {
    $code = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["code"]); // コードのサニタイズ
    $userId = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["userId"]); // ユーザーIDのサニタイズ
    $dir = "./uploads/" . $userId . "/";

    // file_1 のアップロード
    $file1Response = uploadFile($_FILES["file_1"], $dir, $code);

    if (!isset($file1Response['error'])) {
        // file_2 のアップロード（file_1の名前をもとにする）
        $file2Response = uploadFile($_FILES["file_2"], $dir, $code, true, $file1Response['file']);
    } else {
        $file2Response = ['error' => 'file_1 のアップロードに失敗しました'];
    }

    echo json_encode(['file_1' => $file1Response, 'file_2' => $file2Response]);
} else {
    echo json_encode(['error' => '必要なパラメータが不足しています']);
}
