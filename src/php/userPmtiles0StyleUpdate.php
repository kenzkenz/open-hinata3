<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // POSTからid, nameを取得
    $id = $_GET['id'] ?? null;
    $label = $_GET['label'] ?? null;
    $style = $_GET['style'] ?? null;

    // バリデーション: 空チェック
    if (empty($id) || empty($style)) {
        echo json_encode(["error" => "idとnameは必須です"]);
        exit;
    }

    $sql = "UPDATE userpmtiles0 SET label = :label, style = :style WHERE id LIKE :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':label' => $label,
        ':style' => $style,
    ]);

    // 更新された行数を取得
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "success" => true,
            "id" => $id,
            "style" => $style,
            "label" => $label,
        ]);
    } else {
        echo json_encode([
            "error" => "指定されたIDのレコードが見つからないか、更新する必要がありません",
            "sql" => $sql,
            "id" => $id,
            "style" => $style
        ]);
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
?>


