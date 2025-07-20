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
        $sql = "SELECT * FROM userpmtiles ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([]);
    } else {
        $sql = "SELECT * FROM userpmtiles WHERE uid = :uid ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':uid' => $uid]);
    }

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // url カラムのドメインを置き換え
    foreach ($result as &$row) {
        if (isset($row['url'])) {
            $row['url'] = str_replace(
                'kenzkenz.duckdns.org',
                'kenzkenz.net',
                $row['url']
            );
        }
    }
    unset($row); // 参照をクリア

    // 結果をJSONで返す
    echo json_encode($result);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
