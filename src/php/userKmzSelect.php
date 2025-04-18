<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETからuidを取得
    $uid = $_GET['uid'] ?? null;
    $isAll = $_GET['isAll'] ?? null;

    // バリデーション: 空チェック
    if (empty($uid)) {
        echo json_encode([
            "error" => "uidは必須です",
            "uid" => $uid
        ]);
        exit;
    }

    if ($isAll === "true") {
        $sql = "SELECT * FROM userkmz ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([]);
    } else {
        $sql = "SELECT * FROM userkmz WHERE uid LIKE :uid ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':uid' => $uid]);
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
