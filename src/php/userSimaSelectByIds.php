<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETパラメータからidsを配列で取得
    $ids = $_GET['ids'] ?? null;

    // バリデーション: 空チェックと配列チェック
    if (empty($ids) || !is_array($ids)) {
        echo json_encode(["error" => "idsは必須で、配列で指定してください"]);
        exit;
    }

    // プレースホルダーを作成
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    // SQL: 指定されたidsのデータを取得
    $sql = "SELECT * FROM usersima WHERE id IN ($placeholders)";
    $stmt = $pdo->prepare($sql);

    // 配列の値をバインドして実行
    $stmt->execute($ids);

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode($result);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
