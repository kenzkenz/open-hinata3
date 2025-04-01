<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    // GETからuidを取得
    $color = $_GET['color'] ?? null;

    // バリデーション: 空チェック
    if (empty($color)) {
        echo json_encode([
            "error" => "colorは必須です",
            "uid" => $color
        ]);
        exit;
    }

    if ($color === 'blue') {
        $public = 1;
    } elseif ($color === 'gray') {
        $public = 3;
    }


    $sql = "SELECT * FROM userpmtiles WHERE public LIKE :public ORDER BY citycode DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':public' => $public]);


    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode([
        "success" => true,
        'result' => $result,
        "uid" => $uid
    ]);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
