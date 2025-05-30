<?php

// PHP設定
ini_set('memory_limit', '-1');
ini_set('max_execution_time', 1200);
ini_set('max_input_time', 1200);
error_reporting(E_ALL);
ini_set('display_errors', 0);

// ヘッダー
header("Content-Type: application/json; charset=UTF-8");

// 定数
$tilesBaseDir = "/var/www/html/public_html/tiles/";
$logFile = "/tmp/php_cleanup.log";

// ログ書き込み
function logMessage($message) {
    global $logFile;
    file_put_contents($logFile, date("Y-m-d H:i:s") . " - $message\n", FILE_APPEND);
}

// ディレクトリ削除
function deleteDirectory($dir) {
    global $logFile;
    if (!is_dir($dir)) {
        logMessage("Directory not found: $dir");
        return false;
    }
    exec("rm -rf " . escapeshellarg($dir), $output, $returnVar);
    if ($returnVar === 0) {
        logMessage("Deleted directory: $dir");
        return true;
    } else {
        logMessage("Failed to delete directory: $dir - " . implode("\n", $output));
        return false;
    }
}

// 結果を格納する配列
$result = [
    "logs" => [],
    "success" => true,
    "message" => "削除処理完了",
    "deleted" => 0,
    "failed" => 0
];

// 処理中ファイルの検索と解析
$result["logs"][] = "処理中ファイルの検索を開始";
$processingFiles = glob("/tmp/*_processing.txt");
if (empty($processingFiles)) {
    $result["logs"][] = "処理中ファイルは見つかりませんでした";
    $result["message"] = "削除対象なし";
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

$deletedCount = 0;
$failedCount = 0;

foreach ($processingFiles as $processingFile) {
    $result["logs"][] = "処理中ファイル発見: $processingFile";
    logMessage("Found processing file: $processingFile");

    // ファイル名から subDir と fileBaseName を抽出
    $fileName = basename($processingFile, '_processing.txt');
    $parts = explode('_', $fileName);
    if (count($parts) < 2) {
        $result["logs"][] = "ファイル名形式が不正: $processingFile";
        logMessage("Invalid processing file name format: $processingFile");
        @unlink($processingFile);
        $failedCount++;
        continue;
    }
    $subDir = end($parts);
    $fileBaseName = implode('_', array_slice($parts, 0, -1));

    // 対応するタイルディレクトリ
    $tileDir = "$tilesBaseDir$subDir/$fileBaseName/";
    $result["logs"][] = "対象ディレクトリ: $tileDir";
    logMessage("Target directory: $tileDir");

    // ディレクトリ削除
    if (deleteDirectory($tileDir)) {
        // 処理中ファイル削除
        if (file_exists($processingFile) && @unlink($processingFile)) {
            $result["logs"][] = "処理中ファイル削除: $processingFile";
            logMessage("Deleted processing file: $processingFile");
            $deletedCount++;
        } else {
            $result["logs"][] = "処理中ファイル削除失敗: $processingFile";
            logMessage("Failed to delete processing file: $processingFile");
            $failedCount++;
        }
    } else {
        $failedCount++;
    }
}

// 結果報告
$result["logs"][] = "削除処理完了: 成功 $deletedCount 件, 失敗 $failedCount 件";
logMessage("Cleanup completed: $deletedCount successes, $failedCount failures");

$result["deleted"] = $deletedCount;
$result["failed"] = $failedCount;

// JSONで結果を出力
echo json_encode($result, JSON_UNESCAPED_UNICODE);
?>