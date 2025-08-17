<?php

header('Content-Type: application/json; charset=utf-8');
require_once "pwd.php";  // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// --- form-data から受け取るパラメータ ---
$geojson_id = $_POST['geojson_id'] ?? null;
$feature_ids = $_POST['feature_id'] ?? [];
$editor_ids = $_POST['last_editor_user_id'] ?? [];
$editor_names = $_POST['last_editor_nickname'] ?? [];
$features = $_POST['feature'] ?? [];
$prev_updated_ats = $_POST['prev_updated_at'] ?? [];

// --- バリデーション ---
if (empty($geojson_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'geojson_id is required']);
    exit;
}
if (empty($feature_ids)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'feature_id is required',
        'feature_ids' => $feature_ids
    ]);
    exit;
}
// 単一要素を配列化
if (!is_array($feature_ids)) {
    $feature_ids = [$feature_ids];
    $editor_ids = (array)$editor_ids;
    $editor_names = (array)$editor_names;
    $features = (array)$features;
    $prev_updated_ats = (array)$prev_updated_ats;
}

$results = [];
$pdo->beginTransaction();

// 準備
$checkMaster = $pdo->prepare("SELECT 1 FROM geojsons WHERE geojson_id = :gid LIMIT 1");
$stmtInsert = $pdo->prepare("
    INSERT INTO geojson_features
      (feature_id, geojson_id, last_editor_user_id, last_editor_nickname, feature)
    VALUES
      (:feature_id, :geojson_id, :editor_id, :editor_name, CAST(:feature AS JSON))
");
$stmtUpdate = $pdo->prepare("
    UPDATE geojson_features SET
      last_editor_user_id  = :editor_id,
      last_editor_nickname = :editor_name,
      feature              = CAST(:feature AS JSON),
      updated_at           = CURRENT_TIMESTAMP
    WHERE feature_id = :feature_id
      AND geojson_id = :geojson_id
");
$stmtCondUpd = $pdo->prepare("
    UPDATE geojson_features SET
      last_editor_user_id  = :editor_id,
      last_editor_nickname = :editor_name,
      feature              = CAST(:feature AS JSON),
      updated_at           = CURRENT_TIMESTAMP
    WHERE feature_id = :feature_id
      AND geojson_id = :geojson_id
      AND updated_at = :prev_updated_at
");
$stmtSelect = $pdo->prepare("
    SELECT feature_id, updated_at
      FROM geojson_features
     WHERE feature_id = :feature_id
       AND geojson_id = :geojson_id
     LIMIT 1
");

foreach ($feature_ids as $i => $fid) {
    $editor_id = $editor_ids[$i] ?? null;
    $editor_name = $editor_names[$i] ?? null;
    $featureJson = $features[$i] ?? null;
    $prevUpdated = $prev_updated_ats[$i] ?? null;

    // 必須チェック
    if (!$fid || !$featureJson) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'error' => 'feature_id and feature JSON are required',
            'index' => $i,
            'id' => $fid,
            'featureJson' => $featureJson,
        ]);
        exit;
    }

//    // $featureJson が空ならスキップ
//    if (trim($featureJson) === '') {
//        continue;
//    }


    // マスター存在チェック
    $checkMaster->execute([':gid' => $geojson_id]);
    if (!$checkMaster->fetch()) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'geojson_id not found', 'geojson_id' => $geojson_id]);
        exit;
    }

    // 存在チェック
    $stmtSelect->execute([':feature_id' => $fid, ':geojson_id' => $geojson_id]);
    $row = $stmtSelect->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        // 新規追加
        $stmtInsert->execute([
            ':feature_id' => $fid,
            ':geojson_id' => $geojson_id,
            ':editor_id' => $editor_id,
            ':editor_name' => $editor_name,
            ':feature' => $featureJson,
        ]);
        // 追加後の updated_at を取る
        $stmtSelect->execute([':feature_id' => $fid, ':geojson_id' => $geojson_id]);
        $new = $stmtSelect->fetch(PDO::FETCH_ASSOC);
        $results[] = [
            'feature_id' => $fid,
            'status' => 'inserted',
            'updated_at' => $new['updated_at']
        ];
    } else {
        // 既存 → 更新 or 競合チェック
        if ($prevUpdated) {
            // 楽観ロック付き更新
            $stmtCondUpd->execute([
                ':editor_id' => $editor_id,
                ':editor_name' => $editor_name,
                ':feature' => $featureJson,
                ':feature_id' => $fid,
                ':geojson_id' => $geojson_id,
                ':prev_updated_at' => $prevUpdated,
            ]);
            if ($stmtCondUpd->rowCount() === 0) {
                // 競合
                $results[] = [
                    'feature_id' => $fid,
                    'status' => 'conflict',
                    'current_updated_at' => $row['updated_at']
                ];
                continue;
            }
        } else {
            // 無条件更新
            $stmtUpdate->execute([
                ':editor_id' => $editor_id,
                ':editor_name' => $editor_name,
                ':feature' => $featureJson,
                ':feature_id' => $fid,
                ':geojson_id' => $geojson_id,
            ]);
        }
        // 更新後の updated_at
        $stmtSelect->execute([':feature_id' => $fid, ':geojson_id' => $geojson_id]);
        $new = $stmtSelect->fetch(PDO::FETCH_ASSOC);
        $results[] = [
            'feature_id' => $fid,
            'status' => 'updated',
            'updated_at' => $new['updated_at']
        ];
    }
}

$pdo->commit();
echo json_encode([
    'success' => true,
    'results' => $results,
    'feature' => $featureJson
]);
