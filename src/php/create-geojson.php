<?php
header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 入力
$geojson_name     = isset($_POST['geojson_name']) ? trim($_POST['geojson_name']) : '';
$creator_user_id  = isset($_POST['creator_user_id']) ? trim($_POST['creator_user_id']) : null;
$creator_nickname = isset($_POST['creator_nickname']) ? trim($_POST['creator_nickname']) : '';

// バリデーション
if ($geojson_name === '' || $creator_nickname === '') {
    http_response_code(400);
    echo json_encode(['error' => 'geojson_name and creator_nickname are required']);
    exit;
}
if (mb_strlen($geojson_name) > 64) {
    http_response_code(400);
    echo json_encode(['error' => 'geojson_name too long (max 64)']);
    exit;
}

// 事前チェック：名前の重複があればそれを返して終了（成功扱い）
$chk = $pdo->prepare("SELECT geojson_id FROM geojsons WHERE geojson_name = :name AND creator_user_id = :creator_user_id LIMIT 1");
$chk->execute([
    ':name' => $geojson_name,
    ':creator_user_id' => $creator_user_id,
]);
if ($row = $chk->fetch(PDO::FETCH_ASSOC)) {
    echo json_encode([
        'success'               => true,
        'already_exists'       => true,
        'geojson_id'           => $row['geojson_id'],
        'geojson_name'         => $geojson_name,
        'message'              => 'geojson_name already exists, returning existing id',
    ]);
    exit;
}

// ランダムID生成（英数字 12文字）
function generateRandomId(int $length = 12): string {
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $max = strlen($chars) - 1;
    $id = '';
    for ($i = 0; $i < $length; $i++) {
        $id .= $chars[random_int(0, $max)];
    }
    return $id;
}

// 一意な geojson_id を生成（最大5回トライ）
$attempt = 0;
do {
    $geojson_id = generateRandomId(12);
    $stmt = $pdo->prepare("SELECT 1 FROM geojsons WHERE geojson_id = :gid LIMIT 1");
    $stmt->execute([':gid' => $geojson_id]);
    $exists = (bool)$stmt->fetch();
    $attempt++;
    if ($attempt >= 5 && $exists) {
        http_response_code(500);
        echo json_encode(['error' => 'failed to generate unique geojson_id']);
        exit;
    }
} while ($exists);

// 挿入
try {
    $stmt = $pdo->prepare("
        INSERT INTO geojsons (geojson_id, geojson_name, creator_user_id, creator_nickname)
        VALUES (:geojson_id, :geojson_name, :creator_user_id, :creator_nickname)
    ");
    $stmt->execute([
        ':geojson_id'      => $geojson_id,
        ':geojson_name'    => $geojson_name,
        ':creator_user_id' => $creator_user_id,
        ':creator_nickname'=> $creator_nickname,
    ]);

    echo json_encode([
        'success'       => true,
        'already_exists'=> false,
        'geojson_id'    => $geojson_id,
        'geojson_name'  => $geojson_name,
    ]);
} catch (PDOException $e) {
    $msg = $e->getMessage();
    // 名前の競合が後から発生した（レース）の場合は既存を返す
    if ($e->getCode() === '23000' && str_contains($msg, 'uq_geojson_name')) {
        $existing = $pdo->prepare("SELECT geojson_id FROM geojsons WHERE geojson_name = :name LIMIT 1");
        $existing->execute([':name' => $geojson_name]);
        if ($ex = $existing->fetch(PDO::FETCH_ASSOC)) {
            echo json_encode([
                'success' => true,
                'already_exists' => true,
                'geojson_id' => $ex['geojson_id'],
                'geojson_name' => $geojson_name,
                'message' => 'geojson_name already existed (race), returning existing id',
            ]);
            exit;
        }
    }

    // それ以外はエラー
    http_response_code(500);
    echo json_encode(['error' => 'insert failed', 'detail' => $msg]);
}
