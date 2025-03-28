<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETからid, nameを取得
    $id = $_GET['id'] ?? null;
    $public = $_GET['public'] ?? null;

    $sql = "UPDATE userpmtiles SET public = :public WHERE id LIKE :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':public' => $public,
    ]);

    $sql = "SELECT * FROM userpmtiles WHERE public IN (1, 3) ";
    $stmt1 = $pdo->prepare($sql);
    $stmt1->execute();

    $publics = $stmt1->fetchAll(PDO::FETCH_ASSOC);


    // 更新された行数を取得
//    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "id" => $id, "public" => $public, "publics" => $publics]);
//    } else {
//        echo json_encode([
//            "error" => "指定されたIDのレコードが見つからないか、更新する必要がありません",
//            "sql" => $sql,
//            "id" => $id,
//            "public" => $public
//        ]);
//    }
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


