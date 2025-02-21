<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$data = json_decode(file_get_contents("php://input"), true);

// **ファイルパスの取得**
if (!isset($data["dir"]) || !isset($data["file"])) {
    echo json_encode(["error" => "ファイルパスまたはディレクトリが指定されていません"], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

$filePath = realpath($data["file"]);
if (!$filePath || !file_exists($filePath)) {
    echo json_encode(["error" => "指定されたファイルが存在しません"]);
    exit;
}

// **フルパスからディレクトリパスを取得**
$dirPath = dirname($filePath);

// **ワールドファイルの出力パス**
$worldFile = $dirPath . "/" . pathinfo($filePath, PATHINFO_FILENAME) . ".tfw";
$worldFile2 = $dirPath . "/" . pathinfo($filePath, PATHINFO_FILENAME) . "_red.tfw";
$worldFile3 = $dirPath . "/" . pathinfo($filePath, PATHINFO_FILENAME) . "_red_rgba.tfw";
$worldFile4 = $dirPath . "/" . pathinfo($filePath, PATHINFO_FILENAME) . "_alpha.tfw";

// **PDFをPNGに変換**
$outputBase = $dirPath . "/" . pathinfo($filePath, PATHINFO_FILENAME);
exec("pdftoppm -png -r 600 " . escapeshellarg($filePath) . " " . escapeshellarg($outputBase));

// **変換後のファイル名 (`-1.png` を削除)**
$expectedOutputPng = $outputBase . "-1.png";
$finalOutputPng = $outputBase . ".png";

if (file_exists($expectedOutputPng)) {
    rename($expectedOutputPng, $finalOutputPng);
} else {
    echo json_encode(["error" => "pdftoppm による画像変換に失敗しました", "expected_output" => $expectedOutputPng], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// **画像の読み込み**
$img = new Imagick($finalOutputPng);
$width = $img->getImageWidth();
$height = $img->getImageHeight();

// **OCR対象の領域をクロップ**
$croppedRightHorizontalPng = $dirPath . "/cropped_right_horizontal.png";
$croppedRightVerticalPng = $dirPath . "/cropped_right_vertical.png";
$croppedLeftHorizontalPng = $dirPath . "/cropped_left_horizontal.png";
$croppedLeftVerticalPng = $dirPath . "/cropped_left_vertical.png";

// 右上横書き
$rightHorizontalImg = clone $img;
$rightHorizontalImg->cropImage($width * 0.3, $height * 0.2, $width * 0.7, 0);
$rightHorizontalImg->setImageFormat('png');
$rightHorizontalImg->writeImage($croppedRightHorizontalPng);
$rightHorizontalImg->destroy();

// 右上縦書き
$rightVerticalImg = clone $img;
//$rightVerticalImg->cropImage($width * 0.1, $height, $width * 0.9, 0);
$rightVerticalImg->cropImage($width * 0.2, $height * 0.3, $width * 0.8, 0);
$rightVerticalImg->setImageFormat('png');
$rightVerticalImg->writeImage($croppedRightVerticalPng);
$rightVerticalImg->rotateImage("#FFFFFF", -90);
$rightVerticalImg->writeImage($croppedRightVerticalPng);
$rightVerticalImg->destroy();

// 左下横書き
$leftHorizontalImg = clone $img;
$cropX = $width * 0.05;
$cropY = $height * 0.6;
$cropWidth = $width * 0.25;
$cropHeight = $height * 0.15;
$leftHorizontalImg->cropImage($cropWidth, $cropHeight, $cropX, $cropY);
$leftHorizontalImg->setImageFormat('png');
$leftHorizontalImg->writeImage($croppedLeftHorizontalPng);
$leftHorizontalImg->destroy();

// 左下縦書き
$leftVerticalImg = clone $img;
$cropX = $width * 0.05;
$cropY = $height * 0.6;
$cropWidth = $width * 0.25;
$cropHeight = $height * 0.15;
$leftVerticalImg->cropImage($cropWidth, $cropHeight, $cropX, $cropY);
$leftVerticalImg->setImageFormat('png');
$leftVerticalImg->writeImage($croppedLeftVerticalPng);
$leftVerticalImg->rotateImage("#FFFFFF", -90);
$leftVerticalImg->writeImage($croppedLeftVerticalPng);
$leftVerticalImg->destroy();

$img->destroy();

// **手動で設定するクロップ範囲 (ピクセル)**
$cropX = 555;   // 左から100ピクセル
$cropY = 895;   // 上から200ピクセル
$cropWidth =    5905;  // 幅 500 ピクセル
$cropHeight =   5950; // 高さ 300 ピクセル

// **PDFをTIFFに変換**
//exec("pdftoppm -tiff -r 300 " . "-x {$cropX} -y {$cropY} -W {$cropWidth} -H {$cropHeight} " . escapeshellarg($filePath) . " " . escapeshellarg($outputBase));
exec("pdftoppm -tiff -r 600 " . "-x {$cropX} -y {$cropY} -W {$cropWidth} -H {$cropHeight} " . escapeshellarg($filePath) . " " . escapeshellarg($outputBase));
// **変換後のファイル名 (`-1.png` を削除)**
$expectedOutputTif = $outputBase . "-1.tif";
$finalOutputTif = $outputBase . ".tif";
rename($expectedOutputTif, $finalOutputTif);


// TIFF画像を読み込む
$tiff = new Imagick($finalOutputTif);

// 各フレームを処理
foreach ($tiff as $frame) {
    $width = $frame->getImageWidth();
    $height = $frame->getImageHeight();

    // グレースケール画像を取得（黒文字部分を検出）
    $gray = clone $frame;
    $gray->setImageType(Imagick::IMGTYPE_GRAYSCALE);
    $gray->negateImage(true);
    $gray->thresholdImage(50 * 65535 / 100);

    // 赤色レイヤーを作成
    $redLayer = new Imagick();
    $redLayer->newImage($width, $height, new ImagickPixel('red'), 'png');
    $redLayer->compositeImage($gray, Imagick::COMPOSITE_COPYOPACITY, 0, 0);

    // 変換した画像を適用
    $frame->compositeImage($redLayer, Imagick::COMPOSITE_OVER, 0, 0);
}

// 赤文字付きのTIFFを保存
$redFilePath = pathinfo($filePath, PATHINFO_DIRNAME) . '/' . pathinfo($filePath, PATHINFO_FILENAME) . '_red.tif';
$tiff->setImageFormat('tiff');
$tiff->writeImages($redFilePath, true);

// **OCR処理関数**
function extract_numbers($filePath)
{
    $ocrResult = shell_exec("tesseract " . escapeshellarg($filePath) . " stdout -l eng --psm 6 -c tessedit_char_whitelist=-0123456789.");
    preg_match('/-?\d+\.\d+/', $ocrResult, $matches);
    return $matches[0] ?? "認識失敗";
}

// **OCRの実行**
$rightHorizontalNumber = extract_numbers($croppedRightHorizontalPng);
$rightVerticalNumber = extract_numbers($croppedRightVerticalPng);
$leftHorizontalNumber = extract_numbers($croppedLeftHorizontalPng);
$leftVerticalNumber = extract_numbers($croppedLeftVerticalPng);

//// **数値チェック**
if (!is_numeric($rightHorizontalNumber) || !is_numeric($rightVerticalNumber) ||
    !is_numeric($leftHorizontalNumber) || !is_numeric($leftVerticalNumber)) {
    echo json_encode(["error" => "OCRに失敗しました"], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// TIFF の画像サイズを取得
$img = new Imagick($finalOutputTif);
$width = $img->getImageWidth();
$height = $img->getImageHeight();
$img->destroy();

// ワールドファイルの計算
$pixelSizeX = ($rightHorizontalNumber - $leftHorizontalNumber) / $width;
$pixelSizeY = ($leftVerticalNumber - $rightVerticalNumber) / $height;

// ワールドファイルの作成
$pgwContent = sprintf("%f\n0.000000\n0.000000\n%f\n%f\n%f\n",
    $pixelSizeX,   // X方向のピクセル解像度
    $pixelSizeY,  // Y方向のピクセル解像度（負の値）
    $leftHorizontalNumber,  // 左上X座標
    $rightVerticalNumber   // 左上Y座標
);
$result = file_put_contents($worldFile, $pgwContent);

// ワールドファイルの作成
$pgwContent = sprintf("%f\n0.000000\n0.000000\n%f\n%f\n%f\n",
    $pixelSizeX,   // X方向のピクセル解像度
    $pixelSizeY,  // Y方向のピクセル解像度（負の値）
    $leftHorizontalNumber,  // 左上X座標
    $rightVerticalNumber   // 左上Y座標
);
$result = file_put_contents($worldFile2, $pgwContent);

// ワールドファイルの作成
$pgwContent = sprintf("%f\n0.000000\n0.000000\n%f\n%f\n%f\n",
    $pixelSizeX,   // X方向のピクセル解像度
    $pixelSizeY,  // Y方向のピクセル解像度（負の値）
    $leftHorizontalNumber,  // 左上X座標
    $rightVerticalNumber   // 左上Y座標
);
$result = file_put_contents($worldFile3, $pgwContent);
$result = file_put_contents($worldFile4, $pgwContent);

if ($result === false) {
    echo json_encode(["error" => "ワールドファイルの書き込みに失敗しました: {$worldFile}"], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// **JSONで結果を返す**
$response = [
    "右上横書き数値" => $rightHorizontalNumber,
    "右上縦書き数値" => $rightVerticalNumber,
    "左下横書き数値" => $leftHorizontalNumber,
    "左下縦書き数値" => $leftVerticalNumber,
    "ワールドファイル" => "生成成功: {$worldFile}"
];

header("Content-Type: application/json; charset=utf-8");
//echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
echo json_encode(["success" => true]);

?>
