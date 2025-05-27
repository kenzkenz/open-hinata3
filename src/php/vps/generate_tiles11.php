<?php

// PHP設定: スクリプトの実行環境を設定
ini_set('output_buffering', '0'); // 出力バッファリングを無効化
ini_set('zlib.output_compression', '0'); // zlib圧縮を無効化
ini_set('memory_limit', '0'); // メモリ制限を無制限に設定
ini_set('max_execution_time', 1200); // 最大実行時間を1200秒に設定
ini_set('max_input_time', 1200); // 最大入力時間を1200秒に設定

// SSEヘッダー: Server-Sent Events用のヘッダーを設定
header("Content-Type: text/event-stream"); // SSEのコンテンツタイプ
header("Cache-Control: no-cache"); // キャッシュを無効化
header("Connection: keep-alive"); // 接続を保持
header("Access-Control-Allow-Origin: *"); // CORS: 全オリジン許可
header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); // 許可するHTTPメソッド
header("Access-Control-Allow-Headers: Content-Type"); // 許可するヘッダー

// バッファリング無効化: 即時出力のためにバッファをフラッシュ
ob_end_flush();
flush();

// 定数: スクリプトで使用する定数を定義
$BASE_URL = "https://kenzkenz.duckdns.org/tiles/"; // タイルのベースURL
define("EARTH_RADIUS_KM", 6371); // 地球の半径（キロメートル）
$logFile = "/tmp/php_script.log"; // ログファイルのパス

// SSE送信関数: Server-Sent Eventsでデータを送信
function sendSSE($data, $event = "message")
{
    echo "event: $event\n"; // イベント名を出力
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n"; // JSONデータをエンコードして出力
    echo "#\n"; // 区切り文字
    flush(); // 即時フラッシュ
}

// ログファイル書き込み: メッセージをログファイルに記録
function logMessage($message)
{
    global $logFile; // グローバル変数のログファイルパスを使用
    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND); // 時刻付きでログを追加
}

// POSTリクエスト確認: POSTメソッド以外を拒否
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    $error = ["error" => "POSTリクエストのみ受け付けます"];
    logMessage("Invalid request method: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

// FormData取得: 必要なPOSTパラメータを確認
if (!isset($_POST["file"]) || !isset($_POST["dir"])) {
    $error = ["error" => "ファイルパスまたはディレクトリが指定されていません"];
    logMessage("Missing file or dir: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

// ファイルパス検証: ファイルの存在とパスを検証
$filePath = realpath($_POST["file"]);
if (!$filePath || !file_exists($filePath)) {
    $error = ["error" => "ファイルが存在しません", "details" => "Path: $filePath"];
    logMessage("File not found: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("File verified: $filePath");
sendSSE(["log" => "ファイル確認完了: $filePath"]);

// パラメータ取得: POSTデータからパラメータを取得し、安全に処理
$fileName = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME); // ファイル名
$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]); // サブディレクトリ
$resolution = isset($_POST["resolution"]) ? intval($_POST["resolution"]) : 22; // 解像度
$transparent = isset($_POST["transparent"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["transparent"]) : "black"; // 透明色
$sourceEPSG = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "2450"; // 座標系

logMessage("Parameters: fileName=$fileName, subDir=$subDir, resolution=$resolution, transparent=$transparent, sourceEPSG=$sourceEPSG");
sendSSE(["log" => "パラメータ取得: fileName=$fileName, subDir=$subDir"]);

// gdalinfoで座標取得: 入力ファイルの地理座標を取得
sendSSE(["log" => "gdalinfo 実行中..."]);
$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath); // gdalinfoコマンド
exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);

if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
    $error = ["error" => "gdalinfo 失敗", "details" => implode("\n", $gdalOutput)];
    logMessage("gdalinfo failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"]; // 左上座標
$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"]; // 右下座標
logMessage("gdalinfo coordinates: upperLeft=" . json_encode($upperLeft) . ", lowerRight=" . json_encode($lowerRight));
sendSSE(["log" => "gdalinfo 座標取得完了"]);

// 座標変換: 座標系を変換する関数
function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326")
{
    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG"; // 座標変換コマンド
    exec($cmd, $output, $returnVar);
    if ($returnVar === 0 && !empty($output)) {
        $coords = explode(" ", trim($output[0]));
        return [floatval($coords[0]), floatval($coords[1])]; // 変換後の座標を返す
    }
    return null;
}

sendSSE(["log" => "座標変換開始"]);
$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG); // 最小座標
$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG); // 最大座標

