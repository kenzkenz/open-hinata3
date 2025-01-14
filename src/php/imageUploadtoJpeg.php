<?php
require_once "pwd.php";

// ファイルアップロード処理を関数化
function uploadFile($file, $dir, $baseName = null)
{
    $file_tmp = $file["tmp_name"];
    $original_name = $file["name"];
    $file_size = $file["size"]; // ファイルサイズを取得
    $max_size = 20 * 1024 * 1024; // 20MB

    // ファイルサイズが20MBを超えている場合、エラーを返す
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
    if (in_array($extension, ['gif', 'jpg', 'jpeg', 'png', 'tiff', 'tfw', 'tif'])) {
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

// GeoTIFF を JPEG に変換して保存する関数
function saveGeoTiffAsJpeg($tiffPath)
{
    $pathInfo = pathinfo($tiffPath);
    $directory = $pathInfo['dirname'];
    $filenameWithoutExtension = $pathInfo['filename'];

    // 出力先のJPEGファイルパスを定義
    $jpegPath = $directory . DIRECTORY_SEPARATOR . $filenameWithoutExtension . '.jpg';

    try {
        $imagick = new Imagick();
        $imagick->readImage($tiffPath);

        // 元のピクセル寸法を取得
        $canvasWidth = $imagick->getImageWidth();
        $canvasHeight = $imagick->getImageHeight();

        // デバッグ用のログ
        error_log("Width (px): $canvasWidth, Height (px): $canvasHeight");

        // 不透明な背景を追加
        $background = new Imagick();
        $background->newImage($canvasWidth, $canvasHeight, new ImagickPixel('white'));
        $background->compositeImage($imagick, Imagick::COMPOSITE_OVER, 0, 0);

        // ピクセル寸法を保持
        $background->setImageExtent($canvasWidth, $canvasHeight);

        // JPEG に変換
        $background->setImageFormat('jpeg');
        $background->setImageCompression(Imagick::COMPRESSION_JPEG);
        $background->setImageCompressionQuality(100); // 品質を最大化
        $background->writeImage($jpegPath);

        $background->clear();
        $background->destroy();

        $imagick->clear();
        $imagick->destroy();

        return $jpegPath;
    } catch (Exception $e) {
        error_log('Error converting GeoTIFF: ' . $e->getMessage());
        return null;
    }
}

// メイン処理
$dir = './image/';
$response = [];
$baseName = null;

if (isset($_FILES["file_1"])) {
    $response['file1'] = uploadFile($_FILES["file_1"], $dir);
    $baseName = pathinfo($response['file1'], PATHINFO_FILENAME);
}

if (isset($_FILES["file_2"])) {
    $response['file2'] = uploadFile($_FILES["file_2"], $dir, $baseName);
}

if (isset($response['file1'])) {
    $tiffPath = $dir . $response['file1'];
    $jpegPath = saveGeoTiffAsJpeg($tiffPath);

    if ($jpegPath) {
        $response['file3'] = basename($jpegPath);
    } else {
        $response['error'] = 'GeoTIFF から JPEG への変換に失敗しました';
    }
}

// 結果をJSONで出力
echo json_encode($response);
?>
