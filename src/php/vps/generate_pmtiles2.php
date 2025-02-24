<?php


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// **リアルタイム出力用のヘッダー設定**
header("Content-Type: application/json");
header("Cache-Control: no-cache");
header("Connection: keep-alive");

// **バッファリングを無効化**
ini_set('output_buffering', 'off');
ini_set('zlib.output_compression', 'off');
ob_implicit_flush(true);

// ---- ここでWeb上のベースURLを指定 ----
$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";

// POSTリクエストのチェック
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]) . "\n";
    flush();
    exit;
}

// リクエストデータの取得
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data["file"])) {
    echo json_encode(["error" => "ファイルパスが指定されていません"]) . "\n";
    flush();
    exit;
}

$filePath = realpath($data["file"]);
if (!$filePath || !file_exists($filePath)) {
    echo json_encode(["error" => "指定されたGeoJSONファイルが存在しません"]) . "\n";
    flush();
    exit;
}

// GeoJSONのディレクトリを取得
$geojsonDir = dirname($filePath);
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";

// Tippecanoeコマンド構築
$tippecanoeCmd = sprintf(
    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s 2>&1",
    escapeshellarg($pmtilesPath),
    escapeshellarg($filePath)
);

// **リアルタイム出力**
$descriptorspec = [
    1 => ["pipe", "w"], // 標準出力
    2 => ["pipe", "w"]  // 標準エラー
];

$process = proc_open($tippecanoeCmd, $descriptorspec, $pipes);
if (is_resource($process)) {
    echo json_encode(["status" => "processing", "message" => "Tippecanoe実行中...", "command" => $tippecanoeCmd]) . "\n";
    flush();

    $lastSentTime = microtime(true);

    while (!feof($pipes[1])) {
        $line = fgets($pipes[1]);

        // **空の行はスキップ**
        if (!$line || trim($line) === '') {
            continue;
        }

        // **1秒ごとにログを送信**
        if ((microtime(true) - $lastSentTime) >= 1) {
            echo json_encode(["progress" => trim($line)]) . "\n";
            flush();
            ob_flush();
            $lastSentTime = microtime(true); // 最後の送信時間を更新
        }
    }

    fclose($pipes[1]);
    $returnVar = proc_close($process);
} else {
    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd]) . "\n";
    flush();
    exit;
}

// **エラーハンドリング**
if ($returnVar !== 0) {
    echo json_encode(["error" => "Tippecanoe処理エラー", "command" => $tippecanoeCmd]) . "\n";
    flush();
    exit;
}

// **成功時に元のファイルを削除**
deleteSourceAndTempFiles($filePath);

// **正常終了**
echo json_encode([
    "success" => true,
    "message" => "PMTilesファイルが作成されました",
    "pmtiles_file" => $pmtilesPath,
    "tippecanoeCmd" => $tippecanoeCmd
]) . "\n";
flush();

/**
 * GeoJSONデータを削除（.pmtiles は残す）
 */
function deleteSourceAndTempFiles($filePath)
{
    $dir = dirname($filePath);
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'geojson') {
            unlink($fullPath);
        }
    }
}

?>


