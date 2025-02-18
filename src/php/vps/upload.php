<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// `.aux.xml` の生成を防ぐ
putenv("GDAL_PAM_ENABLED=NO");

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";

// JSON データの取得 (ディレクトリ名取得)
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default";

// フルパスのアップロードディレクトリ
$uploadDir = $baseUploadDir . $subDir . "/";

// ディレクトリがない場合は作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
}

// アップロードされたファイルの確認
if (!isset($_FILES["file"])) {
    echo json_encode(["error" => "ファイルをアップロードしてください"]);
    exit;
}

// アップロードされたファイルの拡張子を確認
$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
if (!in_array($fileExt, ["tif", "tiff", "jpg", "jpeg", "png", "pdf"])) {
    echo json_encode(["error" => "許可されていないファイル形式です (TIFF, JPEG, PNG, PDF のみ許可)"]);
    exit;
}

// 一意のファイル名を作成
$fileBaseName = uniqid();
$imagePath = $uploadDir . $fileBaseName . "." . $fileExt;

// ファイルの保存
if (!move_uploaded_file($_FILES["file"]["tmp_name"], $imagePath)) {
    echo json_encode(["error" => "ファイルの保存に失敗しました"]);
    exit;
}

// PDF は単独で処理
if ($fileExt === "pdf") {
    $jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";
    $pdfCommand = "convert -density 150 " . escapeshellarg($imagePath) . "[0] -resize 100x -quality 90 " . escapeshellarg($jpegThumbnailPath);
    exec($pdfCommand . " 2>&1", $output, $returnVar);

    if ($returnVar !== 0) {
        echo json_encode(["error" => "PDF のサムネイル作成に失敗しました", "output" => $output]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "file" => $imagePath,
        "thumbnail" => $jpegThumbnailPath,
        "dir" => $subDir
    ]);
    exit;
}

// ワールドファイルのチェック (PDF 以外)
$worldFileExt = match ($fileExt) {
    "tif", "tiff" => "tfw",
    "jpg", "jpeg" => "jgw",
    "png" => "pgw",
    default => null
};

if (!isset($_FILES["worldfile"])) {
    echo json_encode(["error" => "ワールドファイル (.$worldFileExt) をアップロードしてください"]);
    exit;
}

$worldFilePath = $uploadDir . $fileBaseName . ".$worldFileExt";

// ワールドファイルの保存
if (!move_uploaded_file($_FILES["worldfile"]["tmp_name"], $worldFilePath)) {
    unlink($imagePath);
    echo json_encode(["error" => "ワールドファイルの保存に失敗しました"]);
    exit;
}

// **白黒 TIFF の処理**
function isGrayscale($filePath)
{
    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
}

if ($fileExt === "tif" || $fileExt === "tiff") {
    if (isGrayscale($imagePath)) {
        $grayFilePath = $uploadDir . $fileBaseName . "_gray.tif";
        $outputFilePath = $uploadDir . $fileBaseName . "_processed.tif";

        exec("gdal_translate -expand gray " . escapeshellarg($imagePath) . " " . escapeshellarg($grayFilePath));
        exec("gdal_translate -co TILED=YES -co COMPRESS=DEFLATE " . escapeshellarg($grayFilePath) . " " . escapeshellarg($outputFilePath));
        exec("gdaladdo --config COMPRESS_OVERVIEW DEFLATE -r average " . escapeshellarg($outputFilePath) . " 2 4 8 16");

        unlink($imagePath);
        rename($outputFilePath, $imagePath);
    }
}

// **JPEG サムネイルの作成 (PDF 以外)**
$jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";

