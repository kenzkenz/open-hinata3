<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからid, nameを取得
    $id = $_GET['id'] ?? null;
    $name = $_GET['name'] ?? null;

    // バリデーション: 空チェック
    if (empty($id) || empty($name)) {
        echo json_encode(["error" => "idとnameは必須です"]);
        exit;
    }

    // SQL: userxyztile の指定した id の name を更新
    $sql = "UPDATE usersima SET name = :name WHERE id LIKE :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $name,
    ]);

    // 更新された行数を取得
    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "id" => $id, "name" => $name]);
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


