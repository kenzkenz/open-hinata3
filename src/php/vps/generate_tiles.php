<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["file"])) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]);
    exit;
}

$filePath = escapeshellarg($data["file"]);
$tileDir = escapeshellarg("/var/www/html/tiles/" . basename($filePath, ".tif") . "/");

$command = "gdal2tiles.py -z 5-15 -w none -p raster $filePath $tileDir";
exec($command, $output, $returnVar);

if ($returnVar === 0) {
    echo json_encode(["success" => true, "tiles" => $tileDir]);
} else {
    echo json_encode(["error" => "タイル生成に失敗しました", "output" => $output]);
}
?>
