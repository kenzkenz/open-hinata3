<?php

// features_query.php
header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";  // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// --- form-data から受け取るパラメータ ---
$creator_user_id = isset($_POST['creator_user_id']) ? trim($_POST['creator_user_id']) : null;
$geojson_id = isset($_POST['geojson_id']) ? trim($_POST['geojson_id']) : null;

// --- バリデーション ---
// どちらも指定がない場合はエラー
if (!$creator_user_id && !$geojson_id) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'creator_user_id または geojson_id を指定してください',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if ($geojson_id) {
        // geojson_id 指定時はその ID のレコードを取得
        $stmt = $pdo->prepare("
            SELECT *
              FROM geojsons
             WHERE geojson_id = :geojson_id
             LIMIT 1
        ");
        $stmt->execute([':geojson_id' => $geojson_id]);
    } else {
        // creator_user_id 指定時はそのユーザーのすべてを取得
        $stmt = $pdo->prepare("
            SELECT *
              FROM geojsons
             WHERE creator_user_id = :creator_user_id
             ORDER BY created_at DESC
        ");
        $stmt->execute([':creator_user_id' => $creator_user_id]);
    }

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 存在しない場合も success=true で空配列を返す
    echo json_encode([
        'success' => true,
        'rows' => $rows,
        'message' => count($rows)
            ? '取得しました'
            : '該当レコードはありません',
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'DBエラーが発生しました',
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}



//
//header('Content-Type: application/json; charset=utf-8');
//
//require_once "pwd.php";
//$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
//
//$creator_user_id = isset($_POST['creator_user_id']) ? trim($_POST['creator_user_id']) : '';
//if ($creator_user_id === '') {
//    echo json_encode([
//        'success' => false,
//        'message' => 'creator_user_id が必要です',
//    ], JSON_UNESCAPED_UNICODE);
//    exit;
//}
//
//try {
//    $stmt = $pdo->prepare("SELECT * FROM geojsons WHERE creator_user_id = :creator_user_id ORDER BY created_at DESC");
//    $stmt->execute([':creator_user_id' => $creator_user_id]);
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