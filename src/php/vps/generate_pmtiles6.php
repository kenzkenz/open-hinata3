<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

ini_set('memory_limit', '-1');
ini_set('max_execution_time', 300);
ini_set('max_input_time', 300);

$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

if (!isset($_FILES["geojson"]) || $_FILES["geojson"]["error"] !== UPLOAD_ERR_OK || !isset($_POST["dir"])) {
    $errors = [
        UPLOAD_ERR_INI_SIZE => "ファイルサイズがPHPの制限を超えています",
        UPLOAD_ERR_FORM_SIZE => "ファイルサイズがフォームの制限を超えています",
        UPLOAD_ERR_PARTIAL => "ファイルが部分的にしかアップロードされていません",
        UPLOAD_ERR_NO_FILE => "ファイルがアップロードされていません",
        UPLOAD_ERR_NO_TMP_DIR => "一時ディレクトリが存在しません",
        UPLOAD_ERR_CANT_WRITE => "ディスクへの書き込みに失敗しました",
        UPLOAD_ERR_EXTENSION => "PHP拡張によりアップロードが中断されました"
    ];
    echo json_encode(["error" => $errors[$_FILES["geojson"]["error"]] ?? "geojsonファイルまたはdirが指定されていません！"]);
    exit;
}

$dir = basename($_POST["dir"]);
if (empty($dir) || preg_match('/[^a-zA-Z0-9_-]/', $dir)) {
    echo json_encode(["error" => "無効なディレクトリ名です"]);
    exit;
}

$baseUploadDir = "/var/www/html/public_html/uploads/";
$pmtilesDir = $baseUploadDir . $dir . "/pmtiles/";

if (!is_dir($pmtilesDir) && !mkdir($pmtilesDir, 0775, true)) {
    echo json_encode(["error" => "ディレクトリの作成に失敗しました"]);
    exit;
}

$fileBaseName = uniqid();
$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";

if (!move_uploaded_file($_FILES["geojson"]["tmp_name"], $tempFilePath)) {
    echo json_encode(["error" => "GeoJSONファイルの保存に失敗しました"]);
    exit;
}

// GeoJSONの検証とBBOX/地物数の計算
$geojsonContent = file_get_contents($tempFilePath);
$geojson = json_decode($geojsonContent, true);
if (!$geojson || !isset($geojson['type']) || $geojson['type'] !== 'FeatureCollection') {
    echo json_encode(["error" => "無効なGeoJSON形式です"]);
    unlink($tempFilePath);
    exit;
}

// BBOXと地物数を計算
$length = count($geojson["features"]);
$bbox = [INF, INF, -INF, -INF];
foreach ($geojson["features"] as $index => &$feature) {
    $feature["properties"]["oh3id"] = $index;
    if (isset($feature["geometry"]["coordinates"])) {
        updateBBOX($feature["geometry"]["coordinates"], $bbox);
    }
}

$pmtilesPath = $pmtilesDir . $fileBaseName . ".pmtiles";
$tippecanoeCmd = sprintf(
    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s 2>&1",
    escapeshellarg($pmtilesPath),
    escapeshellarg($tempFilePath)
);

exec($tippecanoeCmd, $output, $returnVar);

if ($returnVar !== 0) {
    echo json_encode([
        "error" => "Tippecanoeの実行に失敗しました",
        "command" => $tippecanoeCmd,
        "output" => implode("\n", $output)
    ]);
    unlink($tempFilePath);
    exit;
}

deleteTempFilesExceptPmtiles($pmtilesDir);

echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,
    "tippecanoeCmd" => $tippecanoeCmd,
    "bbox" => $bbox,
    "length" => $length
], JSON_PRESERVE_ZERO_FRACTION);
exit;

function deleteTempFilesExceptPmtiles($dir) {
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..') continue;
        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'geojson') {
            unlink($fullPath);
        }
    }
}

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