if (!$minCoord || !$maxCoord) {
    $error = ["error" => "座標変換失敗"];
    logMessage("Coordinate transformation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}

$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]]; // バウンディングボックス
logMessage("Transformed bbox: " . json_encode($bbox4326));
sendSSE(["log" => "座標変換完了: " . json_encode($bbox4326)]);

$max_zoom = $resolution; // 最大ズームレベルを設定

// ディレクトリ設定: タイルの出力ディレクトリとファイルパスを設定
$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME); // ファイルのベース名
$tileDir = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/"; // タイルディレクトリ
$mbTilesPath = "$tileDir$fileBaseName.mbtiles"; // MBTilesファイルパス
$pmTilesPath = "$tileDir$fileBaseName.pmtiles"; // PMTilesファイルパス
$tileURL = "$BASE_URL$subDir/$fileBaseName/$fileBaseName.pmtiles"; // タイルURL

// ディレクトリ作成: タイルディレクトリが存在しない場合に作成
if (!is_dir($tileDir)) {
    if (!mkdir($tileDir, 0775, true)) {
        $error = ["error" => "ディレクトリ作成失敗", "details" => "Path: $tileDir"];
        logMessage("Tile directory creation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
        sendSSE($error, "error");
        exit;
    }
}
chmod($tileDir, 0775); // ディレクトリのパーミッション設定
chown($tileDir, 'www-data'); // 所有者をwww-dataに設定
chgrp($tileDir, 'www-data'); // グループをwww-dataに設定
logMessage("Tile directory created: $tileDir");
sendSSE(["log" => "タイルディレクトリ作成: $tileDir"]);

// グレースケール判定: 入力ファイルがグレースケールか判定
function isGrayscale($filePath)
{
    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
    $infoJson = json_decode(implode("\n", $infoOutput), true);
    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1; // バンド数が1ならグレースケール
}

$isGray = isGrayscale($filePath); // グレースケール判定実行
$outputFilePath = $filePath; // 出力ファイルパス
$alpha_value = $transparent === 'black' ? '-a 0,0,0' : ($transparent === 'white' ? '-a 255,255,255' : ''); // 透明色の設定
logMessage("Grayscale check: " . ($isGray ? "Grayscale" : "Color"));
sendSSE(["log" => "グレースケール判定完了: " . ($isGray ? "グレースケール" : "カラー")]);

// gdal2tiles実行: タイルを生成
sendSSE(["log" => "タイル生成準備中。少々お待ちください。"]);
$tileCommand = "gdal2tiles.py $alpha_value -z 10-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes=8 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tileDir); // タイル生成コマンド
logMessage("Executing gdal2tiles: $tileCommand");
$descriptors = [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]]; // プロセス記述子
$process = proc_open($tileCommand, $descriptors, $pipes);
if (is_resource($process)) {
    stream_set_blocking($pipes[1], false); // 標準出力を非ブロッキングに
    stream_set_blocking($pipes[2], false); // 標準エラー出力を非ブロッキングに
    while (!feof($pipes[1]) || !feof($pipes[2])) {
        $stdout = fgets($pipes[1]); // 標準出力を取得
        $stderr = fgets($pipes[2]); // 標準エラー出力を取得
        if ($stdout) {
            $log = trim($stdout);
            logMessage("gdal2tiles stdout: $log");
            sendSSE(["log" => $log]);
        }
        if ($stderr) {
            $log = trim($stderr);
            logMessage("gdal2tiles stderr: $log");
            sendSSE(["log" => "[ERROR] $log"]);
        }
        usleep(100000); // 0.1秒待機
    }
    fclose($pipes[1]); // パイプを閉じる
    fclose($pipes[2]);
    $tileReturnVar = proc_close($process); // プロセスを終了
} else {
    $tileReturnVar = 1; // プロセス開始失敗
}

