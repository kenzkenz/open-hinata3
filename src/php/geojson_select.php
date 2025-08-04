<?php

header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$creator_user_id = isset($_POST['creator_user_id']) ? trim($_POST['creator_user_id']) : '';
if ($creator_user_id === '') {
    echo json_encode([
        'success' => false,
        'message' => 'creator_user_id が必要です',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM geojsons WHERE creator_user_id = :creator_user_id");
    $stmt->execute([':creator_user_id' => $creator_user_id]);
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