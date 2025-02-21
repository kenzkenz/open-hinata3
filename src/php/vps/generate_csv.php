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
$python_script = escapeshellarg("/var/www/html/public_html/myphp/python_ocr_script.py"); // Pythonスクリプトのパスを指定
$command = "python3 $python_script $image_path";
$ocr_output = shell_exec($command);

if ($ocr_output === null) {
    echo json_encode(["success" => false, "error" => "Python script execution failed"]);
    exit;
}

$response = json_decode($ocr_output, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["success" => false, "error" => "Invalid JSON response from Python"]);
    exit;
}

echo json_encode($response);


//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//header("Content-Type: application/json");
//
//// JSONリクエストの取得
//$input = file_get_contents("php://input");
//$data = json_decode($input, true);
//
//// image_path のバリデーション
//if (!isset($data["image_path"]) || empty($data["image_path"])) {
//    echo json_encode(["success" => false, "error" => "Invalid or missing image_path"]);
//    exit;
//}
//
//$image_path = $data["image_path"];
//
//// 画像をグレースケール+コントラスト強調+リサイズでOCR精度を向上
//function preprocess_image($image_path)
//{
//    if (!file_exists($image_path)) {
//        return false;
//    }
//
//    $image = imagecreatefrompng($image_path);
//    if (!$image) {
//        return false;
//    }
//
//    // グレースケール変換
//    imagefilter($image, IMG_FILTER_GRAYSCALE);
//
//    // コントラスト調整
//    imagefilter($image, IMG_FILTER_BRIGHTNESS, 15);
//    imagefilter($image, IMG_FILTER_CONTRAST, -20);
//
//    // 画像のリサイズ（OCR精度向上のため拡大）
//    $width = imagesx($image);
//    $height = imagesy($image);
//    $new_width = $width * 2;
//    $new_height = $height * 2;
//    $resized_image = imagecreatetruecolor($new_width, $new_height);
//
//    // 背景を白にする
//    $white = imagecolorallocate($resized_image, 255, 255, 255);
//    imagefilledrectangle($resized_image, 0, 0, $new_width, $new_height, $white);
//    imagecopyresampled($resized_image, $image, 0, 0, 0, 0, $new_width, $new_height, $width, $height);
//    imagedestroy($image);
//
//    $processed_image = sys_get_temp_dir() . "/processed_image.png";
//    imagepng($resized_image, $processed_image);
//    imagedestroy($resized_image);
//
//    return $processed_image;
//}
//
//// OCR処理
//function extract_table_from_image($image_path)
//{
//    $processed_image = preprocess_image($image_path);
//
//    if (!$processed_image) {
//        return ["success" => false, "error" => "Image processing failed"];
//    }
//
//    $output_file = sys_get_temp_dir() . "/ocr_output";
//    $ocr_command = "tesseract " . escapeshellarg($processed_image) . " " . escapeshellarg($output_file) . " --oem 1 --psm 4 2>&1";
//    $ocr_output = shell_exec($ocr_command);
//    error_log("Tesseract Command Output:\n" . $ocr_output);
//
//    $ocr_text_file = $output_file . ".txt";
//    if (!file_exists($ocr_text_file)) {
//        return ["success" => false, "error" => "OCR output file not found", "raw_output" => ""];
//    }
//    $output = file_get_contents($ocr_text_file);
//    error_log("Full OCR Output:\n" . $output);
//
//    $output = preg_replace('/\n+/', "\n", trim($output));
//
//    if (!$output) {
//        return ["success" => false, "error" => "OCR extraction failed", "raw_output" => ""];
//    }
//
//    $lines = explode("\n", $output);
//    $structured_data = [];
//
//    foreach ($lines as $line) {
//        error_log("OCR Line: " . $line);
//
//        // マイナス記号の補正（OCRの誤認識対策）
//        $line = preg_replace('/([^-\d])\s*[−‐‒–—―-]\s*(\d+(?:\.\d+)?)/u', '$1 -$2', $line);
//        $line = preg_replace('/^\s*[−‐‒–—―-]\s*(\d+(?:\.\d+)?)/u', '-$1', $line);
//
//        // 数値の小数点補正
//        $line = preg_replace('/(\d+)\.\s+(\d+)/', '$1.$2', $line);
//
//        // カンマをドットに変換（日本語の数値表記対応）
//        $line = str_replace(',', '.', $line);
//
//        // マイナス記号と数値の間の不要な空白を削除
//        $line = preg_replace('/([-~])\s*(\d+\.\d+)/', '$1$2', $line);
//
//        // 空白区切りでデータを分割
//        $structured_data[] = preg_split('/\s+/', trim($line));
//    }
//
//    return ["success" => true, "raw_output" => $output, "structured_data" => $structured_data];
//}
//
//$response = extract_table_from_image($image_path);
//
//echo json_encode($response);


