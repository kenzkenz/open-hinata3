<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

ini_set('memory_limit', '-1');
set_time_limit(0);

//$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";

// ---- ここでWeb上のベースURLを指定 ----
$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

// POSTリクエストのチェック
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

// リクエストデータの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["file"])) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]);
    exit;
}

$filePath = realpath($data["file"]);
if (!$filePath || !file_exists($filePath)) {
    echo json_encode(["error" => "指定されたGeoJSONファイルが存在しません"]);
    exit;
}

// GeoJSONのディレクトリを取得
$geojsonDir = dirname($filePath);
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";

$tippecanoeCmd = sprintf(
    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=%s %s 2>&1",
    escapeshellarg($pmtilesPath),
    escapeshellarg($fileBaseName), // layer名をGeoJSONのファイル名にする
    escapeshellarg($filePath)
);

// コマンドを実行
exec($tippecanoeCmd, $output, $returnVar);

// エラーハンドリング
if ($returnVar !== 0) {
    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
    exit;
}

// 正常終了
echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,   // ローカルの保存先パス
    "tippecanoeCmd" => $tippecanoeCmd
]);

?>





