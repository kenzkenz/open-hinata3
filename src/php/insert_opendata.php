<?php

// CORS対応ヘッダー
header("Access-Control-Allow-Origin: *"); // ローカルテスト用。運用環境では具体的なオリジンを指定
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "pwd.php";
header('Content-Type: application/json');

try {
    // JSON受信
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!is_array($data)) {
        throw new Exception("不正なデータ形式");
    }

    // テーブルを空にする
    $pdo->exec("TRUNCATE TABLE opendata");

    // SQL準備（citycodeとcitynameを正しく対応）
    $sql = "INSERT INTO opendata (prefname, prefcode, citycode, cityname, chiban, position, url, page)
            VALUES (:prefname, :prefcode, :citycode, :cityname, :chiban, :position, :url, :page)";
    $stmt = $pdo->prepare($sql);

    foreach ($data as $row) {
        $stmt->execute([
            ':prefname' => $row['prefname'],
            ':prefcode' => $row['prefcode'],
            ':citycode' => $row['code'],    // 'code'を'citycode'にマッピング
            ':cityname' => $row['name'],    // 'name'を'cityname'にマッピング
            ':chiban' => json_encode($row['chiban'], JSON_UNESCAPED_UNICODE),
            ':position' => json_encode($row['position']),
            ':url' => $row['url'],
            ':page' => $row['page']
        ]);
    }

    echo json_encode(['success' => true, 'message' => 'データ挿入完了']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
//
//// CORS 対応ヘッダー
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//header("Access-Control-Max-Age: 86400"); // 24時間キャッシュ
//
//// プリフライトリクエスト対応
//if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//    http_response_code(200);
//    exit();
//}
//
//require_once "pwd.php";
//header('Content-Type: application/json');
//
//try {
//    // JSON受信
//    $json = file_get_contents('php://input');
//    $data = json_decode($json, true); // 配列として取得
//
//    if (!is_array($data)) {
//        throw new Exception("不正なデータ形式");
//    }
//
//    // ✅ まず最初にテーブルを空にする（高速・安全）
//    $pdo->exec("TRUNCATE TABLE opendata");
//
//    $sql = "INSERT INTO opendata (prefname, prefcode, citycode, cityname, name, chiban, position, url, page)
//            VALUES (:prefname, :prefcode, :code, :name, :name, :chiban, :position, :url, :page)";
//    $stmt = $pdo->prepare($sql);
//
//    foreach ($data as $row) {
//        $stmt->execute([
//            ':prefname' => $row['prefname'],
//            ':prefcode' => $row['prefcode'],
//            ':code' => $row['code'],
//            ':name' => $row['name'],
//            ':chiban' => json_encode($row['chiban'], JSON_UNESCAPED_UNICODE),
//            ':position' => json_encode($row['position']),
//            ':url' => $row['url'],
//            ':page' => $row['page']
//        ]);
//    }
//
//    echo json_encode(['success' => true, 'message' => 'データ挿入完了']);
//} catch (Exception $e) {
//    http_response_code(500);
//    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
//}
//