//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
//    http_response_code(200);
//    exit;
//}
//
//// **リアルタイム出力用のヘッダー設定**
//header("Content-Type: application/json");
//header("Cache-Control: no-cache");
//header("Connection: keep-alive");
//
//// **バッファリングを無効化**
//ini_set('output_buffering', 'off');
//ini_set('zlib.output_compression', 'off');
//ob_implicit_flush(true);
//
//// ---- ここでWeb上のベースURLを指定 ----
//$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";
//
//// POSTリクエストのチェック
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]) . "\n";
//    flush();
//    exit;
//}
//
//// リクエストデータの取得
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["file"])) {
//    echo json_encode(["error" => "ファイルパスが指定されていません"]) . "\n";
//    flush();
//    exit;
//}
//
//$filePath = realpath($data["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    echo json_encode(["error" => "指定されたGeoJSONファイルが存在しません"]) . "\n";
//    flush();
//    exit;
//}
//
//// GeoJSONのディレクトリを取得
//$geojsonDir = dirname($filePath);
//$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";
//
//// Tippecanoeコマンド構築
//$tippecanoeCmd = sprintf(
//    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s 2>&1",
//    escapeshellarg($pmtilesPath),
//    escapeshellarg($filePath)
//);
//
//// **リアルタイム出力**
//$descriptorspec = [
//    1 => ["pipe", "w"], // 標準出力
//    2 => ["pipe", "w"]  // 標準エラー
//];
//
//$process = proc_open($tippecanoeCmd, $descriptorspec, $pipes);
//if (is_resource($process)) {
//    echo json_encode(["status" => "processing", "message" => "Tippecanoe実行中...", "command" => $tippecanoeCmd]) . "\n";
//    flush();
//
//    while (!feof($pipes[1])) {
//        $line = fgets($pipes[1]);
//        if ($line) {
//            echo json_encode(["progress" => trim($line)]) . "\n"; // JSON 形式で直接出力
//            flush();
//        }
//    }
//
//    fclose($pipes[1]);
//    $returnVar = proc_close($process);
//} else {
//    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd]) . "\n";
//    flush();
//    exit;
//}
//
//// **エラーハンドリング**
//if ($returnVar !== 0) {
//    echo json_encode(["error" => "Tippecanoe処理エラー", "command" => $tippecanoeCmd]) . "\n";
//    flush();
//    exit;
//}
//
//// **成功時に元のファイルを削除**
//deleteSourceAndTempFiles($filePath);
//
//// **正常終了**
//echo json_encode([
//        "success" => true,
//        "message" => "PMTilesファイルが作成されました",
//        "pmtiles_file" => $pmtilesPath,
//        "tippecanoeCmd" => $tippecanoeCmd
//    ]) . "\n";
//flush();
//
///**
// * GeoJSONデータを削除（.pmtiles は残す）
// */
//function deleteSourceAndTempFiles($filePath)
//{
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..') {
//            continue;
//        }
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'geojson') {
//            unlink($fullPath);
//        }
//    }
//}


//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
//    http_response_code(200);
//    exit;
//}
//
//// **リアルタイム出力用のヘッダー設定**
//header("Content-Type: text/event-stream");
//header("Cache-Control: no-cache");
//header("Connection: keep-alive");
//ob_implicit_flush(true);
//
//// ---- ここでWeb上のベースURLを指定 ----
//$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";
//
//// POSTリクエストのチェック
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo "data: " . json_encode(["error" => "POSTリクエストのみ受け付けます"]) . "\n\n";
//    exit;
//}
//
//// リクエストデータの取得
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["file"])) {
//    echo "data: " . json_encode(["error" => "ファイルパスが指定されていません"]) . "\n\n";
//    exit;
//}
//
//$filePath = realpath($data["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    echo "data: " . json_encode(["error" => "指定されたGeoJSONファイルが存在しません"]) . "\n\n";
//    exit;
//}
//
//// GeoJSONのディレクトリを取得
//$geojsonDir = dirname($filePath);
//$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";
//
//// Tippecanoeコマンド構築
//$tippecanoeCmd = sprintf(
//    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s 2>&1",
//    escapeshellarg($pmtilesPath),
//    escapeshellarg($filePath)
//);
//
//// **リアルタイム出力**
//$descriptorspec = [
//    1 => ["pipe", "w"], // 標準出力
//    2 => ["pipe", "w"]  // 標準エラー
//];
//
//$process = proc_open($tippecanoeCmd, $descriptorspec, $pipes);
//if (is_resource($process)) {
//    echo json_encode(["status" => "processing", "message" => "Tippecanoe実行中...", "command" => $tippecanoeCmd]) . "\n\n";
//    flush();
//    ob_flush();
//
//    while (!feof($pipes[1])) {
//        $line = fgets($pipes[1]);
//        if ($line) {
//            echo json_encode(["progress" => trim($line)]) . "\n\n"; // EventSource 形式
//            flush();
//            ob_flush();
//        }
//    }
//
//    fclose($pipes[1]);
//    $returnVar = proc_close($process);
//} else {
//    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd]) . "\n\n";
//    exit;
//}
//
//// **エラーハンドリング**
//if ($returnVar !== 0) {
//    echo json_encode(["error" => "Tippecanoe処理エラー", "command" => $tippecanoeCmd]) . "\n\n";
//    exit;
//}
//
//// **成功時に元のファイルを削除**
//deleteSourceAndTempFiles($filePath);
//
//// **正常終了**
//echo json_encode([
//        "success" => true,
//        "message" => "PMTilesファイルが作成されました",
//        "pmtiles_file" => $pmtilesPath,
//        "tippecanoeCmd" => $tippecanoeCmd
//    ]) . "\n\n";
//
///**
// * GeoJSONデータを削除（.pmtiles は残す）
// */
//function deleteSourceAndTempFiles($filePath)
//{
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..') {
//            continue;
//        }
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'geojson') {
//            unlink($fullPath);
//        }
//    }
//}


//
//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
//    http_response_code(200);
//    exit;
//}
//
//header("Content-Type: application/json");
//
//// ---- ここでWeb上のベースURLを指定 ----
//$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";
//
//// POSTリクエストのチェック
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
//    exit;
//}
//
//// リクエストデータの取得
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["file"])) {
//    echo json_encode(["error" => "ファイルパスが指定されていません"]);
//    exit;
//}
//
//$filePath = realpath($data["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    echo json_encode(["error" => "指定されたGeoJSONファイルが存在しません"]);
//    exit;
//}
//
//// GeoJSONのディレクトリを取得
//$geojsonDir = dirname($filePath);
//$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";
//
//// Tippecanoeコマンド構築
//$tippecanoeCmd = sprintf(
//    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s",
//    escapeshellarg($pmtilesPath),
//    escapeshellarg($filePath)
//);
//
//// **リアルタイム出力**
//$descriptorspec = [
//    1 => ["pipe", "w"], // 標準出力
//    2 => ["pipe", "w"]  // 標準エラー
//];
//
//$process = proc_open($tippecanoeCmd . " 2>&1", $descriptorspec, $pipes);
//if (is_resource($process)) {
//    echo json_encode(["status" => "processing", "message" => "Tippecanoe実行中...", "command" => $tippecanoeCmd]);
//    flush();
//    ob_flush();
//
//    while (!feof($pipes[1])) {
//        $line = fgets($pipes[1]);
//        echo json_encode(["progress" => trim($line)]) . "\n";
//        flush();
//        ob_flush();
//    }
//
//    fclose($pipes[1]);
//    $returnVar = proc_close($process);
//} else {
//    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd]);
//    exit;
//}
//
//// **エラーハンドリング**
//if ($returnVar !== 0) {
//    echo json_encode(["error" => "Tippecanoe処理エラー", "command" => $tippecanoeCmd]);
//    exit;
//}
//
//// **成功時に元のファイルを削除**
//deleteSourceAndTempFiles($filePath);
//
//// **正常終了**
//echo json_encode([
//    "success" => true,
//    "message" => "PMTilesファイルが作成されました",
//    "pmtiles_file" => $pmtilesPath,
//    "tippecanoeCmd" => $tippecanoeCmd
//]);
//
///**
// * GeoJSONデータを削除（.pmtiles は残す）
// */
//function deleteSourceAndTempFiles($filePath)
//{
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..') {
//            continue;
//        }
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'geojson') {
//            unlink($fullPath);
//        }
//    }
//}


//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// ---- ここでWeb上のベースURLを指定 ----
//$WEB_BASE_URL = "https://kenzkenz.duckdns.org/uploads/";
//
//// POSTリクエストのチェック
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    echo json_encode(["error" => "POSTリクエストのみ受け付けます"]);
//    exit;
//}
//
//// リクエストデータの取得
//$data = json_decode(file_get_contents("php://input"), true);
//if (!isset($data["file"])) {
//    echo json_encode(["error" => "ファイルパスが指定されていません"]);
//    exit;
//}
//
//$filePath = realpath($data["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    echo json_encode(["error" => "指定されたGeoJSONファイルが存在しません"]);
//    exit;
//}
//
//// GeoJSONのディレクトリを取得
//$geojsonDir = dirname($filePath);
//$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//$pmtilesPath = $geojsonDir . "/" . $fileBaseName . ".pmtiles";
//
//$tippecanoeCmd = sprintf(
//    "tippecanoe -o %s --generate-ids --no-feature-limit --no-tile-size-limit --force --drop-densest-as-needed --coalesce-densest-as-needed --simplification=2 --simplify-only-low-zooms --maximum-zoom=16 --minimum-zoom=0 --layer=oh3 %s 2>&1",
//    escapeshellarg($pmtilesPath),
//    escapeshellarg($filePath)
//);
//
//// コマンドを実行
//exec($tippecanoeCmd, $output, $returnVar);
//
//// エラーハンドリング
//if ($returnVar !== 0) {
//    echo json_encode(["error" => "Tippecanoeの実行に失敗しました", "command" => $tippecanoeCmd, "output" => implode("\n", $output)]);
//    exit;
//}
//
//if ($returnVar === 0) {
//    deleteSourceAndTempFiles($filePath);
//}
//
//// 正常終了
//echo json_encode([
//    "success" => true,
//    "message" => "PMTilesファイルが作成されました",
//    "pmtiles_file" => $pmtilesPath,   // ローカルの保存先パス
//    "tippecanoeCmd" => $tippecanoeCmd
//]);
//
///**
// * uploads 内の元データと中間データを削除（thumbnail- で始まるファイルは除外）
// */
//function deleteSourceAndTempFiles($filePath)
//{
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        // カレントディレクトリ (`.`) と 親ディレクトリ (`..`) をスキップ
//        if ($file === '.' || $file === '..') {
//            continue;
//        }
//        $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
//        // .pmtiles ファイルは削除しない
//        if (pathinfo($fullPath, PATHINFO_EXTENSION) === 'pmtiles') {
//            continue;
//        }
//        unlink($fullPath);
//    }
//}
//
//?>





