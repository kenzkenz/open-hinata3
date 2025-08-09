<?php

// features_select.php
header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";  // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// --- form-data から受け取るパラメータ ---
$geojson_id = $_POST['geojson_id'] ?? null;

if (empty($geojson_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'geojson_id is required']);
    exit;
}

try {
    // --- 有効なフィーチャーをすべて取得 ---
    $sql = "
      SELECT *
      FROM geojson_features_with_master
     WHERE geojson_id  = :gid
       AND is_deleted  = 0
     ORDER BY created_at ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':gid' => $geojson_id]);

    $rows = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $rows[] = $row;
    }

    echo json_encode([
        'success' => true,
        'rows' => $rows
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'db_error',
        'detail' => $e->getMessage()
    ]);
}