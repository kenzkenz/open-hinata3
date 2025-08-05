<?php

header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$geojson_id = isset($_POST['geojson_id']) ? trim($_POST['geojson_id']) : '';
if ($geojson_id === '') {
    echo json_encode([
        'success' => false,
        'message' => 'geojson_id が必要です',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM geojson_features WHERE geojson_id = :geojson_id");
    $stmt->execute([':geojson_id' => $geojson_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($rows) {
        echo json_encode([
            'success' => true,
            'rows' => $rows,
            'message' => '成功しました',
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => false,
            'rows' => [],
            'message' => 'レコードが見つかりません',
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'DBエラー',
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}