if ($fileExt === "tif" || $fileExt === "tiff" || $fileExt === "png") {
    exec("gdal_translate -of JPEG -co PAM=NO -outsize 100 0 " . escapeshellarg($imagePath) . " " . escapeshellarg($jpegThumbnailPath));
} else {
    $sourceImage = imagecreatefromjpeg($imagePath);
    list($width, $height) = getimagesize($imagePath);
    $newWidth = 100;
    $newHeight = ($height / $width) * 100;

    $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    imagejpeg($thumbnail, $jpegThumbnailPath, 90);
    imagedestroy($sourceImage);
    imagedestroy($thumbnail);
}

// **成功時のレスポンス**
echo json_encode([
    "success" => true,
    "file" => $imagePath,
    "worldfile" => $worldFilePath,
    "thumbnail" => $jpegThumbnailPath,
    "dir" => $subDir
]);


//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// `.aux.xml` の生成を防ぐ
//putenv("GDAL_PAM_ENABLED=NO");
//
//// ベースのアップロードディレクトリ
//$baseUploadDir = "/var/www/html/public_html/uploads/";
//
//// JSON データの取得 (ディレクトリ名取得)
//$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default";
//
//// フルパスのアップロードディレクトリ
//$uploadDir = $baseUploadDir . $subDir . "/";
//
//// ディレクトリがない場合は作成
//if (!is_dir($uploadDir)) {
//    if (!mkdir($uploadDir, 0777, true)) {
//        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
//        exit;
//    }
//}
//
//// TIFF & JPEG チェック
//if (!isset($_FILES["file"])) {
//    echo json_encode(["error" => "TIFF または JPEG ファイルをアップロードしてください"]);
//    exit;
//}
//
//// アップロードされたファイルの拡張子を確認
//$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
//if (!in_array($fileExt, ["tif", "tiff", "jpg", "jpeg", "png", "pdf"])) {
//    echo json_encode(["error" => "許可されていないファイル形式です (TIFF, JPEG, PNG, PDF のみ許可)"]);
//    exit;
//}
//
//// ワールドファイルのチェック
//$worldFileExt = match ($fileExt) {
//    "tif", "tiff" => "tfw",
//    "jpg", "jpeg" => "jgw",
//    "png" => "pgw",
//    default => null
//};
//
//if (!isset($_FILES["worldfile"])) {
//    echo json_encode(["error" => "ワールドファイル (.$worldFileExt) をアップロードしてください"]);
//    exit;
//}
//
//// 一意のファイル名を作成
//$fileBaseName = uniqid();
//if (in_array($fileExt, ["jpg", "jpeg"])) {
//    $imagePath = $uploadDir . $fileBaseName . ".jpg";
//    $worldFilePath = $uploadDir . $fileBaseName . ".jgw";
//} else {
//    $imagePath = $uploadDir . $fileBaseName . ".tif";
//    $worldFilePath = $uploadDir . $fileBaseName . ".tfw";
//}
//
//// 画像ファイルの保存
//if (!move_uploaded_file($_FILES["file"]["tmp_name"], $imagePath)) {
//    echo json_encode(["error" => "画像ファイルの保存に失敗しました"]);
//    exit;
//}
//
//// ワールドファイルの保存
//if (!move_uploaded_file($_FILES["worldfile"]["tmp_name"], $worldFilePath)) {
//    unlink($imagePath);
//    echo json_encode(["error" => "ワールドファイルの保存に失敗しました"]);
//    exit;
//}
//
//// **白黒 TIFF の処理**
//function isGrayscale($filePath)
//{
//    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
//    $infoJson = json_decode(implode("\n", $infoOutput), true);
//    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
//}
//
//if ($fileExt === "tif" || $fileExt === "tiff") {
//    if (isGrayscale($imagePath)) {
//        $grayFilePath = $uploadDir . $fileBaseName . "_gray.tif";
//        $outputFilePath = $uploadDir . $fileBaseName . "_processed.tif";
//
//        exec("gdal_translate -expand gray " . escapeshellarg($imagePath) . " " . escapeshellarg($grayFilePath));
//        exec("gdal_translate -co TILED=YES -co COMPRESS=DEFLATE " . escapeshellarg($grayFilePath) . " " . escapeshellarg($outputFilePath));
//        exec("gdaladdo --config COMPRESS_OVERVIEW DEFLATE -r average " . escapeshellarg($outputFilePath) . " 2 4 8 16");
//
//        unlink($imagePath); // 元の画像を削除
//        rename($outputFilePath, $imagePath); // 処理後の画像を元の名前に変更
//    }
//}
//
//// **JPEG サムネイルの作成**
//$jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";
//
//if ($fileExt === "tif" || $fileExt === "tiff" || $fileExt === "png") {
//    $gdalCommand = "gdal_translate -of JPEG -co PAM=NO -outsize 100 0 " . escapeshellarg($imagePath) . " " . escapeshellarg($jpegThumbnailPath);
//    exec($gdalCommand . " 2>&1", $output, $returnVar);
//
//    $auxXmlFile = $jpegThumbnailPath . ".aux.xml";
//    if (file_exists($auxXmlFile)) {
//        unlink($auxXmlFile);
//    }
//
//    if ($returnVar !== 0) {
//        echo json_encode(["error" => "TIFF の JPEG サムネイル作成に失敗しました", "output" => $output]);
//        exit;
//    }
//
//
//} elseif ($fileExt === "pdf") {
//    $pdfCommand = "convert -density 150 " . escapeshellarg($imagePath) . "[0] -resize 100x -quality 90 " . escapeshellarg($jpegThumbnailPath);
//    exec($pdfCommand . " 2>&1", $output, $returnVar);
//
//    if ($returnVar !== 0) {
//        echo json_encode(["error" => "PDF のサムネイル作成に失敗しました", "output" => $output]);
//        exit;
//    }
//} else {
//    $sourceImage = imagecreatefromjpeg($imagePath);
//    list($width, $height) = getimagesize($imagePath);
//    $newWidth = 100;
//    $newHeight = ($height / $width) * 100;
//
//    $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
//    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
//
//    if (!imagejpeg($thumbnail, $jpegThumbnailPath, 90)) {
//        echo json_encode(["error" => "JPEG サムネイルの保存に失敗しました"]);
//        exit;
//    }
//
//    imagedestroy($sourceImage);
//    imagedestroy($thumbnail);
//}
//
//// **成功時のレスポンス**
//echo json_encode([
//    "success" => true,
//    "file" => $imagePath,
//    "worldfile" => $worldFilePath,
//    "thumbnail" => $jpegThumbnailPath,
//    "dir" => $subDir
//]);
//








