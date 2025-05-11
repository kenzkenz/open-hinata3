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
$boundsResult = calculateBoundsAndLength($geojsonContent);
if (!$boundsResult) {
    echo json_encode(["error" => "BBOXまたは地物数の計算に失敗しました"]);
    unlink($tempFilePath);
    exit;
}
$bounds = $boundsResult['bounds'];
$length = $boundsResult['length'];

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
$headerBbox = readPMTilesBBOX($pmtilesPath);

echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,
    "tippecanoeCmd" => $tippecanoeCmd,
    "headerRegulatory: true_bbox" => $headerBbox,
    "bbox" => $bounds,
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

function readPMTilesBBOX($filepath) {
    $f = fopen($filepath, 'rb');
    if (!$f) {
        return null;
    }

    // ヘッダーから56バイトを読み込む
    $header = fread($f, 56);
    fclose($f);

    if (strlen($header) < 56) {
        return null;
    }

    // リトルエンディアンで64ビット浮動小数点数を解釈
    $minLon = unpack("P", substr($header, 8, 8))[1];
    $minLat = unpack("P", substr($header, 16, 8))[1];
    $maxLon = unpack("P", substr($header, 24, 8))[1];
    $maxLat = unpack("P", substr($header, 32, 8))[1];

    // 地理座標として妥当か検証
    if ($minLon < -180 || $minLon > 180 || $minLat < -90 || $minLat > 90 ||
        $maxLon < -180 || $maxLon > 180 || $maxLat < -90 || $maxLat > 90) {
        error_log("Invalid BBOX: minLon=$minLon, minLat=$minLat, maxLon=$maxLon, maxLat=$maxLat");
        return null;
    }

    // 浮動小数点数を高精度でフォーマット
    return [
        number_format($minLon, 14, '.', ''),
        number_format($minLat, 14, '.', ''),
        number_format($maxLon, 14, '.', ''),
        number_format($maxLat, 14, '.', '')
    ];
}

function calculateBoundsAndLength($geojsonContent) {
    $geojson = json_decode($geojsonContent, true);
    if (!$geojson || !isset($geojson['type']) || $geojson['type'] !== 'FeatureCollection') {
        error_log("Invalid GeoJSON for BBOX and length calculation");
        return null;
    }

    // 地物数を計算
    $length = count($geojson['features']);

    $minLon = null;
    $minLat = null;
    $maxLon = null;
    $maxLat = null;

    foreach ($geojson['features'] as $feature) {
        if (!isset($feature['geometry']['coordinates'])) {
            continue;
        }

        $coords = $feature['geometry']['coordinates'];
        if ($feature['geometry']['type'] === 'Polygon') {
            $coords = [$coords];
        } elseif ($feature['geometry']['type'] === 'MultiPolygon') {
            $coords = array_merge(...$coords);
        } elseif ($feature['geometry']['type'] === 'Point' || $feature['geometry']['type'] === 'LineString') {
            // PointやLineStringの場合、座標を単一または配列として処理
            $coords = [$coords];
        }

        foreach ($coords as $ring) {
            // リングが座標の配列でない場合（例：PointやLineStringの座標）
            if (!is_array($ring) || !isset($ring[0])) {
                $ring = [$ring];
            }
            foreach ($ring as $coord) {
                if (!is_array($coord) || count($coord) < 2) continue;
                $lon = $coord[0];
                $lat = $coord[1];

                // 経度を-180～180に正規化
                $lon = (($lon + 180) % 360 + 360) % 360 - 180;

                $minLon = $minLon === null ? $lon : min($minLon, $lon);
                $minLat = $minLat === null ? $lat : min($minLat, $lat);
                $maxLon = $maxLon === null ? $lon : max($maxLon, $lon);
                $maxLat = $maxLat === null ? $lat : max($maxLat, $lat);
            }
        }
    }

    if ($minLon === null || $minLat === null || $maxLon === null || $maxLat === null) {
        error_log("No valid coordinates found for BBOX calculation");
        return null;
    }

    // アンチメリディアン跨ぎのチェック
    if ($maxLon - $minLon > 180) {
        $tempLon = $minLon;
        $minLon = $maxLon;
        $maxLon = $tempLon;
        if ($maxLon < -180) $maxLon += 360;
        if ($minLon > 180) $minLon -= 360;
    }

    // BBOXを高精度な数値型で返す（フォーマットなし）
    $bounds = [
        $minLon,
        $minLat,
        $maxLon,
        $maxLat
    ];

    return [
        'bounds' => $bounds,
        'length' => $length
    ];
}

