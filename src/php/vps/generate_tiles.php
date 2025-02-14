<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// POST リクエスト以外は拒否
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

// JSON データの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["file"])) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]);
    exit;
}

// TIFF ファイルのパスを取得
$filePath = realpath($data["file"]);
if (!$filePath || !file_exists($filePath)) {
    echo json_encode(["error" => "指定されたファイルが存在しません"]);
    exit;
}

// ワールドファイル (.tfw) の有無を確認
$tfwPath = pathinfo($filePath, PATHINFO_DIRNAME) . "/" . pathinfo($filePath, PATHINFO_FILENAME) . ".tfw";
if (!file_exists($tfwPath)) {
    echo json_encode(["error" => "ワールドファイル (.tfw) が見つかりません。TFW ファイルを用意してください。"]);
    exit;
}

// 座標系 (EPSG コード) の取得 (デフォルト: 2450)
$epsgCode = isset($data["srs"]) ? preg_replace('/[^0-9]/', '', $data["srs"]) : "2450"; // 数字以外を除去

// タイルの保存先ディレクトリ名の取得 (デフォルト: `default`)
$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";

// タイルディレクトリの作成
$tileDir = "/var/www/html/public_html/tiles/" . $subDir . "/" . basename($filePath, ".tif") . "/";
if (!is_dir($tileDir)) {
    mkdir($tileDir, 0777, true);
}

// GDAL2TILES コマンド
$escapedFilePath = escapeshellarg($filePath);
$escapedTileDir = escapeshellarg($tileDir);
$tileCommand = "gdal2tiles.py -z 0-19 --s_srs EPSG:$epsgCode -a \"0,0,0\" --xyz --processes=4 $escapedFilePath $escapedTileDir";

// 実行
exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);

// ログを記録
$logFile = $tileDir . "error_log.txt";
file_put_contents($logFile, implode("\n", $tileOutput), FILE_APPEND);

// 結果の判定
if ($tileReturnVar === 0) {
    echo json_encode(["success" => true, "tiles" => $tileDir]);
} else {
    echo json_encode(["error" => "タイル生成に失敗しました", "output" => $tileOutput]);
}


//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// POST リクエスト以外は拒否
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
//    exit;
//}
//
//// JSON データの取得
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["file"])) {
//    echo json_encode(["error" => "ファイルパスが指定されていません"]);
//    exit;
//}
//
//// TIFF ファイルのパスを取得
//$filePath = realpath($data["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    echo json_encode(["error" => "指定されたファイルが存在しません"]);
//    exit;
//}
//
//// ワールドファイル (.tfw) の有無を確認
//$tfwPath = pathinfo($filePath, PATHINFO_DIRNAME) . "/" . pathinfo($filePath, PATHINFO_FILENAME) . ".tfw";
//if (!file_exists($tfwPath)) {
//    echo json_encode(["error" => "ワールドファイル (.tfw) が見つかりません。TFW ファイルを用意してください。"]);
//    exit;
//}
//
//// 座標系 (EPSG コード) の取得 (デフォルト: 2450)
//$epsgCode = isset($data["srs"]) ? preg_replace('/[^0-9]/', '', $data["srs"]) : "2450"; // 数字以外を除去
//
//// ファイルの拡張子が TIFF か確認
//$fileExt = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
//if (!in_array($fileExt, ["tif", "tiff"])) {
//    echo json_encode(["error" => "許可されていないファイル形式です (TIFF のみ許可)"]);
//    exit;
//}
//
//// ズームレベル設定
//$zoomLevels = "0-19";
//
//// タイルディレクトリの作成
//$tileDir = "/var/www/html/public_html/tiles/" . basename($filePath, ".tif") . "/";
//if (!is_dir($tileDir)) {
//    mkdir($tileDir, 0777, true);
//}
//
//// GDAL2TILES コマンド
//$escapedFilePath = escapeshellarg($filePath);
//$escapedTileDir = escapeshellarg($tileDir);
//$tileCommand = "gdal2tiles.py -z $zoomLevels --s_srs EPSG:$epsgCode -a \"0,0,0\" --xyz --processes=4 $escapedFilePath $escapedTileDir";
//
//// 実行
//exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);
//
//// ログを記録
//$logFile = $tileDir . "error_log.txt";
//file_put_contents($logFile, implode("\n", $tileOutput), FILE_APPEND);
//
//// 結果の判定
//if ($tileReturnVar === 0) {
//    echo json_encode(["success" => true, "tiles" => $tileDir]);
//} else {
//    echo json_encode(["error" => "タイル生成に失敗しました", "output" => $tileOutput]);
//}
//
?>
