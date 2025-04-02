<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ベースのアップロードディレクトリとWebアクセス用URL
$baseUploadDir = "/var/www/html/public_html/uploads/";
$baseUrl = "https://kenzkenz.duckdns.org/uploads/";

// POSTデータを受け取る
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['image'])) {
    http_response_code(400);
    echo json_encode(["error" => "画像データがありません"]);
    exit;
}

// dir を受け取る（セキュリティ制限）
$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";

// アップロードディレクトリとURL
$uploadDir = $baseUploadDir . $subDir . "/thumbnail/";
$uploadUrl = $baseUrl . $subDir . "/thumbnail/";

// ディレクトリがない場合は作成
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        echo json_encode(["error" => "ディレクトリの作成に失敗しました: " . $uploadDir]);
        exit;
    }
} else {
    chmod($uploadDir, 0777);
}

// Base64形式のデータを処理
$imageData = $data['image'];
if (preg_match('/^data:image\/jpeg;base64,/', $imageData)) {
    $imageData = str_replace('data:image/jpeg;base64,', '', $imageData);
    $imageData = str_replace(' ', '+', $imageData);
    $decodedData = base64_decode($imageData);

    $srcImage = imagecreatefromstring($decodedData);
    if (!$srcImage) {
        echo json_encode(["error" => "画像の読み込みに失敗しました"]);
        exit;
    }

    $origWidth = imagesx($srcImage);
    $origHeight = imagesy($srcImage);

    $newWidth = 50;
    $newHeight = intval($origHeight * ($newWidth / $origWidth));
    $resizedImage = imagescale($srcImage, $newWidth, $newHeight);

    if (!$resizedImage) {
        echo json_encode(["error" => "画像のリサイズに失敗しました"]);
        imagedestroy($srcImage);
        exit;
    }

    $filename = 'screenshot_' . time() . '.jpg';
    $filePath = $uploadDir . $filename;
    $fileUrl = $uploadUrl . $filename;

    if (imagejpeg($resizedImage, $filePath, 90)) {
        imagedestroy($srcImage);
        imagedestroy($resizedImage);
        echo json_encode([
            "success" => true,
            "message" => "画像保存完了（リサイズ済）",
            "filename" => $filename,
            "url" => $fileUrl,
            "path" => $filePath
        ]);
    } else {
        echo json_encode(["error" => "画像保存に失敗しました"]);
    }
} else {
    echo json_encode(["error" => "JPEG形式のデータではありません"]);
}
