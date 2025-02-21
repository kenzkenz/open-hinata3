<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

function preprocess_image($image_path) {
    // 画像をグレースケールに変換してOCRの精度を向上させる
    $image = imagecreatefrompng($image_path);
    imagefilter($image, IMG_FILTER_GRAYSCALE);
    imagepng($image, "processed_image.png");
    imagedestroy($image);
    return "processed_image.png";
}

function extract_table_from_image($image_path) {
    $processed_image = preprocess_image($image_path);

    // Tesseract OCRを実行
    $output = shell_exec("tesseract " . escapeshellarg($processed_image) . " stdout --psm 6");

    $lines = explode("\n", trim($output));
    $csv_output = "NO,Xn,Yn,Xn * (Yn+1 - Yn-1)\n";

    foreach ($lines as $line) {
        $columns = preg_split('/\s+/', trim($line));
        if (count($columns) >= 4) {
            $csv_output .= implode(",", $columns) . "\n";
        }
    }

    return $csv_output;
}

// 使用例（引数で画像ファイルのパスを取得）
if ($argc < 2) {
    echo "Usage: php script.php <image_path>\n";
    exit(1);
}

$image_path = $argv[1];
$csv_data = extract_table_from_image($image_path);

echo $csv_data;
?>
