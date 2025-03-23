<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからid, nameを取得
    $id = $_GET['id'] ?? null;
    $name = $_GET['name'] ?? null;
    $prefcode = $_GET['prefcode'] ?? null;
    $citycode = $_GET['citycode'] ?? null;
    $prefname = $_GET['prefname'] ?? null;
    $cityname = $_GET['cityname'] ?? null;

    // バリデーション: 空チェック
    if (empty($id) || empty($name)) {
        echo json_encode(["error" => "idとnameは必須です"]);
        exit;
    }

    $sql = "UPDATE userpmtiles SET name = :name, prefcode = :prefcode, citycode = :citycode, prefname = :prefname, cityname = :cityname WHERE id LIKE :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $name,
        ':prefcode' => $prefcode,
        ':citycode' => $citycode,
        ':prefname' => $prefname,
        ':cityname' => $cityname,
    ]);


    // 更新された行数を取得
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "success" => true,
            "id" => $id,
            "name" => $name,
            "prefcode" => $prefcode,
            "citycode" => $citycode,
        ]);
    } else {
        echo json_encode([
            "error" => "指定されたIDのレコードが見つからないか、更新する必要がありません",
            "sql" => $sql,
            "id" => $id,
            "name" => $name
        ]);
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


