<?php
// features_update_geojson_name.php
header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";  // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// --- form-data から受け取るパラメータ ---
$geojson_id   = isset($_POST['geojson_id'])   ? trim($_POST['geojson_id'])   : '';
$geojson_name = isset($_POST['geojson_name']) ? trim($_POST['geojson_name']) : '';

// --- バリデーション ---
if ($geojson_id === '' || $geojson_name === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'geojson_id and geojson_name are required']);
    exit;
}
if (mb_strlen($geojson_name) > 64) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'geojson_name too long (max 64)']);
    exit;
}

// --- マスター存在チェック ---
$chk = $pdo->prepare("SELECT 1 FROM geojsons WHERE geojson_id = :gid LIMIT 1");
$chk->execute([':gid' => $geojson_id]);
if (!$chk->fetch()) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'geojson_id not found']);
    exit;
}

try {
    // --- 名前更新 ---
    // updated_at は ON UPDATE CURRENT_TIMESTAMP で自動更新される設定を想定
    $upd = $pdo->prepare("
        UPDATE geojsons
           SET geojson_name = :name
         WHERE geojson_id   = :gid
    ");
    $upd->execute([
        ':name' => $geojson_name,
        ':gid'  => $geojson_id,
    ]);

    echo json_encode([
        'success'        => true,
        'geojson_id'     => $geojson_id,
        'geojson_name'   => $geojson_name,
    ]);
} catch (PDOException $e) {
    // 一意制約違反（名前重複）
    if ($e->getCode() === '23000' && strpos($e->getMessage(), 'uq_geojson_name') !== false) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'geojson_name already exists']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'update_failed', 'detail' => $e->getMessage()]);
    }
}
