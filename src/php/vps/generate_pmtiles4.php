<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Content-Encoding");

// メモリ・時間制限を解除
ini_set('memory_limit', '-1');
set_time_limit(0);
ini_set('max_execution_time', 0);

// --- gzip 圧縮データを解凍して取得 ---
$inputStream = fopen("php://input", "r");
$compressedData = stream_get_contents($inputStream);
fclose($inputStream);

$data = json_decode(gzdecode($compressedData), false); // gzip 解凍

if (!$data || !isset($data->geojson) || !isset($data->geojson->features) || !isset($data->chiban) || !isset($data->dir)) {
    echo json_encode([
        "error" => "無効なGeoJSONデータ、chiban または dir が指定されていません"
    ]);
    exit;
}

// ---- ここでWeb上のベースURLを指定 ----
$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

// POSTリクエストのチェック
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

// 各地物に oh3id プロパティを追加
$bbox = [INF, INF, -INF, -INF];
foreach ($data->geojson->features as $index => &$feature) {
    if (!isset($feature->properties)) {
        $feature->properties = new stdClass();
    }
    $feature->properties->oh3id = $index;
    $feature->properties->chiban = $data->chiban;
    if (isset($feature->geometry->coordinates)) {
        updateBBOX($feature->geometry->coordinates, $bbox);
    }
}
unset($feature); // 参照解除

// BBOX にマイナス値がある場合、空にする
if (min($bbox) < 0) {
    $bbox = '';
}

// ベースのアップロードディレクトリ
$baseUploadDir = "/var/www/html/public_html/uploads/";
// ディレクトリ名取得
$subDir = $data->dir;
$fullDir = $baseUploadDir . $subDir;

// ディレクトリが存在しない場合は作成
if (!is_dir($fullDir)) {
    mkdir($fullDir, 0777, true);
}

// アップロードディレクトリ設定
$baseUploadDir = "/var/www/html/public_html/uploads/";
$subDir = $data->dir;
$pmtilesDir = $baseUploadDir . $subDir . "/pmtiles/";

// pmtilesディレクトリ作成
if (!is_dir($pmtilesDir)) {
    mkdir($pmtilesDir, 0777, true);
}

$fileBaseName = uniqid();
$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";

// --- GeoJSON をファイルに保存 ---
if (file_put_contents($tempFilePath, json_encode($data->geojson)) === false) {
    echo json_encode(["error" => "一時ファイルの作成に失敗しました"]);
    exit;
}

// GeoJSONのディレクトリとファイル名を取得
$geojsonDir = dirname($tempFilePath);
$fileBaseName = pathinfo($tempFilePath, PATHINFO_FILENAME);
$pmtilesPath = "$geojsonDir/$fileBaseName.pmtiles";

isFirstFeaturePoint($data->geojson);

// Tippecanoeコマンドの実行
$tippecanoeCmd = sprintf(
    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=14 --minimum-zoom=0 --layer=oh3 %s 2>&1",
    escapeshellarg($pmtilesPath),
    escapeshellarg($tempFilePath)
);
exec($tippecanoeCmd, $output, $returnVar);

// エラーハンドリング
if ($returnVar !== 0) {
    echo json_encode([
        "error" => "Tippecanoeの実行に失敗しました",
        "command" => $tippecanoeCmd,
        "output" => implode("\n", $output)
    ]);
    unlink($tempFilePath); // エラー時は一時ファイルを削除
    exit;
}

// 正常終了
echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,
    "tippecanoeCmd" => $tippecanoeCmd,
    "bbox" => $bbox
]);
exit;

/**
 * GeoJSON の BBOX を更新
 */
function updateBBOX($coordinates, &$bbox)
{
    if (!is_array($coordinates[0])) {
        $bbox[0] = min($bbox[0], $coordinates[0]);
        $bbox[1] = min($bbox[1], $coordinates[1]);
        $bbox[2] = max($bbox[2], $coordinates[0]);
        $bbox[3] = max($bbox[3], $coordinates[1]);
    } else {
        foreach ($coordinates as $coord) {
            updateBBOX($coord, $bbox);
        }
    }
}

function isFirstFeaturePoint($geojson)
{
    if (
        isset($geojson->features) &&
        is_array($geojson->features) &&
        count($geojson->features) > 0 &&
        isset($geojson->features[0]->geometry->type)
    ) {
        return strtolower($geojson->features[0]->geometry->type) === "point";
    }
    return false;
}