//<?php
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//ini_set('memory_limit', '-1');
//ini_set('max_execution_time', 300);
//ini_set('max_input_time', 300);
//
//$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";
//
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
//    exit;
//}
//
//if (!isset($_FILES["geojson"]) || $_FILES["geojson"]["error"] !== UPLOAD_ERR_OK || !isset($_POST["dir"])) {
//    $errors = [
//        UPLOAD_ERR_INI_SIZE => "ファイルサイズがPHPの制限を超えています",
//        UPLOAD_ERR_FORM_SIZE => "ファイルサイズがフォームの制限を超えています",
//        UPLOAD_ERR_PARTIAL => "ファイルが部分的にしかアップロードされていません",
//        UPLOAD_ERR_NO_FILE => "ファイルがアップロードされていません",
//        UPLOAD_ERR_NO_TMP_DIR => "一時ディレクトリが存在しません",
//        UPLOAD_ERR_CANT_WRITE => "ディスクへの書き込みに失敗しました",
//        UPLOAD_ERR_EXTENSION => "PHP拡張によりアップロードが中断されました"
//    ];
//    echo json_encode(["error" => $errors[$_FILES["geojson"]["error"]] ?? "geojsonファイルまたはdirが指定されていません！"]);
//    exit;
//}
//
//$dir = basename($_POST["dir"]);
//if (empty($dir) || preg_match('/[^a-zA-Z0-9_-]/', $dir)) {
//    echo json_encode(["error" => "無効なディレクトリ名です"]);
//    exit;
//}
//
//$baseUploadDir = "/var/www/html/public_html/uploads/";
//$pmtilesDir = $baseUploadDir . $dir . "/pmtiles/";
//
//if (!is_dir($pmtilesDir) && !mkdir($pmtilesDir, 0775, true)) {
//    echo json_encode(["error" => "ディレクトリの作成に失敗しました"]);
//    exit;
//}
//
//$fileBaseName = uniqid();
//$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";
//
//if (!move_uploaded_file($_FILES["geojson"]["tmp_name"], $tempFilePath)) {
//    echo json_encode(["error" => "GeoJSONファイルの保存に失敗しました"]);
//    exit;
//}
//
//// GeoJSONの検証
//$geojsonContent = file_get_contents($tempFilePath);
//if (!json_decode($geojsonContent)) {
//    echo json_encode(["error" => "無効なGeoJSON形式です"]);
//    unlink($tempFilePath);
//    exit;
//}
//
//$pmtilesPath = $pmtilesDir . $fileBaseName . ".pmtiles";
//$tippecanoeCmd = sprintf(
//    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s 2>&1",
//    escapeshellarg($pmtilesPath),
//    escapeshellarg($tempFilePath)
//);
//
//exec($tippecanoeCmd, $output, $returnVar);
//
//if ($returnVar !== 0) {
//    echo json_encode([
//        "error" => "Tippecanoeの実行に失敗しました",
//        "command" => $tippecanoeCmd,
//        "output" => implode("\n", $output)
//    ]);
//    unlink($tempFilePath);
//    exit;
//}
//
//deleteTempFilesExceptPmtiles($pmtilesDir);
//$bbox = readPMTilesBBOX($pmtilesPath);
//
//echo json_encode([
//    "success" => true,
//    "message" => "PMTilesファイルが作成されました",
//    "pmtiles_file" => $pmtilesPath,
//    "tippecanoeCmd" => $tippecanoeCmd,
//    "bbox" => $bbox,
//]);
//exit;
//
//function deleteTempFilesExceptPmtiles($dir) {
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..') continue;
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'geojson') {
//            unlink($fullPath);
//        }
//    }
//}
//
//function readPMTilesBBOX($filepath) {
//    $f = fopen($filepath, 'rb');
//    if (!$f) return null;
//    $header = fread($f, 56);
//    fclose($f);
//    if (strlen($header) < 56) return null;
//    $minLon = unpack("d", substr($header, 8, 8))[1];
//    $minLat = unpack("d", substr($header, 16, 8))[1];
//    $maxLon = unpack("d", substr($header, 24, 8))[1];
//    $maxLat = unpack("d", substr($header, 32, 8))[1];
//    return [$minLon, $minLat, $maxLon, $maxLat];
//}



//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// メモリ・時間制限を解除
//ini_set('memory_limit', '-1');
//set_time_limit(0);
//ini_set('max_execution_time', 0);
//
//$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";
//
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
//    exit;
//}
//
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["geojson"])) {
//    echo json_encode(["error" => "GeoJSONオブジェクトが指定されていません"]);
//    exit;
//}
//
//$length = count($data["geojson"]["features"]);
//
//$bbox = [INF, INF, -INF, -INF];
//foreach ($data["geojson"]["features"] as $index => &$feature) {
//    $feature["properties"]["oh3id"] = $index;
////    $feature["properties"]["chiban"] = $data["chiban"];
//    if (isset($feature["geometry"]["coordinates"])) {
//        updateBBOX($feature["geometry"]["coordinates"], $bbox);
//    }
//}
//unset($feature);
//
//if (min($bbox) < 0) {
//    $bbox = '';
//}
//
//$baseUploadDir = "/var/www/html/public_html/uploads/";
//$subDir = $data["dir"];
//$pmtilesDir = $baseUploadDir . $subDir . "/pmtiles/";
//
//if (!is_dir($pmtilesDir)) {
//    mkdir($pmtilesDir, 0777, true);
//}
//
//$fileBaseName = uniqid();
//$tempFilePath = $pmtilesDir . $fileBaseName . ".geojson";
//
//if (file_put_contents($tempFilePath, json_encode($data["geojson"])) === false) {
//    echo json_encode(["error" => "一時ファイルの作成に失敗しました"]);
//    exit;
//}
//
//$geojsonDir = dirname($tempFilePath);
//$pmtilesPath = $geojsonDir . "/" . pathinfo($tempFilePath, PATHINFO_FILENAME) . ".pmtiles";
//
//$isPoint = isFirstFeaturePoint($data["geojson"]);
//
//if (!$isPoint) {
//    $tippecanoeCmd = sprintf(
//        "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s 2>&1",
//        escapeshellarg($pmtilesPath),
//        escapeshellarg($tempFilePath)
//    );
//} else {
//    $tippecanoeCmd = sprintf(
//        "tippecanoe -rg -pk -pf --layer=oh3 -f -o %s %s 2>&1",
//        escapeshellarg($pmtilesPath),
//        escapeshellarg($tempFilePath)
//    );
//}
//
//exec($tippecanoeCmd, $output, $returnVar);
//if ($returnVar !== 0) {
//    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
//    unlink($tempFilePath);
//    exit;
//}
//
//deleteSourceAndTempFiles($tempFilePath);
//
//echo json_encode([
//    "success" => true,
//    "message" => "PMTilesファイルが作成されました",
//    "pmtiles_file" => $pmtilesPath,
//    "tippecanoeCmd" => $tippecanoeCmd,
//    "bbox" => $bbox,
//    "isPoint" => $isPoint,
//    "length" => $length
//]);
//exit;
//
//function deleteSourceAndTempFiles($filePath)
//{
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..') {
//            continue;
//        }
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'pmtiles') {
//            continue;
//        }
//        unlink($fullPath);
//    }
//}
//
//function updateBBOX($coordinates, &$bbox)
//{
//    if (!is_array($coordinates[0])) {
//        $bbox[0] = min($bbox[0], $coordinates[0]);
//        $bbox[1] = min($bbox[1], $coordinates[1]);
//        $bbox[2] = max($bbox[2], $coordinates[0]);
//        $bbox[3] = max($bbox[3], $coordinates[1]);
//    } else {
//        foreach ($coordinates as $coord) {
//            updateBBOX($coord, $bbox);
//        }
//    }
//}
//
//function isFirstFeaturePoint($geojson)
//{
//    if (
//        isset($geojson["features"]) &&
//        is_array($geojson["features"]) &&
//        count($geojson["features"]) > 0 &&
//        isset($geojson["features"][0]["geometry"]["type"])
//    ) {
//        return strtolower($geojson["features"][0]["geometry"]["type"]) === "point";
//    }
//    return false;
//}