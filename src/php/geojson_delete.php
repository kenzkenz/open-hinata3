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
    $stmt = $pdo->prepare("DELETE FROM geojsons WHERE geojson_id = :geojson_id");
    $stmt->execute([':geojson_id' => $geojson_id]);

    // 削除された行数を取得
    $deletedRows = $stmt->rowCount();

    if ($deletedRows > 0) {
        echo json_encode([
                "success" => true,
                "deleted_id" => $geojson_id,
                "message" => "データが削除されました",
            ]
        );
    } else {
        echo json_encode([
                "success" => false,
                "message" => "削除されていません",
            ]
        );
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'DBエラー',
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}