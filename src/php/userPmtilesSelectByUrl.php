<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからuidを取得
    $url = $_GET['url'] ?? null;

    // バリデーション: 空チェック
    if (empty($url)) {
        echo json_encode(["error" => "urlは必須です"]);
        exit;
    }

    // SQL: 指定されたuidのデータを取得
    $sql = "SELECT * FROM userpmtiles WHERE url = :url";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':url' => $url]);

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode($result);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
