<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからuidを取得
    $uid = $_GET['uid'] ?? null;
    $isAll = $_GET['isAll'] ?? null;

    // バリデーション: 空チェック
    if (empty($uid)) {
        echo json_encode(["error" => "uidは必須です"]);
        exit;
    }

    if ($isAll === "true") {
        $sql = "SELECT * FROM usertile ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([]);
    } else {
        $sql = "SELECT * FROM usertile WHERE uid = :uid ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':uid' => $uid]);
    }

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode($result);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
