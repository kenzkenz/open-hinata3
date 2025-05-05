<?php

require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json; charset=utf-8");

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 市区町村コードとpublicを取得
    $stmt = $pdo->query('SELECT citycode, public FROM chibanzumap');
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // JSON出力
    echo json_encode($data);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
