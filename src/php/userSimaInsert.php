<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからname, url, uidを取得
    $name = $_POST['name'] ?? null;
    $url = $_POST['url'] ?? null;
    $url2 = $_POST['url2'] ?? null;
    $uid = $_POST['uid'] ?? null;
    $simatext = $_POST['simatext'] ?? null;
    $zahyokei = $_POST['zahyokei'] ?? null;

    // バリデーション: 空チェック
    if (empty($name) || empty($url) || empty($url2) || empty($uid) || empty($simatext) || empty($zahyokei)) {
        echo json_encode(["error" => "name, url, url2, uid, simatext, zahyokeiは必須です"]);
        exit;
    }

    // SQL: userdbに新規挿入
    $sql = "INSERT INTO usersima (name, url, url2, uid, simatext, zahyokei) VALUES (:name, :url, :url2, :uid, :simatext, :zahyokei)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':url' => $url,
        ':url2' => $url2,
        ':uid' => $uid,
        ':simatext' => $simatext,
        ':zahyokei' => $zahyokei,
    ]);

    // 挿入された行のIDを取得
    $lastId = $pdo->lastInsertId();

    // 成功した場合のレスポンス
    echo json_encode(["lastId" => $lastId, "id" => $lastId, "name" => $name, "url" => $url, "url2" => $url2, "uid" => $uid, "zahyokei" => $zahyokei]);

} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