//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//header("Content-Type: application/json");
//
//// JSONリクエストの取得
//$input = file_get_contents("php://input");
//$data = json_decode($input, true);
//
//// image_path のバリデーション
//if (!isset($data["image_path"]) || empty($data["image_path"])) {
//    echo json_encode(["success" => false, "error" => "Invalid or missing image_path"]);
//    exit;
//}
//
//$image_path = $data["image_path"];
//
//// 画像をグレースケール+コントラスト強調でOCR精度を向上
//function preprocess_image($image_path)
//{
//    if (!file_exists($image_path)) {
//        return false;
//    }
//
//    $image = imagecreatefrompng($image_path);
//    if (!$image) {
//        return false;
//    }
//
//    imagefilter($image, IMG_FILTER_GRAYSCALE);
//    imagefilter($image, IMG_FILTER_BRIGHTNESS, 10);
//    imagefilter($image, IMG_FILTER_CONTRAST, -10);
//
//    $processed_image = sys_get_temp_dir() . "/processed_image.png";
//    imagepng($image, $processed_image);
//    imagedestroy($image);
//
//    return $processed_image;
//}
//
//// OCR処理
//function extract_table_from_image($image_path)
//{
//    $processed_image = preprocess_image($image_path);
//
//    if (!$processed_image) {
//        return ["success" => false, "error" => "Image processing failed"];
//    }
//
//    $output_file = sys_get_temp_dir() . "/ocr_output";
//    $ocr_command = "tesseract " . escapeshellarg($processed_image) . " " . escapeshellarg($output_file) . " --oem 1 --psm 4 2>&1";
//    $ocr_output = shell_exec($ocr_command);
//    error_log("Tesseract Command Output:\n" . $ocr_output);
//
//    $ocr_text_file = $output_file . ".txt";
//    if (!file_exists($ocr_text_file)) {
//        return ["success" => false, "error" => "OCR output file not found", "raw_output" => ""];
//    }
//    $output = file_get_contents($ocr_text_file);
//    error_log("Full OCR Output:\n" . $output);
//
//    $output = preg_replace('/\n+/', "\n", trim($output));
//
//    if (!$output) {
//        return ["success" => false, "error" => "OCR extraction failed", "raw_output" => ""];
//    }
//
//    $lines = explode("\n", $output);
//    $structured_data = [];
//
//    foreach ($lines as $line) {
//        error_log("OCR Line: " . $line);
//
//        // マイナス記号の補正（OCRの誤認識対策）
//        $line = preg_replace('/([^-\d])\s*[−‐‒–—―-]\s*(\d+(?:\.\d+)?)/u', '$1 -$2', $line);
//        $line = preg_replace('/^\s*[−‐‒–—―-]\s*(\d+(?:\.\d+)?)/u', '-$1', $line);
//
//        // 数値の小数点補正
//        $line = preg_replace('/(\d+)\.\s+(\d+)/', '$1.$2', $line);
//
//        // カンマをドットに変換（日本語の数値表記対応）
//        $line = str_replace(',', '.', $line);
//
//        // マイナス記号と数値の間の不要な空白を削除
//        $line = preg_replace('/([-~])\s*(\d+\.\d+)/', '$1$2', $line);
//
//        // 空白区切りでデータを分割
//        $structured_data[] = preg_split('/\s+/', trim($line));
//    }
//
//    return ["success" => true, "raw_output" => $output, "structured_data" => $structured_data];
//}
//
//$response = extract_table_from_image($image_path);
//
//echo json_encode($response);
//
//
//




