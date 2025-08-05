<?php
header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";  // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// --- form-data から受け取るパラメータ ---
$geojson_id  = $_POST['geojson_id'] ?? null;
$feature_ids = $_POST['feature_id'] ?? [];

// --- バリデーション ---
if (empty($geojson_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'geojson_id is required']);
    exit;
}
if (empty($feature_ids)) {
    http_response_code(400);
    echo json_encode(['error' => 'feature_id is required']);
    exit;
}
// 単一要素を配列化
if (!is_array($feature_ids)) {
    $feature_ids = [$feature_ids];
}

try {
    $pdo->beginTransaction();

    // マスター存在チェック
    $chk = $pdo->prepare("SELECT 1 FROM geojsons WHERE geojson_id = ? LIMIT 1");
    $chk->execute([$geojson_id]);
    if (!$chk->fetch()) {
        throw new Exception('geojson_id not found');
    }

    // プレースホルダ作成
    $placeholders = implode(',', array_fill(0, count($feature_ids), '?'));

    // 論理削除
    $sql = "
        UPDATE geojson_features
           SET is_deleted = 1,
               deleted_at = CURRENT_TIMESTAMP
         WHERE geojson_id = ?
           AND feature_id IN ($placeholders)
    ";
    $stmt = $pdo->prepare($sql);
    // パラメータ：最初に geojson_id、続けて feature_ids
    $params = array_merge([$geojson_id], $feature_ids);
    $stmt->execute($params);

    $deleted_count = $stmt->rowCount();

    $pdo->commit();

    // --- レスポンス ---
    echo json_encode([
        'success'       => true,
        'deleted_count' => $deleted_count,
        'feature_ids'   => $feature_ids
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'error'   => 'delete_failed',
        'message' => $e->getMessage()
    ]);
}

