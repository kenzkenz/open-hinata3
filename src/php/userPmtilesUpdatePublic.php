<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETからid, nameを取得
    $id = $_GET['id'] ?? null;
    $public = $_GET['public'] ?? null;

    // バリデーション: 空チェック
//    if (empty($id) || empty($transparent)) {
//        echo json_encode([
//            "error" => "idとtransparentは必須です",
//            'id' => $id,
//            'transparent' => $transparent
//        ]);
//        exit;
//    }

    // SQL: userpmtiles の指定した id の public を更新
    $sql = "UPDATE userpmtiles SET public = :public WHERE id LIKE :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':public' => $public,
    ]);

    // 更新された行数を取得
    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "id" => $id, "public" => $public]);
    } else {
        echo json_encode([
            "error" => "指定されたIDのレコードが見つからないか、更新する必要がありません",
            "sql" => $sql,
            "id" => $id,
            "public" => $public
        ]);
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


