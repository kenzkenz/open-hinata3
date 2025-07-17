<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETからidを取得
    $id = $_GET['id'] ?? null;

    // バリデーション: 空チェック
    if (empty($id)) {
        echo json_encode(["error" => "idは必須です"]);
        exit;
    }

    // SQL: 指定されたidのデータを削除
    $sql = "DELETE FROM userpmtiles0 WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);

    // 削除された行数を取得
    $deletedRows = $stmt->rowCount();

    if ($deletedRows > 0) {
        echo json_encode(["success" => "データが削除されました", "deleted_id" => $id]);
    } else {
        echo json_encode(["error" => "該当するデータが見つかりません"]);
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
