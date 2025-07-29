<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {
    $uid = $_POST['uid'] ?? null;
    $nickname = $_POST['nickname'] ?? null;
    $starturl = $_POST['starturl'] ?? null;

    if (empty($uid)) {
        echo json_encode(["error" => "uid は必須です"]);
        exit;
    }

    // すでにuidが存在するかチェック
    $checkSql = "SELECT COUNT(*) FROM userconfig WHERE uid = :uid";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([':uid' => $uid]);
    $exists = $checkStmt->fetchColumn() > 0;

    if ($exists) {
        // 存在する場合はUPDATE
        $updateSql = "UPDATE userconfig SET nickname = :nickname, starturl = :starturl WHERE uid = :uid";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            ':nickname' => $nickname,
            ':starturl' => $starturl,
            ':uid' => $uid,
        ]);
        $message = "更新完了";
    } else {
        // 存在しない場合はINSERT
        $insertSql = "INSERT INTO userconfig (uid, nickname, starturl) VALUES (:uid, :nickname, :starturl)";
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            ':uid' => $uid,
            ':nickname' => $nickname,
            ':starturl' => $starturl,
        ]);
        $message = "新規登録完了";
    }

    echo json_encode([
        "status" => "success",
        "message" => $message,
        "uid" => $uid,
        "nickname" => $nickname,
        "starturl" => $starturl
    ]);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
