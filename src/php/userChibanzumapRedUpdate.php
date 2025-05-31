<?php

require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json; charset=UTF-8");

try {
    // JSONリクエストボディを読み取り
    $input = json_decode(file_get_contents('php://input'), true);

    // デバッグ: 受信データをログに記録
    error_log("受信データ: " . print_r($input, true));

    // 入力データの取得
    $citycode = $input['citycode'] ?? null;
    $prefname = $input['prefname'] ?? null;
    $cityname = $input['cityname'] ?? null;
    $public = $input['public'] ?? null;
    $uid = $input['uid'] ?? null;
    $nickname = $input['nickname'] ?? null;
    // 入力検証
    if (empty($citycode) || !is_numeric($citycode)) {
        echo json_encode(["error" => "無効な市コード"]);
        exit;
    }
    if (empty($prefname) || empty($cityname)) {
        echo json_encode(["error" => "都道府県名または市区町村名が未入力"]);
        exit;
    }

    // トランザクション開始
    $pdo->beginTransaction();

    // citycodeの存在確認
    $sql = "SELECT COUNT(*) FROM chibanzumapred WHERE citycode = :citycode";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':citycode' => $citycode]);
    $count = $stmt->fetchColumn();

    if ($count > 0) {
        // citycodeが存在する場合：更新
        $sql = "
            UPDATE chibanzumapred
            SET prefname = :prefname,
                cityname = :cityname,
                public = :public,
                uid = :uid,
                nickname = :nickname,
                last_modified_date = NOW()
            WHERE citycode = :citycode
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':citycode' => $citycode,
            ':prefname' => $prefname,
            ':cityname' => $cityname,
            ':public' => $public,
            ':uid' => $uid,
            ':nickname' => $nickname,
        ]);
        $message = "既存のデータ（citycode:" . $citycode . "）を登録しました";
    } else {
        // citycodeが存在しない場合：挿入
        $sql = "INSERT INTO chibanzumapred (citycode, prefname, cityname, public, uid, nickname, last_modified_date) VALUES (:citycode, :prefname, :cityname, :public, :uid, :nickname, :last_modified_date)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':citycode' => $citycode,
            ':prefname' => $prefname,
            ':cityname' => $cityname,
            ':public' => $public,
            ':uid' => $uid,
            ':nickname' => $nickname,
            ':last_modified_date' => date('Y-m-d H:i:s'), // PHPで現在日時をセット
        ]);
        $message = "新しいデータ（citycode:" . $citycode . "）を登録しました";
    }

    // トランザクションをコミット
    $pdo->commit();

    // 成功レスポンス
    echo json_encode(["success" => true, "message" => $message]);

} catch (PDOException $e) {
    // トランザクションをロールバック
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("データベースエラー: " . $e->getMessage()); // ログに記録
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
} catch (Exception $e) {
    // その他のエラー
    error_log("一般エラー: " . $e->getMessage());
    echo json_encode(["error" => "エラー: " . $e->getMessage()]);
}
