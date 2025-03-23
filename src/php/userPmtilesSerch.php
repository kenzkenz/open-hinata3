<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    $name = $_GET['name'] ?? null;


    $sql = "SELECT * FROM userpmtiles WHERE public = 1 AND name LIKE :name ORDER BY prefcode, citycode, name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => '%' . $name . '%'  // 部分一致検索（曖昧検索）
    ]);


    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode([
        "success" => true,
        'result' => $result,
        "name" => $name
    ]);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