//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//header("Content-Type: application/json");
//
//// JSONリクエストの取得
//$input = file_get_contents("php://input");
//$data = json_decode($input, true);
//
//// image_path のバリデーション
//if (!isset($data["image_path"]) || empty($data["image_path"])) {
//    echo json_encode(["success" => false, "error" => "Invalid or missing image_path"]);
//    exit;
//}
//
//$image_path = $data["image_path"];
//
//// 画像をグレースケール+コントラスト強調でOCR精度を向上
//function preprocess_image($image_path) {
//    if (!file_exists($image_path)) {
//        return false;
//    }
//
//    $image = imagecreatefrompng($image_path);
//    if (!$image) {
//        return false;
//    }
//
//    // グレースケール + コントラスト調整（強調しすぎない）
//    imagefilter($image, IMG_FILTER_GRAYSCALE);
//    imagefilter($image, IMG_FILTER_BRIGHTNESS, 10); // 明るさを控えめに調整
//    imagefilter($image, IMG_FILTER_CONTRAST, -10); // コントラストを弱める
//
//    // 一時ファイルとして保存
//    $processed_image = sys_get_temp_dir() . "/processed_image.png";
//    imagepng($image, $processed_image);
//    imagedestroy($image);
//
//    return $processed_image;
//}
//
//// OCR処理
//function extract_table_from_image($image_path) {
//    $processed_image = preprocess_image($image_path);
//
//    if (!$processed_image) {
//        return ["success" => false, "error" => "Image processing failed"];
//    }
//
//    // OCR結果を保存する一時ファイル
//    $output_file = sys_get_temp_dir() . "/ocr_output";
//
//    // Tesseract OCRを実行（パラメータ変更: --psm 4, --oem 1）
//    $ocr_command = "tesseract " . escapeshellarg($processed_image) . " " . escapeshellarg($output_file) . " --oem 1 --psm 4 2>&1";
//    $ocr_output = shell_exec($ocr_command);
//    error_log("Tesseract Command Output:\n" . $ocr_output);
//
//    // OCRの全文を取得
//    $ocr_text_file = $output_file . ".txt";
//    if (!file_exists($ocr_text_file)) {
//        return ["success" => false, "error" => "OCR output file not found", "raw_output" => ""];
//    }
//    $output = file_get_contents($ocr_text_file);
//
//    // OCRの全文をデバッグログに記録
//    error_log("Full OCR Output:\n" . $output);
//
//    // 余計な改行を削除し、全行を取得
//    $output = preg_replace('/\n+/', "\n", trim($output));
//
//    if (!$output) {
//        return ["success" => false, "error" => "OCR extraction failed", "raw_output" => ""];
//    }
//
//    $lines = explode("\n", $output);
//    $structured_data = [];
//
//    foreach ($lines as $line) {
//        error_log("OCR Line: " . $line);
//
//        // 数値の間のスペースを削除（142136. 021 → 142136.021）
//        $line = preg_replace('/(\d+)\.\s+(\d+)/', '$1.$2', $line);
//
//        // OCRの誤認識（, → .）を修正
//        $line = str_replace(',', '.', $line);
//
//        // マイナスや ~ の後のスペースを削除（- 142136.021 → -142136.021）
//        $line = preg_replace('/([-~])\s*(\d+\.\d+)/', '$1$2', $line);
//    }
//
//    // JSONレスポンスにOCR全文を含める
//    return ["success" => true, "raw_output" => implode("\n", $lines)];
//}
//
//// CSVデータを取得
//$response = extract_table_from_image($image_path);
//
//// JSONで結果を返す
//echo json_encode($response);
//?>
