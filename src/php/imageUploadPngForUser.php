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

    // PNG はそのまま PNG
    if ($extension === 'png') {
        $extension = 'png';
    }

    // 対応する拡張子の検査
    if (!in_array($extension, ['gif', 'jpg', 'png', 'tfw', 'jgw','pgw'])) {
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

        // PNG を JPG に変換して縮小
        if (!$isSecondary && $extension === 'png') {
            $jpgFileName = $dir . 'thumbnail-' . pathinfo($newFileName, PATHINFO_FILENAME) . ".jpg";
            if (convertPngToJpg($filePath, $jpgFileName)) {
                $response['thumbnail'] = basename($jpgFileName);
            } else {
                $response['error'] = 'PNGの変換に失敗しました';
            }
        }
        return $response;
    } else {
        return ['error' => 'ファイルの移動に失敗しました'];
    }
}

// PNG を横幅100pxの JPG に変換する関数（Imagick使用）
function convertPngToJpg($inputFile, $outputFile)
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

