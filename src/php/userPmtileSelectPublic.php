<?php
require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json");

try {

//    $sql = "SELECT * FROM userpmtiles WHERE public = 1 ORDER BY prefcode, citycode, name";
//    $sql = "SELECT * FROM userpmtiles WHERE public IN (1, -1) ORDER BY prefcode, citycode, name";
    $sql = '
            SELECT t1.*
            FROM userpmtiles t1
            JOIN (
                SELECT
                    citycode,
                    CASE
                        WHEN SUM(public = -1) > 0 THEN -1
                        ELSE 1
                    END AS target_public
                FROM userpmtiles
                WHERE public IN (1, -1)
                GROUP BY citycode
            ) t2
              ON t1.citycode = t2.citycode AND t1.public = t2.target_public
            JOIN (
                SELECT citycode, public, MAX(date) AS max_date
                FROM userpmtiles
                WHERE public IN (1, -1)
                GROUP BY citycode, public
            ) t3
              ON t1.citycode = t3.citycode AND t1.public = t3.public AND t1.date = t3.max_date
            WHERE t1.public IN (1, -1)
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    // 結果を取得
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 結果をJSONで返す
    echo json_encode($result);
} catch (PDOException $e) {
    echo json_encode(["error" => "データベースエラー: " . $e->getMessage()]);
}
