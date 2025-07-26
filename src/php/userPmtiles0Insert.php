<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    $name = $_POST['name'] ?? null;
    $url = $_POST['url'] ?? null;
    $url2 = $_POST['url2'] ?? null;
    $label = $_POST['label'] ?? null;
    $uid = $_POST['uid'] ?? null;
    $bbox = $_POST['bbox'] ?? null;
    $length = $_POST['length'] ?? null;
    $nickname = $_POST['nickname'] ?? null;
    $propnames = $_POST['propnames'] ?? null;

//    // バリデーション: 空チェック
//    if (empty($name) || empty($url) || empty($uid) || empty($chiban) || empty($url2) || empty($bbox) || empty($length) || empty($kaiji2)) {
//        echo json_encode(["error" => "name, url, url2, uid, chiban, bbox, lengthは必須です"]);
//        exit;
//    }

    // SQL: userdbに新規挿入
    $sql = "INSERT INTO userpmtiles0 (name, url, url2, label, uid, bbox, length, nickname, propnames) VALUES (:name, :url, :url2, :label, :uid, :bbox, :length, :nickname, :propnames)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':url' => $url,
        ':url2' => $url2,
        ':label' => $label,
        ':uid' => $uid,
        ':bbox' => $bbox,
        ':length' => $length,
        ':nickname' => $nickname,
        ':propnames' => $propnames,
    ]);

    // 挿入された行のIDを取得
    $lastId = $pdo->lastInsertId();

    // 成功した場合のレスポンス
    echo json_encode(["id" => $lastId, "propnames" => $propnames, "name" => $name, "url" => $url, "uid" => $uid, "bbox" => $bbox, "length" => $length]);

} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


