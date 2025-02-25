<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからname, url, uidを取得
    $name = $_POST['name'] ?? null;
    $url = $_POST['url'] ?? null;
    $url2 = $_POST['url2'] ?? null;
    $uid = $_POST['uid'] ?? null;
    $chiban = $_POST['chiban'] ?? null;

    // バリデーション: 空チェック
    if (empty($name) || empty($url) || empty($uid) || empty($chiban) || empty($url2)) {
        echo json_encode(["error" => "name, url, url2, uid, chibanは必須です"]);
        exit;
    }

    // SQL: userdbに新規挿入
    $sql = "INSERT INTO userpmtiles (name, url, url2, uid, chiban) VALUES (:name, :url, :url2, :uid, :chiban)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':url' => $url,
        ':url2' => $url2,
        ':uid' => $uid,
        ':chiban' => $chiban
    ]);

    // 挿入された行のIDを取得
    $lastId = $pdo->lastInsertId();

    // 成功した場合のレスポンス
    echo json_encode(["id" => $lastId, "name" => $name, "url" => $url, "uid" => $uid, "chiban" => $chiban]);

} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