if ($tileReturnVar !== 0) {
    $error = ["error" => "gdal2tiles 失敗"];
    logMessage("gdal2tiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("gdal2tiles succeeded: $tileDir");
sendSSE(["log" => "gdal2tiles によるタイル生成が完了しました"]);

// mb-util実行: MBTilesを生成
sendSSE(["log" => "mb-util によるMBTiles生成を開始します"]);
$mbUtilPath = "/var/www/venv/bin/mb-util"; // mb-utilのパス
$pythonPath = "/var/www/venv/lib/python3.12/site-packages"; // Pythonパス
if (!file_exists($mbUtilPath) || !is_executable($mbUtilPath)) {
    $error = ["error" => "mb-util 未インストール", "details" => "Path: $mbUtilPath"];
    logMessage("mb-util check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$mbTilesCommand = "PYTHONPATH=$pythonPath /var/www/venv/bin/python3 $mbUtilPath --image_format=png " . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath) . " 2>&1"; // MBTiles生成コマンド
exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
logMessage("mb-util output: " . implode("\n", $mbTilesOutput));
if ($mbTilesReturnVar !== 0) {
    $error = ["error" => "mb-util 失敗", "details" => implode("\n", $mbTilesOutput)];
    logMessage("mb-util failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("mb-util succeeded: $mbTilesPath");
chmod($mbTilesPath, 0664); // パーミッション設定
chown($mbTilesPath, 'www-data'); // 所有者設定
chgrp($mbTilesPath, 'www-data'); // グループ設定
sendSSE(["log" => "mb-util によるMBTiles生成が完了しました"]);

// go-pmtiles実行: PMTilesを生成
sendSSE(["log" => "go-pmtiles によるPMTiles生成を開始します"]);
$pmTilesPathCmd = "/usr/local/bin/go-pmtiles"; // go-pmtilesのパス
if (!file_exists($pmTilesPathCmd) || !is_executable($pmTilesPathCmd)) {
    $error = ["error" => "go-pmtiles 未インストール", "details" => "Path: $pmTilesPathCmd"];
    logMessage("go-pmtiles check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
$pmTilesCommand = "$pmTilesPathCmd convert " . escapeshellarg($mbTilesPath) . " " . escapeshellarg($pmTilesPath) . " 2>&1"; // PMTiles変換コマンド
exec($pmTilesCommand, $pmTilesOutput, $pmTilesReturnVar);
logMessage("go-pmtiles output: " . implode("\n", $pmTilesOutput));
if ($pmTilesReturnVar !== 0) {
    $error = ["error" => "go-pmtiles 失敗", "details" => implode("\n", $pmTilesOutput)];
    logMessage("go-pmtiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
    sendSSE($error, "error");
    exit;
}
logMessage("go-pmtiles succeeded: $pmTilesPath");
chmod($pmTilesPath, 0664); // パーミッション設定
chown($pmTilesPath, 'www-data'); // 所有者設定
chgrp($pmTilesPath, 'www-data'); // グループ設定
sendSSE(["log" => "go-pmtiles によるPMTiles生成が完了しました"]);

// layer.json生成: タイル情報をJSONファイルに保存
$layerJsonPath = "$tileDir/layer.json"; // layer.jsonのパス
$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); // JSONデータ
file_put_contents($layerJsonPath, $layerData); // ファイルに書き込み
chmod($layerJsonPath, 0664); // パーミッション設定
chown($layerJsonPath, 'www-data'); // 所有者設定
chgrp($layerJsonPath, 'www-data'); // グループ設定
logMessage("layer.json created: $layerJsonPath");
sendSSE(["log" => "layer.json を生成しました"]);

// クリーンアップ: ソースファイルと一時ファイルを削除
function deleteSourceAndTempFiles($filePath)
{
    $dir = dirname($filePath); // ディレクトリ取得
    foreach (scandir($dir) as $file) {
        if ($file === '.' || $file === '..') continue; // 親ディレクトリをスキップ
        $fullPath = "$dir/$file";
        if (is_file($fullPath)) unlink($fullPath); // ファイルを削除
    }
}

deleteSourceAndTempFiles($filePath);
logMessage("Source and temp files deleted");
sendSSE(["log" => "元データと中間データを削除しました"]);

// タイルディレクトリクリーンアップ: 不要なファイルを削除
function deleteTileDirContents($tileDir, $fileBaseName)
{
    global $logFile;
    $keepFiles = ["$fileBaseName.pmtiles", "layer.json"]; // 保持するファイル
    foreach (scandir($tileDir) as $item) {
        if ($item === '.' || $item === '..') continue; // 親ディレクトリをスキップ
        $fullPath = "$tileDir/$item";
        if (in_array($item, $keepFiles)) continue; // 保持ファイルはスキップ
        if (is_dir($fullPath)) {
            exec("rm -rf " . escapeshellarg($fullPath)); // ディレクトリを削除
        } else {
            unlink($fullPath); // ファイルを削除
        }
    }
    logMessage("Tile directory cleaned: $tileDir");
}

deleteTileDirContents($tileDir, $fileBaseName);
sendSSE(["log" => "タイルディレクトリの不要なファイルを削除しました"]);

// pmtilesファイルのサイズを取得: メガバイト単位で計算
$pmTilesSizeBytes = file_exists($pmTilesPath) ? filesize($pmTilesPath) : 0; // バイト単位のサイズ
$pmTilesSizeMB = $pmTilesSizeBytes / (1024 * 1024); // メガバイトに変換
$pmTilesSizeMB = round($pmTilesSizeMB, 2); // 小数点以下2桁に丸める
logMessage("pmtiles size: $pmTilesSizeMB MB");

// 成功レスポンス: 処理結果を返す
$response = [
    "success" => true,
    "tiles_url" => $tileURL,
    "tiles_dir" => $tileDir,
    "bbox" => $bbox4326,
    "max_zoom" => $max_zoom,
    "tileCommand" => $tileCommand,
    "pmtiles_size_mb" => $pmTilesSizeMB // ファイルサイズ（MB）を追加
];
logMessage("Process completed: " . json_encode($response, JSON_UNESCAPED_UNICODE));
sendSSE($response, "success");

//// PHP設定
//ini_set('output_buffering', '0');
//ini_set('zlib.output_compression', '0');
//ini_set('memory_limit', '0');
//ini_set('max_execution_time', 1200);
//ini_set('max_input_time', 1200);
//
//// SSEヘッダー
//header("Content-Type: text/event-stream");
//header("Cache-Control: no-cache");
//header("Connection: keep-alive");
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// バッファリング無効化
//ob_end_flush();
//flush();
//
//// 定数
//$BASE_URL = "https://kenzkenz.duckdns.org/tiles/";
//define("EARTH_RADIUS_KM", 6371);
//$logFile = "/tmp/php_script.log";
//
//// SSE送信関数
//function sendSSE($data, $event = "message") {
//    echo "event: $event\n";
//    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
//    echo "#\n";
//    flush();
//}
//
//// ログファイル書き込み
//function logMessage($message) {
//    global $logFile;
//    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND);
//}
//
//// POSTリクエスト確認
//if ($_SERVER["REQUEST_METHOD"] !== "POST") {
//    $error = ["error" => "POSTリクエストのみ受け付けます"];
//    logMessage("Invalid request method: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//// FormData取得
//if (!isset($_POST["file"]) || !isset($_POST["dir"])) {
//    $error = ["error" => "ファイルパスまたはディレクトリが指定されていません"];
//    logMessage("Missing file or dir: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//// ファイルパス検証
//$filePath = realpath($_POST["file"]);
//if (!$filePath || !file_exists($filePath)) {
//    $error = ["error" => "ファイルが存在しません", "details" => "Path: $filePath"];
//    logMessage("File not found: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("File verified: $filePath");
//sendSSE(["log" => "ファイル確認完了: $filePath"]);
//
//// パラメータ取得
//$fileName = isset($_POST["fileName"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["fileName"]) : pathinfo($filePath, PATHINFO_FILENAME);
//$subDir = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["dir"]);
//$resolution = isset($_POST["resolution"]) ? intval($_POST["resolution"]) : 22;
//$transparent = isset($_POST["transparent"]) ? preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST["transparent"]) : "black";
//$sourceEPSG = isset($_POST["srs"]) ? preg_replace('/[^0-9]/', '', $_POST["srs"]) : "2450";
//
//logMessage("Parameters: fileName=$fileName, subDir=$subDir, resolution=$resolution, transparent=$transparent, sourceEPSG=$sourceEPSG");
//sendSSE(["log" => "パラメータ取得: fileName=$fileName, subDir=$subDir"]);
//
//// gdalinfoで座標取得
//sendSSE(["log" => "gdalinfo 実行中..."]);
//$gdalInfoCommand = "gdalinfo -json " . escapeshellarg($filePath);
//exec($gdalInfoCommand, $gdalOutput, $gdalReturnVar);
//$gdalOutputJson = json_decode(implode("\n", $gdalOutput), true);
//
//if (!$gdalOutputJson || !isset($gdalOutputJson["cornerCoordinates"])) {
//    $error = ["error" => "gdalinfo 失敗", "details" => implode("\n", $gdalOutput)];
//    logMessage("gdalinfo failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//$upperLeft = $gdalOutputJson["cornerCoordinates"]["upperLeft"];
//$lowerRight = $gdalOutputJson["cornerCoordinates"]["lowerRight"];
//logMessage("gdalinfo coordinates: upperLeft=" . json_encode($upperLeft) . ", lowerRight=" . json_encode($lowerRight));
//sendSSE(["log" => "gdalinfo 座標取得完了"]);
//
//// 座標変換
//function transformCoords($x, $y, $sourceEPSG, $targetEPSG = "4326") {
//    $cmd = "echo '$x $y' | gdaltransform -s_srs EPSG:$sourceEPSG -t_srs EPSG:$targetEPSG";
//    exec($cmd, $output, $returnVar);
//    if ($returnVar === 0 && !empty($output)) {
//        $coords = explode(" ", trim($output[0]));
//        return [floatval($coords[0]), floatval($coords[1])];
//    }
//    return null;
//}
//
//sendSSE(["log" => "座標変換開始"]);
//$minCoord = transformCoords($upperLeft[0], $lowerRight[1], $sourceEPSG);
//$maxCoord = transformCoords($lowerRight[0], $upperLeft[1], $sourceEPSG);
//
//if (!$minCoord || !$maxCoord) {
//    $error = ["error" => "座標変換失敗"];
//    logMessage("Coordinate transformation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//
//$bbox4326 = [$minCoord[0], $minCoord[1], $maxCoord[0], $maxCoord[1]];
//logMessage("Transformed bbox: " . json_encode($bbox4326));
//sendSSE(["log" => "座標変換完了: " . json_encode($bbox4326)]);
//
//$max_zoom = $resolution;
//
//// ディレクトリ設定
//$fileBaseName = pathinfo($filePath, PATHINFO_FILENAME);
//$tileDir = "/var/www/html/public_html/tiles/$subDir/$fileBaseName/";
//$mbTilesPath = "$tileDir$fileBaseName.mbtiles";
//$pmTilesPath = "$tileDir$fileBaseName.pmtiles";
//$tileURL = "$BASE_URL$subDir/$fileBaseName/$fileBaseName.pmtiles";
//
//// ディレクトリ作成
//if (!is_dir($tileDir)) {
//    if (!mkdir($tileDir, 0775, true)) {
//        $error = ["error" => "ディレクトリ作成失敗", "details" => "Path: $tileDir"];
//        logMessage("Tile directory creation failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//        sendSSE($error, "error");
//        exit;
//    }
//}
//chmod($tileDir, 0775);
//chown($tileDir, 'www-data');
//chgrp($tileDir, 'www-data');
//logMessage("Tile directory created: $tileDir");
//sendSSE(["log" => "タイルディレクトリ作成: $tileDir"]);
//
//// グレースケール判定
//function isGrayscale($filePath) {
//    exec("gdalinfo -json " . escapeshellarg($filePath), $infoOutput, $infoReturnVar);
//    $infoJson = json_decode(implode("\n", $infoOutput), true);
//    return isset($infoJson["bands"]) && count($infoJson["bands"]) === 1;
//}
//
//$isGray = isGrayscale($filePath);
//$outputFilePath = $filePath;
//$alpha_value = $transparent === 'black' ? '-a 0,0,0' : ($transparent === 'white' ? '-a 255,255,255' : '');
//logMessage("Grayscale check: " . ($isGray ? "Grayscale" : "Color"));
//sendSSE(["log" => "グレースケール判定完了: " . ($isGray ? "グレースケール" : "カラー")]);
//
//// gdal2tiles実行
//sendSSE(["log" => "タイル生成準備中。少々お待ちください。"]);
//$tileCommand = "gdal2tiles.py $alpha_value -z 10-$max_zoom --s_srs EPSG:$sourceEPSG --xyz --processes=8 " . escapeshellarg($outputFilePath) . " " . escapeshellarg($tileDir);
//logMessage("Executing gdal2tiles: $tileCommand");
//$descriptors = [0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]];
//$process = proc_open($tileCommand, $descriptors, $pipes);
//if (is_resource($process)) {
//    stream_set_blocking($pipes[1], false);
//    stream_set_blocking($pipes[2], false);
//    while (!feof($pipes[1]) || !feof($pipes[2])) {
//        $stdout = fgets($pipes[1]);
//        $stderr = fgets($pipes[2]);
//        if ($stdout) {
//            $log = trim($stdout);
//            logMessage("gdal2tiles stdout: $log");
//            sendSSE(["log" => $log]);
//        }
//        if ($stderr) {
//            $log = trim($stderr);
//            logMessage("gdal2tiles stderr: $log");
//            sendSSE(["log" => "[ERROR] $log"]);
//        }
//        usleep(100000);
//    }
//    fclose($pipes[1]);
//    fclose($pipes[2]);
//    $tileReturnVar = proc_close($process);
//} else {
//    $tileReturnVar = 1;
//}
//
//if ($tileReturnVar !== 0) {
//    $error = ["error" => "gdal2tiles 失敗"];
//    logMessage("gdal2tiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("gdal2tiles succeeded: $tileDir");
//sendSSE(["log" => "gdal2tiles によるタイル生成が完了しました"]);
//
//// mb-util実行
//sendSSE(["log" => "mb-util によるMBTiles生成を開始します"]);
//$mbUtilPath = "/var/www/venv/bin/mb-util";
//$pythonPath = "/var/www/venv/lib/python3.12/site-packages";
//if (!file_exists($mbUtilPath) || !is_executable($mbUtilPath)) {
//    $error = ["error" => "mb-util 未インストール", "details" => "Path: $mbUtilPath"];
//    logMessage("mb-util check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//$mbTilesCommand = "PYTHONPATH=$pythonPath /var/www/venv/bin/python3 $mbUtilPath --image_format=png " . escapeshellarg($tileDir) . " " . escapeshellarg($mbTilesPath) . " 2>&1";
//exec($mbTilesCommand, $mbTilesOutput, $mbTilesReturnVar);
//logMessage("mb-util output: " . implode("\n", $mbTilesOutput));
//if ($mbTilesReturnVar !== 0) {
//    $error = ["error" => "mb-util 失敗", "details" => implode("\n", $mbTilesOutput)];
//    logMessage("mb-util failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("mb-util succeeded: $mbTilesPath");
//chmod($mbTilesPath, 0664);
//chown($mbTilesPath, 'www-data');
//chgrp($mbTilesPath, 'www-data');
//sendSSE(["log" => "mb-util によるMBTiles生成が完了しました"]);
//
//// go-pmtiles実行
//sendSSE(["log" => "go-pmtiles によるPMTiles生成を開始します"]);
//$pmTilesPathCmd = "/usr/local/bin/go-pmtiles";
//if (!file_exists($pmTilesPathCmd) || !is_executable($pmTilesPathCmd)) {
//    $error = ["error" => "go-pmtiles 未インストール", "details" => "Path: $pmTilesPathCmd"];
//    logMessage("go-pmtiles check failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//$pmTilesCommand = "$pmTilesPathCmd convert " . escapeshellarg($mbTilesPath) . " " . escapeshellarg($pmTilesPath) . " 2>&1";
//exec($pmTilesCommand, $pmTilesOutput, $pmTilesReturnVar);
//logMessage("go-pmtiles output: " . implode("\n", $pmTilesOutput));
//if ($pmTilesReturnVar !== 0) {
//    $error = ["error" => "go-pmtiles 失敗", "details" => implode("\n", $pmTilesOutput)];
//    logMessage("go-pmtiles failed: " . json_encode($error, JSON_UNESCAPED_UNICODE));
//    sendSSE($error, "error");
//    exit;
//}
//logMessage("go-pmtiles succeeded: $pmTilesPath");
//chmod($pmTilesPath, 0664);
//chown($pmTilesPath, 'www-data');
//chgrp($pmTilesPath, 'www-data');
//sendSSE(["log" => "go-pmtiles によるPMTiles生成が完了しました"]);
//
//// layer.json生成
//$layerJsonPath = "$tileDir/layer.json";
//$layerData = json_encode(["fileName" => $fileName, "bounds" => $bbox4326], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
//file_put_contents($layerJsonPath, $layerData);
//chmod($layerJsonPath, 0664);
//chown($layerJsonPath, 'www-data');
//chgrp($layerJsonPath, 'www-data');
//logMessage("layer.json created: $layerJsonPath");
//sendSSE(["log" => "layer.json を生成しました"]);
//
//// クリーンアップ
//function deleteSourceAndTempFiles($filePath) {
//    $dir = dirname($filePath);
//    foreach (scandir($dir) as $file) {
//        if ($file === '.' || $file === '..') continue;
//        $fullPath = "$dir/$file";
//        if (is_file($fullPath)) unlink($fullPath);
//    }
//}
//deleteSourceAndTempFiles($filePath);
//logMessage("Source and temp files deleted");
//sendSSE(["log" => "元データと中間データを削除しました"]);
//
//// タイルディレクトリクリーンアップ
//function deleteTileDirContents($tileDir, $fileBaseName) {
//    global $logFile;
//    $keepFiles = ["$fileBaseName.pmtiles", "layer.json"];
//    foreach (scandir($tileDir) as $item) {
//        if ($item === '.' || $item === '..') continue;
//        $fullPath = "$tileDir/$item";
//        if (in_array($item, $keepFiles)) continue;
//        if (is_dir($fullPath)) {
//            exec("rm -rf " . escapeshellarg($fullPath));
//        } else {
//            unlink($fullPath);
//        }
//    }
//    logMessage("Tile directory cleaned: $tileDir");
//}
//deleteTileDirContents($tileDir, $fileBaseName);
//sendSSE(["log" => "タイルディレクトリの不要なファイルを削除しました"]);
//
//// 成功レスポンス
//$response = [
//    "success" => true,
//    "tiles_url" => $tileURL,
//    "tiles_dir" => $tileDir,
//    "bbox" => $bbox4326,
//    "max_zoom" => $max_zoom,
//    "tileCommand" => $tileCommand
//];
//logMessage("Process completed: " . json_encode($response, JSON_UNESCAPED_UNICODE));
//sendSSE($response, "success");