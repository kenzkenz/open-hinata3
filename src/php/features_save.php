<?php
header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php"; // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// --- form-data から受け取るパラメータ ---
$geojson_id           = $_POST['geojson_id']           ?? null;
$feature_ids          = $_POST['feature_id']           ?? [];
$editor_ids           = $_POST['last_editor_user_id']   ?? [];
$editor_names         = $_POST['last_editor_nickname']  ?? [];
$features             = $_POST['feature']              ?? [];

// --- バリデーション（必須） ---
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

// 単一要素の場合は配列に統一
if (!is_array($feature_ids)) {
    $feature_ids  = [$feature_ids];
    $editor_ids   = is_array($editor_ids)   ? $editor_ids   : [$editor_ids];
    $editor_names = is_array($editor_names) ? $editor_names : [$editor_names];
    $features     = is_array($features)     ? $features     : [$features];
}

$upsert = $pdo->prepare("
    INSERT INTO geojson_features 
      (feature_id, geojson_id, last_editor_user_id, last_editor_nickname, feature)
    VALUES 
      (:feature_id, :geojson_id, :editor_id, :editor_name, CAST(:feature AS JSON))
    ON DUPLICATE KEY UPDATE
      last_editor_user_id  = VALUES(last_editor_user_id),
      last_editor_nickname = VALUES(last_editor_nickname),
      feature              = VALUES(feature)
");
$getUpdated = $pdo->prepare("
    SELECT updated_at
      FROM geojson_features
     WHERE feature_id = :feature_id
       AND geojson_id = :geojson_id
     LIMIT 1
");

$results = [];
$pdo->beginTransaction();

foreach ($feature_ids as $i => $fid) {
    $editor_id   = $editor_ids[$i]   ?? null;
    $editor_name = $editor_names[$i] ?? null;
    $featureJson = $features[$i]     ?? null;

    if (!$fid || !$featureJson) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'error' => 'feature_id and feature JSON are required for each item',
            'index' => $i
        ]);
        exit;
    }

    // upsert 実行
    $upsert->execute([
        ':feature_id'   => $fid,
        ':geojson_id'   => $geojson_id,
        ':editor_id'    => $editor_id,
        ':editor_name'  => $editor_name,
        ':feature'      => $featureJson,
    ]);

    // 更新日時を取得
    $getUpdated->execute([
        ':feature_id'  => $fid,
        ':geojson_id'  => $geojson_id,
    ]);
    $ua = $getUpdated->fetch(PDO::FETCH_ASSOC);
    $results[] = [
        'feature_id' => $fid,
        'updated_at' => $ua['updated_at'] ?? null,
    ];
}

$pdo->commit();

// --- レスポンス ---
echo json_encode([
    'success' => true,
    'results' => $results,
]);
