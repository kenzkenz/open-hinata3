<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからname, url, uidを取得
    $name = $_POST['name'] ?? null;
    $url = $_POST['url'] ?? null;
    $url2 = $_POST['url2'] ?? null;
    $uid = $_POST['uid'] ?? null;

    // バリデーション: 空チェック
    if (empty($name) || empty($url) || empty($url2) || empty($uid)) {
        echo json_encode(["error" => "name, url, url2, uid, bboxは必須です"]);
        exit;
    }

    // SQL: userdbに新規挿入
    $sql = "INSERT INTO userkmz (name, url, url2, uid) VALUES (:name, :url, :url2, :uid)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':url' => $url,
        ':url2' => $url2,
        ':uid' => $uid,
    ]);

    // 挿入された行のIDを取得
    $lastId = $pdo->lastInsertId();

    // 成功した場合のレスポンス
    echo json_encode(["lastId" => $lastId, "id" => $lastId, "name" => $name, "url" => $url, "url2" => $url2, "uid" => $uid]);

} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


