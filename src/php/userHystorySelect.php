<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからuidを取得
    $uid = $_GET['uid'] ?? null;
    $device = $_GET['device'] ?? null;

    // バリデーション: 空チェック
    if (empty($uid)) {
        echo json_encode(["error" => "uidは必須です"]);
        exit;
    }

    $sql = "SELECT * FROM history WHERE uid LIKE :uid AND ua LIKE :device ORDER BY id DESC LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':uid' => $uid,
        ':device' => '%' . $device . '%'  // 部分一致検索（曖昧検索）
    ]);

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode($result);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
