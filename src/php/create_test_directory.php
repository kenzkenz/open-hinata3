<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");

// ディレクトリのパス
$testDir = __DIR__ . "/uploads/aaa";

// ディレクトリ作成
if (!file_exists($testDir)) {
    if (!mkdir($testDir, 0755, true)) {
        echo json_encode(["message" => "ディレクトリ作成に失敗", "error" => error_get_last()]);
        exit;
    }
}

echo json_encode(["message" => "ディレクトリ作成成功", "path" => $testDir]);
exit;
?>
