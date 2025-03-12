<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETからuidを取得
    $uid = $_GET['uid'] ?? null;
    $isAll = $_GET['isAll'] ?? null;
    $name = $_GET['name'] ?? null;

    // バリデーション: 空チェック
    if (empty($uid)) {
        echo json_encode([
            "error" => "uidは必須です",
            "uid" => $uid
        ]);
        exit;
    }
    if ($isAll === "true") {
        $sql = "SELECT * FROM usersima WHERE name LIKE :name ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name' => '%' . $name . '%'  // 部分一致検索（曖昧検索）
        ]);
    } else {
        $sql = "SELECT * FROM usersima WHERE uid LIKE :uid AND name LIKE :name ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $uid,
            ':name' => '%' . $name . '%'  // 部分一致検索（曖昧検索）
        ]);
    }

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode([
        "success" => true,
        'result' => $result,
        "uid" => $uid
    ]);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
