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
      SELECT
        feature_id,
        feature,
        last_editor_user_id,
        last_editor_nickname,
        updated_at
      FROM geojson_features
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

//
//header('Content-Type: application/json; charset=utf-8');
//
//require_once "pwd.php";
//$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
//
//$geojson_id = isset($_POST['geojson_id']) ? trim($_POST['geojson_id']) : '';
//if ($geojson_id === '') {
//    echo json_encode([
//        'success' => false,
//        'message' => 'geojson_id が必要です',
//    ], JSON_UNESCAPED_UNICODE);
//    exit;
//}
//
//try {
//    $stmt = $pdo->prepare("SELECT * FROM geojson_features WHERE geojson_id = :geojson_id AND is_deleted NOT LIKE 1");
//    $stmt->execute([':geojson_id' => $geojson_id]);
//    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
//    if ($rows) {
//        echo json_encode([
//            'success' => true,
//            'rows' => $rows,
//            'message' => '成功しました',
//        ], JSON_UNESCAPED_UNICODE);
//    } else {
//        echo json_encode([
//            'success' => false,
//            'rows' => [],
//            'message' => 'レコードが見つかりません',
//        ], JSON_UNESCAPED_UNICODE);
//    }
//} catch (PDOException $e) {
//    echo json_encode([
//        'success' => false,
//        'message' => 'DBエラー',
//        'error' => $e->getMessage(),
//    ], JSON_UNESCAPED_UNICODE);
//}