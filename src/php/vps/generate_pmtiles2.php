<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

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

$result = convertGeoJSONToUTF8($filePath);
if (strpos($result, "失敗") !== false) {
    echo json_encode(["error" => $result]);
    exit;
}

$geojsonDir = dirname($filePath);
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";

$tippecanoeCmd = sprintf(
    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=14 --minimum-zoom=0 --layer=oh3 %s 2>&1",
    escapeshellarg($pmtilesPath),
    escapeshellarg($filePath)
);

exec($tippecanoeCmd, $output, $returnVar);

if ($returnVar !== 0) {
    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
    exit;
}

if ($returnVar === 0) {
    deleteSourceAndTempFiles($filePath);
}

echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,
    "tippecanoeCmd" => $tippecanoeCmd
]);

function isShiftJIS($text) {
    $utf8Text = mb_convert_encoding($text, "UTF-8", "SJIS-win");
    $reconverted = mb_convert_encoding($utf8Text, "SJIS-win", "UTF-8");
    return $text !== $reconverted;
}

function convertGeoJSONToUTF8($filePath) {
    $sjisContent = file_get_contents($filePath);
    if (!isShiftJIS($sjisContent)) {
        return "ファイルは Shift_JIS ではありません。変換不要です。";
    }
    $utf8Content = mb_convert_encoding($sjisContent, "UTF-8", "SJIS-win");
    $geojson = json_decode($utf8Content, true);
    if ($geojson === null) {
        return "JSON のデコードに失敗しました: " . json_last_error_msg();
    }
    $utf8Json = json_encode($geojson, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($filePath, $utf8Json);
    return "変換が完了しました: " . $filePath;
}

function deleteSourceAndTempFiles($filePath) {
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'pmtiles') {
            continue;
        }
        unlink($fullPath);
    }
}
?>