//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// `.aux.xml` の生成を防ぐ
//putenv("GDAL_PAM_ENABLED=NO");
//
//// ベースのアップロードディレクトリ
//$baseUploadDir = "/var/www/html/public_html/uploads/";
//
//// JSON データの取得 (ディレクトリ名取得)
//$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default";
//
//// フルパスのアップロードディレクトリ
//$uploadDir = $baseUploadDir . $subDir . "/";
//
//// ディレクトリがない場合は作成
//if (!is_dir($uploadDir)) {
//    if (!mkdir($uploadDir, 0777, true)) {
//        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
//        exit;
//    }
//}
//
//// TIFF & JPEG チェック
//if (!isset($_FILES["file"])) {
//    echo json_encode(["error" => "TIFF または JPEG ファイルをアップロードしてください"]);
//    exit;
//}
//
//// アップロードされたファイルの拡張子を確認
//$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
//if (!in_array($fileExt, ["tif", "tiff", "jpg", "jpeg", "png"])) {
//    echo json_encode(["error" => "許可されていないファイル形式です (TIFF, JPEG, PNG のみ許可)"]);
//    exit;
//}
//
//// ワールドファイルのチェック
//$worldFileExt = match ($fileExt) {
//    "tif", "tiff" => "tfw",
//    "jpg", "jpeg" => "jgw",
//    "png" => "pgw",
//    default => null
//};
//
//if (!isset($_FILES["worldfile"])) {
//    echo json_encode(["error" => "ワールドファイル (.$worldFileExt) をアップロードしてください"]);
//    exit;
//}
//
//// 一意のファイル名を作成
//$fileBaseName = uniqid();
//if (in_array($fileExt, ["jpg", "jpeg"])) {
//    $imagePath = $uploadDir . $fileBaseName . ".jpg";
//    $worldFilePath = $uploadDir . $fileBaseName . ".jgw";
//} else {
//    $imagePath = $uploadDir . $fileBaseName . ".tif";
//    $worldFilePath = $uploadDir . $fileBaseName . ".tfw";
//}
//
//// 画像ファイルの保存
//if (!move_uploaded_file($_FILES["file"]["tmp_name"], $imagePath)) {
//    echo json_encode(["error" => "画像ファイルの保存に失敗しました"]);
//    exit;
//}
//
//// ワールドファイルの保存
//if (!move_uploaded_file($_FILES["worldfile"]["tmp_name"], $worldFilePath)) {
//    unlink($imagePath);
//    echo json_encode(["error" => "ワールドファイルの保存に失敗しました"]);
//    exit;
//}
//
//// **白黒 TIFF の処理**
//function isGrayscale($filePath)
//{
//    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
//    $infoJson = json_decode(implode("\n", $infoOutput), true);
//    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
//}
//
//if ($fileExt === "tif" || $fileExt === "tiff") {
//    if (isGrayscale($imagePath)) {
//        $grayFilePath = $uploadDir . $fileBaseName . "_gray.tif";
//        $outputFilePath = $uploadDir . $fileBaseName . "_processed.tif";
//
//        exec("gdal_translate -expand gray " . escapeshellarg($imagePath) . " " . escapeshellarg($grayFilePath));
//        exec("gdal_translate -co TILED=YES -co COMPRESS=DEFLATE " . escapeshellarg($grayFilePath) . " " . escapeshellarg($outputFilePath));
//        exec("gdaladdo --config COMPRESS_OVERVIEW DEFLATE -r average " . escapeshellarg($outputFilePath) . " 2 4 8 16");
//
//        unlink($imagePath); // 元の画像を削除
//        rename($outputFilePath, $imagePath); // 処理後の画像を元の名前に変更
//    }
//}
//
//// **JPEG サムネイルの作成**
//$jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";
//
//if ($fileExt === "tif" || $fileExt === "tiff" || $fileExt === "png") {
//    $gdalCommand = "gdal_translate -of JPEG -co PAM=NO -outsize 100 0 " . escapeshellarg($imagePath) . " " . escapeshellarg($jpegThumbnailPath);
//    exec($gdalCommand . " 2>&1", $output, $returnVar);
//
//    $auxXmlFile = $jpegThumbnailPath . ".aux.xml";
//    if (file_exists($auxXmlFile)) {
//        unlink($auxXmlFile);
//    }
//
//    if ($returnVar !== 0) {
//        echo json_encode(["error" => "TIFF の JPEG サムネイル作成に失敗しました", "output" => $output]);
//        exit;
//    }
//} else {
//    $sourceImage = imagecreatefromjpeg($imagePath);
//    list($width, $height) = getimagesize($imagePath);
//    $newWidth = 100;
//    $newHeight = ($height / $width) * 100;
//
//    $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
//    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
//
//    if (!imagejpeg($thumbnail, $jpegThumbnailPath, 90)) {
//        echo json_encode(["error" => "JPEG サムネイルの保存に失敗しました"]);
//        exit;
//    }
//
//    imagedestroy($sourceImage);
//    imagedestroy($thumbnail);
//}
//
//// **成功時のレスポンス**
//echo json_encode([
//    "success" => true,
//    "file" => $imagePath,
//    "worldfile" => $worldFilePath,
//    "thumbnail" => $jpegThumbnailPath,
//    "dir" => $subDir
//]);
//
//?>
