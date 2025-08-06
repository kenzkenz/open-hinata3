<?php
// get-updates.php
header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";  // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

try {
    // --- form-data から受け取る ---
    $geojson_id = $_POST['geojson_id'] ?? null;
    $since      = $_POST['since']      ?? null;

    if (!$geojson_id || !$since) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'geojson_id and since are required']);
        exit;
    }

    // --- 差分取得 ---
    $sql = "
      SELECT
        feature_id,
        feature,
        last_editor_user_id,
        last_editor_nickname,
        updated_at,
        is_deleted,
        deleted_at
      FROM geojson_features
      WHERE geojson_id = :gid
        AND updated_at > :since
      ORDER BY updated_at ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':gid'   => $geojson_id,
        ':since' => $since,
    ]);

    $features  = [];
    $deletions = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if ((int)$row['is_deleted'] === 1) {
            // 論理削除されたものは deletions 配列へ
            $deletions[] = [
                'feature_id' => $row['feature_id'],
                'deleted_at' => $row['deleted_at'],
            ];
        } else {
            // 新規追加または更新されたものは features 配列へ
            $f = json_decode($row['feature'], true);
            if (!isset($f['properties']) || !is_array($f['properties'])) {
                $f['properties'] = [];
            }
            // メタ情報を properties にマージ
            $f['properties']['last_editor_user_id']  = $row['last_editor_user_id'];
            $f['properties']['last_editor_nickname'] = $row['last_editor_nickname'];
            $f['properties']['updated_at']           = $row['updated_at'];
            $features[] = $f;
        }
    }

    // --- レスポンス ---
    echo json_encode([
        'success'   => true,
        'features'  => $features,
        'deletions' => $deletions,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'db_error',
        'detail'  => $e->getMessage()
    ]);
}

