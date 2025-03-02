<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    $sql = "SELECT * FROM userxyztile ORDER BY id DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode([
        "success" => true,
        'result' => $result,
    ]);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
