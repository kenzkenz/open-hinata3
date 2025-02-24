<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// JSONリクエストの取得
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// image_path のバリデーション
if (!isset($data["image_path"]) || empty($data["image_path"])) {
    echo json_encode(["success" => false, "error" => "Invalid or missing image_path"]);
    exit;
}

$image_path = escapeshellarg($data["image_path"]);

// Pythonスクリプトを呼び出す
$python_script = escapeshellarg("/var/www/html/public_html/myphp/python_ocr_script5.py"); // Pythonスクリプトのパスを指定
$command = "python3 $python_script $image_path " . $data["scale"];
$ocr_output = shell_exec($command);

if ($ocr_output === null) {
    echo json_encode(["success" => false, "error" => "Python script execution failed"]);
    exit;
}else{
    deleteSourceAndTempFiles($image_path);
}

$response = json_decode($ocr_output, true);
echo json_encode($response);

function deleteSourceAndTempFiles($filePath)
{
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        // カレントディレクトリ (`.`) と 親ディレクトリ (`..`) をスキップ
        if ($file === '.' || $file === '..') {
            continue;
        }

        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;

        // `thumbnail-` で始まるファイルを除外し、それ以外は全削除
        if (strpos($file, 'thumbnail-') !== 0) {
            unlink($fullPath);
        }
    }
}

?>
