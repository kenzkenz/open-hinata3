<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからname, url, uidを取得
    $name = $_POST['name'] ?? null;
    $url = $_POST['url'] ?? null;
    $url2 = $_POST['url2'] ?? null;
    $url3 = $_POST['url3'] ?? null;
    $uid = $_POST['uid'] ?? null;
    $bbox = $_POST['bbox'] ?? null;

    // バリデーション: 空チェック
    if (empty($name) || empty($url) || empty($uid) || empty($url3) || empty($url2) || empty($bbox)) {
        echo json_encode(["error" => "name, url, url2, url3, uid, bboxは必須です"]);
        exit;
    }

    // SQL: userdbに新規挿入
    $sql = "INSERT INTO userxyztile (name, url, url2,url3,uid,bbox) VALUES (:name, :url, :url2, :url3, :uid, :bbox)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':url' => $url,
        ':url2' => $url2,
        ':url3' => $url3,
        ':uid' => $uid,
        ':bbox' => $bbox
    ]);

    // 挿入された行のIDを取得
    $lastId = $pdo->lastInsertId();

    // 成功した場合のレスポンス
    echo json_encode(["id" => $lastId, "name" => $name, "url" => $url, "url2" => $url2, "url3" => $url3, "uid" => $uid, "bbox" => $bbox]);

} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


