<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETからid, nameを取得
    $id = $_GET['id'] ?? null;
    $transparent = $_GET['transparent'] ?? null;

    // バリデーション: 空チェック
//    if (empty($id) || empty($transparent)) {
//        echo json_encode([
//            "error" => "idとtransparentは必須です",
//            'id' => $id,
//            'transparent' => $transparent
//        ]);
//        exit;
//    }

    // SQL: userxyztile の指定した id の name を更新
    $sql = "UPDATE userxyztile SET transparent = :transparent WHERE id LIKE :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':transparent' => $transparent,
    ]);

    // 更新された行数を取得
    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "id" => $id, "name" => $transparent]);
    } else {
        echo json_encode([
            "error" => "指定されたIDのレコードが見つからないか、更新する必要がありません",
            "sql" => $sql,
            "id" => $id,
            "transparent" => $transparent
        ]);
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


