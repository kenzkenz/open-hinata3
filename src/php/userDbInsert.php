<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからname, url, uidを取得
    $name = $_POST['name'] ?? null;
    $url = $_POST['url'] ?? null;
    $uid = $_POST['uid'] ?? null;

    // バリデーション: 空チェック
    if (empty($name) || empty($url) || empty($uid)) {
        echo json_encode(["error" => "name, url, uidは必須です"]);
        exit;
    }

    // SQL: userdbに新規挿入
    $sql = "INSERT INTO userdb (name, url, uid) VALUES (:name, :url, :uid)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':url' => $url,
        ':uid' => $uid
    ]);

    // 成功した場合のレスポンス
    echo json_encode(["name" => $name, "url" => $url, "uid" => $uid]);

} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>

