<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// サーバーのベースURL (適宜変更)
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";

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

// `gdalinfo` で TIFF の BBOX を取得
$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);

if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    echo json_encode(["error" => "gdalinfo で TIFF の範囲を取得できませんでした"]);
    exit;
}

// 元の BBOX を取得 (例: `EPSG:2450` の場合)
$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];  // [minX, maxY]
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"]; // [maxX, minY]

// `EPSG:4326` に変換 (gdaltransform を使用)
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
    exec($cmd, $output, $returnVar);
    if ($returnVar === 0 && !empty($output)) {
        $coords = explode(" ", trim($output[0]));
        return [floatval($coords[0]), floatval($coords[1])]; // [longitude, latitude]
    }
    return null;
}

// EPSG:2450 → EPSG:4326
$sourceEPSG = isset($data["srs"]) ? preg_replace('/[^0-9]/', '', $data["srs"]) : "2450";
$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG); // minX, minY
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG); // maxX, maxY

if (!$minCoord || !$maxCoord) {
    echo json_encode(["error" => "座標変換に失敗しました"]);
    exit;
}

// 変換後の BBOX
$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];

// タイルの保存先ディレクトリ名の取得 (デフォルト: `default`)
$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";

// タイルディレクトリの作成 (サーバー側の保存先)
$tileDir = "/var/www/html/public_html/tiles/" . $subDir . "/" . basename($filePath, ".tif") . "/";
if (!is_dir($tileDir)) {
    mkdir($tileDir, 0777, true);
}

// 公開URL (ネットでアクセスできるURL)
$tileURL = $BASE_URL . $subDir . "/" . basename($filePath, ".tif") . "/{z}/{x}/{y}.png";

// GDAL2TILES コマンド
$escapedFilePath = escapeshellarg($filePath);
$escapedTileDir = escapeshellarg($tileDir);
$tileCommand = "gdal2tiles.py -z 0-19 --s_srs EPSG:$sourceEPSG -a \"0,0,0\" --xyz --processes=4 $escapedFilePath $escapedTileDir";

// 実行
exec($tileCommand . " 2>&1", $tileOutput, $tileReturnVar);

// ログを記録
$logFile = $tileDir . "error_log.txt";
file_put_contents($logFile, implode("\n", $tileOutput), FILE_APPEND);

// 結果の判定
if ($tileReturnVar === 0) {
    echo json_encode(["success" => true, "tiles_url" => $tileURL, "bbox" => $bbox4326]);
} else {
    echo json_encode(["error" => "タイル生成に失敗しました", "output" => $tileOutput]);
}



//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// サーバーのベースURL (適宜変更)
//$BASE_URL = "https://kenzkenz.duckdns.org/tiles/"; // ← ここをサーバーのURLに変更する
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
//// タイルの保存先ディレクトリ名の取得 (デフォルト: `default`)
//$subDir = isset($data["dir"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $data["dir"]) : "default";
//
//// タイルディレクトリの作成 (サーバー側の保存先)
//$tileDir = "/var/www/html/public_html/tiles/" . $subDir . "/" . basename($filePath, ".tif") . "/";
//if (!is_dir($tileDir)) {
//    mkdir($tileDir, 0777, true);
//}
//
//// 公開URL (ネットでアクセスできるURL)
//$tileURL = $BASE_URL . $subDir . "/" . basename($filePath, ".tif") . "/{z}/{x}/{y}.png";
//
//// GDAL2TILES コマンド
//$escapedFilePath = escapeshellarg($filePath);
//$escapedTileDir = escapeshellarg($tileDir);
//$tileCommand = "gdal2tiles.py -z 0-19 --s_srs EPSG:$epsgCode -a \"0,0,0\" --xyz --processes=4 $escapedFilePath $escapedTileDir";
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
//    echo json_encode(["success" => true, "tiles_url" => $tileURL]);
//} else {
//    echo json_encode(["error" => "タイル生成に失敗しました", "output" => $tileOutput]);
//}

?>
