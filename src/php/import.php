<?php
// MySQL接続情報
$servername = "mysql1203b.xserver.jp";
$username = "kenzkenz_ken";
$password = "kenotiai1697";
$dbname = "kenzkenz_openhinata";

// メモリ制限の拡張
ini_set('memory_limit', '512M'); // 必要に応じて変更
ini_set('max_execution_time', 0); // 実行時間の制限を無効化

// バッファリングを無効化してリアルタイム出力を可能にする
ini_set('output_buffering', 'off');
ini_set('zlib.output_compression', false);
while (ob_get_level()) ob_end_flush(); // すべての出力バッファをクリア
ob_implicit_flush(true);

// ヘッダーを設定してリアルタイム出力をサポート
header('Content-Type: text/plain');
header('Cache-Control: no-cache');

// ログファイルの設定
$log_file = 'import_log.txt';

// ログを書き込む関数
function logMessage($message) {
    global $log_file;
    // ブラウザに表示
    echo $message . "\n";
    // ファイルに保存
    file_put_contents($log_file, $message . "\n", FILE_APPEND);
}

// 進捗管理用ファイル
$progress_file = 'processed_files.json';

// CSVフォルダのパス
$folder_path = "csv"; // フォルダの名前を指定（例: csv）
$csv_files = glob($folder_path . "/*.csv");

if (empty($csv_files)) {
    logMessage("CSVフォルダ内にCSVファイルが見つかりません: $folder_path");
    exit;
}

// 進捗管理の読み込み
$processed_files = [];
if (file_exists($progress_file)) {
    $processed_files = json_decode(file_get_contents($progress_file), true) ?: [];
}

// バッチサイズの設定
$batch_size = 100; // 一度に処理する行数

// 全ファイルの処理
$total_files = count($csv_files);
$current_file_index = 1;

foreach ($csv_files as $file_path) {
    if (in_array($file_path, $processed_files)) {
        logMessage("[$current_file_index/$total_files] 既に処理済み: $file_path");
        $current_file_index++;
        continue; // 処理済みファイルはスキップ
    }

    logMessage("[$current_file_index/$total_files] 現在処理中のファイル: $file_path");

    // MySQL接続を再確立
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        logMessage("接続失敗: " . $conn->connect_error);
        exit;
    }

    // CSVファイルを開く
    if (($file = fopen($file_path, "r")) !== FALSE) {
        $header = fgetcsv($file); // 最初の行を列名として使用

        // 列名のエスケープ
        $columns = implode(",", array_map(function ($col) {
            return "`" . preg_replace('/[^a-zA-Z0-9_]/', '_', $col) . "`";
        }, $header));

        // ON DUPLICATE KEY UPDATE句の生成
        $update_clause = implode(",", array_map(function ($col) {
            $escaped_col = preg_replace('/[^a-zA-Z0-9_]/', '_', $col);
            return "`$escaped_col` = VALUES(`$escaped_col`)";
        }, $header));

        // データ行の処理
        $rows = [];
        $row_count = 0;

        while (($row = fgetcsv($file)) !== FALSE) {
            $row_count++;
            $rows[] = $row;

            if (count($rows) >= $batch_size) {
                insertBatch($rows, $conn, $columns, $update_clause);
                $rows = []; // バッチクリア
                logMessage("  現在処理中の行数: $row_count");
            }
        }

        // 残りのデータを処理
        if (!empty($rows)) {
            insertBatch($rows, $conn, $columns, $update_clause);
        }

        fclose($file);
        logMessage("  [$current_file_index/$total_files] ファイルの処理が完了しました: $file_path (行数: $row_count)");

        // 処理済みファイルを記録
        $processed_files[] = $file_path;
        file_put_contents($progress_file, json_encode($processed_files));
    } else {
        logMessage("  [$current_file_index/$total_files] CSVファイルを開くことができません: $file_path");
    }

    // MySQL接続を閉じる
    $conn->close();
    $current_file_index++;
}

logMessage("すべてのCSVデータのインポートと更新が完了しました！");

/**
 * バッチでデータを挿入する関数
 */
function insertBatch($rows, $conn, $columns, $update_clause) {
    $values = [];
    foreach ($rows as $row) {
        $values[] = "(" . implode(",", array_map(function ($value) use ($conn) {
                return is_numeric($value) ? $value : "'" . $conn->real_escape_string($value) . "'";
            }, $row)) . ")";
    }

    $sql = "INSERT INTO suikei500m ($columns) VALUES " . implode(",", $values) . " ON DUPLICATE KEY UPDATE $update_clause";

    if (!$conn->query($sql)) {
        logMessage("バッチインサートエラー: " . $conn->error);
    }
}
?>
