<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// `.aux.xml` の生成を防ぐ
putenv("GDAL_PAM_ENABLED=NO");

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";

// JSON データの取得 (ディレクトリ名取得)
$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default"; // 安全なディレクトリ名に変換

// フルパスのアップロードディレクトリ
$uploadDir = $baseUploadDir . $subDir . "/";

// ディレクトリがない場合は作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
}

// TIFF & JPEG チェック
if (!isset($_FILES["file"])) {
    echo json_encode(["error" => "TIFF または JPEG ファイルをアップロードしてください"]);
    exit;
}

// アップロードされたファイルの拡張子を確認
$fileExt = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
if (!in_array($fileExt, ["tif", "tiff", "jpg", "jpeg", "png"])) {
    echo json_encode(["error" => "許可されていないファイル形式です (TIFF, JPEG, PNG のみ許可)"]);
    exit;
}

// ワールドファイルのチェック (`.tfw`, `.jgw`, `.pgw`)
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

// 一意のファイル名を作成（保存時の拡張子を統一）
$fileBaseName = uniqid();
if (in_array($fileExt, ["jpg", "jpeg"])) {
    $imagePath = $uploadDir . $fileBaseName . ".jpg"; // `.jpeg` は `.jpg` に統一
    $worldFilePath = $uploadDir . $fileBaseName . ".jgw";
} else {
    $imagePath = $uploadDir . $fileBaseName . ".tif";
    $worldFilePath = $uploadDir . $fileBaseName . ".tfw";
}

// 画像ファイルの保存
if (!move_uploaded_file($_FILES["file"]["tmp_name"], $imagePath)) {
    echo json_encode(["error" => "画像ファイルの保存に失敗しました"]);
    exit;
}

// ワールドファイルの保存
if (!move_uploaded_file($_FILES["worldfile"]["tmp_name"], $worldFilePath)) {
    unlink($imagePath); // 画像を削除
    echo json_encode(["error" => "ワールドファイルの保存に失敗しました"]);
    exit;
}

// **JPEG サムネイルの作成 (100px幅にリサイズ)**
$jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";

if ($fileExt === "tif" || $fileExt === "tiff"|| $fileExt === "png") {
    // GDAL を使用して TIFF から JPEG サムネイルを作成
    $gdalCommand = "gdal_translate -of JPEG -co PAM=NO -outsize 100 0 " . escapeshellarg($imagePath) . " " . escapeshellarg($jpegThumbnailPath);
    exec($gdalCommand . " 2>&1", $output, $returnVar);

    // `.aux.xml` を削除
    $auxXmlFile = $jpegThumbnailPath . ".aux.xml";
    if (file_exists($auxXmlFile)) {
        unlink($auxXmlFile);
    }

    // GDALのJPEG変換エラーチェック
    if ($returnVar !== 0) {
        echo json_encode(["error" => "TIFF の JPEG サムネイル作成に失敗しました", "output" => $output]);
        exit;
    }
} else {
    // JPEG の場合、PHPのGDライブラリでサムネイルを作成
    $sourceImage = imagecreatefromjpeg($imagePath);
    if (!$sourceImage) {
        echo json_encode(["error" => "JPEG サムネイルの作成に失敗しました"]);
        exit;
    }

    // 元の画像サイズを取得
    list($width, $height) = getimagesize($imagePath);
    $newWidth = 100;
    $newHeight = ($height / $width) * 100;

    // 新しい画像リソースを作成
    $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    // サムネイルを保存
    if (!imagejpeg($thumbnail, $jpegThumbnailPath, 90)) {
        echo json_encode(["error" => "JPEG サムネイルの保存に失敗しました"]);
        exit;
    }

    // メモリ解放
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
//$subDir = isset($_POST["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]) : "default"; // 安全なディレクトリ名に変換
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
//if (!in_array($fileExt, ["tif", "tiff", "jpg", "jpeg"])) {
//    echo json_encode(["error" => "許可されていないファイル形式です (TIFF, JPEG のみ許可)"]);
//    exit;
//}
//
//// ワールドファイルのチェック (`.tfw` または `.jgw`)
//$worldFileExt = ($fileExt === "tif" || $fileExt === "tiff") ? "tfw" : "jgw";
//if (!isset($_FILES["worldfile"])) {
//    echo json_encode(["error" => "ワールドファイル (.$worldFileExt) をアップロードしてください"]);
//    exit;
//}
//
//// 一意のファイル名を作成（保存時の拡張子を統一）
//$fileBaseName = uniqid();
//if (in_array($fileExt, ["jpg", "jpeg"])) {
//    $imagePath = $uploadDir . $fileBaseName . ".jpg"; // `.jpeg` は `.jpg` に統一
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
//    unlink($imagePath); // 画像を削除
//    echo json_encode(["error" => "ワールドファイルの保存に失敗しました"]);
//    exit;
//}
//
//// **JPEG サムネイルの作成 (100px幅にリサイズ)**
//$jpegThumbnailPath = $uploadDir . "thumbnail-" . $fileBaseName . ".jpg";
//
//if ($fileExt === "tif" || $fileExt === "tiff") {
//    // GDAL を使用して TIFF から JPEG サムネイルを作成
//    $gdalCommand = "gdal_translate -of JPEG -co PAM=NO -outsize 100 0 " . escapeshellarg($imagePath) . " " . escapeshellarg($jpegThumbnailPath);
//    exec($gdalCommand . " 2>&1", $output, $returnVar);
//
//    // `.aux.xml` を削除
//    $auxXmlFile = $jpegThumbnailPath . ".aux.xml";
//    if (file_exists($auxXmlFile)) {
//        unlink($auxXmlFile);
//    }
//
//    // GDALのJPEG変換エラーチェック
//    if ($returnVar !== 0) {
//        echo json_encode(["error" => "TIFF の JPEG サムネイル作成に失敗しました", "output" => $output]);
//        exit;
//    }
//} else {
//    // JPEG の場合、PHPのGDライブラリでサムネイルを作成
//    $sourceImage = imagecreatefromjpeg($imagePath);
//    if (!$sourceImage) {
//        echo json_encode(["error" => "JPEG サムネイルの作成に失敗しました"]);
//        exit;
//    }
//
//    // 元の画像サイズを取得
//    list($width, $height) = getimagesize($imagePath);
//    $newWidth = 100;
//    $newHeight = ($height / $width) * 100;
//
//    // 新しい画像リソースを作成
//    $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
//    imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
//
//    // サムネイルを保存
//    if (!imagejpeg($thumbnail, $jpegThumbnailPath, 90)) {
//        echo json_encode(["error" => "JPEG サムネイルの保存に失敗しました"]);
//        exit;
//    }
//
//    // メモリ解放
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
