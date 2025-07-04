<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    $name = $_POST['name'] ?? null;
    $url = $_POST['url'] ?? null;
    $url2 = $_POST['url2'] ?? null;
    $uid = $_POST['uid'] ?? null;
    $chiban = $_POST['chiban'] ?? null;
    $bbox = $_POST['bbox'] ?? null;
    $length = $_POST['length'] ?? null;
    $prefcode = $_POST['prefcode'] ?? null;
    $citycode = $_POST['citycode'] ?? null;
    $prefname = $_POST['prefname'] ?? null;
    $cityname = $_POST['cityname'] ?? null;
    $public = $_POST['public'] ?? null;
    $kaiji2 = $_POST['kaiji2'] ?? null;
    $nickname = $_POST['nickname'] ?? null;

//    // バリデーション: 空チェック
//    if (empty($name) || empty($url) || empty($uid) || empty($chiban) || empty($url2) || empty($bbox) || empty($length) || empty($kaiji2)) {
//        echo json_encode(["error" => "name, url, url2, uid, chiban, bbox, lengthは必須です"]);
//        exit;
//    }

    // SQL: userdbに新規挿入
    $sql = "INSERT INTO userpmtiles (name, url, url2, uid, chiban, bbox, length, prefcode, citycode, prefname, cityname, public, kaiji2, nickname) VALUES (:name, :url, :url2, :uid, :chiban, :bbox, :length, :prefcode, :citycode, :prefname, :cityname, :public, :kaiji2, :nickname)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':url' => $url,
        ':url2' => $url2,
        ':uid' => $uid,
        ':chiban' => $chiban,
        ':bbox' => $bbox,
        ':length' => $length,
        ':prefcode' => $prefcode,
        ':citycode' => $citycode,
        ':prefname' => $prefname,
        ':cityname' => $cityname,
        ':public' => $public,
        ':kaiji2' => $kaiji2,
        ':nickname' => $nickname,
    ]);

    // 挿入された行のIDを取得
    $lastId = $pdo->lastInsertId();

    // 成功した場合のレスポンス
    echo json_encode(["id" => $lastId, "name" => $name, "url" => $url, "uid" => $uid, "chiban" => $chiban, "bbox" => $bbox, "length" => $length]);

} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


