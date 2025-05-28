<?php

require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json; charset=utf-8");

// エラーハンドリングと結果を格納する配列
$result = ['success' => false, 'message' => '', 'data_count' => 0, 'sample_data' => null, 'userpmtiles_count' => 0];

try {
    // PDOの属性設定
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // トランザクション開始
    $pdo->beginTransaction();

    // 1. chibanzumapテーブルをトランケート
    $pdo->exec('TRUNCATE TABLE chibanzumap');

    // 7. chibanzumapredから全データを取得（新規追加）
    $selectChibanzumapredStmt = $pdo->query('SELECT citycode, prefname, cityname, public FROM chibanzumapred');
    $chibanzumapred = $selectChibanzumapredStmt->fetchAll();

    // chibanzumapredのデータ件数を記録
    $result['chibanzumapred_count'] = count($chibanzumapred);

    // chibanzumapredのデータ検証
    if (!empty($chibanzumapred)) {
        foreach ($chibanzumapred as $index => $row) {
            if (empty($row['citycode']) || is_null($row['citycode'])) {
                throw new Exception("chibanzumapred: citycodeが空またはNULLです（行: " . ($index + 1) . "）");
            }
        }

        // 8. chibanzumapredをバッチインサート
        $values = [];
        $placeholders = [];
        foreach ($chibanzumapred as $row) {
            $placeholders[] = '(?, ?, ?, ?)';
            $values[] = $row['citycode'];
            $values[] = $row['prefname'] ?? '';
            $values[] = $row['cityname'] ?? '';
            $values[] = $row['public'] ?? '';
        }

        $sql = 'INSERT INTO chibanzumap (citycode, prefname, cityname, public) VALUES ' . implode(', ', $placeholders);
        $insertStmt = $pdo->prepare($sql);
        $insertStmt->execute($values);
    } else {
        $result['message'] .= 'chibanzumapredデータがありません。';
    }

    // 2. opendataから全データを取得
    $selectStmt = $pdo->query('SELECT citycode, prefname, cityname, public FROM opendata');
    $opendata = $selectStmt->fetchAll();

    // データ件数を記録
    $result['data_count'] = count($opendata);

    // データが空の場合
    if (empty($opendata)) {
        throw new Exception('opendataテーブルにデータがありません。');
    }

    // サンプルデータを記録（デバッグ用、最初の5件）
    $result['sample_data'] = array_slice($opendata, 0, 5);

    // 3. データ検証（citycodeのNULL/空文字チェック）
    foreach ($opendata as $index => $row) {
        if (empty($row['citycode']) || is_null($row['citycode'])) {
            throw new Exception("opendata: citycodeが空またはNULLです（行: " . ($index + 1) . "）");
        }
    }

    // 4. opendataをバッチインサート
    $values = [];
    $placeholders = [];
    foreach ($opendata as $row) {
        $placeholders[] = '(?, ?, ?, ?)';
        $values[] = $row['citycode'];
        $values[] = $row['prefname'] ?? '';
        $values[] = $row['cityname'] ?? '';
//        $values[] = $row['public'] ?? '';
        $values[] = -1;
    }

    $sql = 'INSERT INTO chibanzumap (citycode, prefname, cityname, public) VALUES ' . implode(', ', $placeholders);
    $insertStmt = $pdo->prepare($sql);
    $insertStmt->execute($values);

    // 5. userpmtilesからデータを取得（citycodeでグループ化、publicが0以外の最小、dateが最新、citycodeがNULL/空でない）
//    $selectUserpmtilesStmt = $pdo->query('
//        SELECT citycode, prefname, cityname, public
//        FROM userpmtiles
//        WHERE (citycode, public, date) IN (
//            SELECT citycode, MIN(public), MAX(date)
//            FROM userpmtiles
//            WHERE citycode IS NOT NULL AND citycode != \'\' AND public != 0
//            GROUP BY citycode
//        )'
//    );
//    $selectUserpmtilesStmt = $pdo->query('
//        SELECT t1.citycode, t1.prefname, t1.cityname, t1.public, t1.date
//        FROM userpmtiles t1
//        JOIN (
//            SELECT citycode, MIN(public) AS min_public, MAX(date) AS max_date
//            FROM userpmtiles
//            WHERE citycode IS NOT NULL
//              AND citycode != \'\'
//              AND public != 0
//            GROUP BY citycode
//        ) t2
//        ON t1.citycode = t2.citycode
//         AND t1.public = t2.min_public
//         AND t1.date = t2.max_date
//        WHERE t1.citycode IS NOT NULL
//          AND t1.citycode != \'\'
//          AND t1.public != 0
//    ');
    $selectUserpmtilesStmt = $pdo->query('
        SELECT t1.citycode, t1.prefname, t1.cityname, t1.public, t1.date
        FROM userpmtiles t1
        JOIN (
            SELECT
                citycode,
                MIN(public) AS min_public
            FROM userpmtiles
            WHERE public IN (-1, 1, 3)
              AND citycode IS NOT NULL
            GROUP BY citycode
        ) t2
          ON t1.citycode = t2.citycode
         AND t1.public = t2.min_public
        JOIN (
            SELECT
                citycode,
                public,
                MAX(date) AS max_date
            FROM userpmtiles
            WHERE public IN (-1, 1, 3)
              AND citycode IS NOT NULL
            GROUP BY citycode, public
        ) t3
          ON t1.citycode = t3.citycode
         AND t1.public = t3.public
         AND t1.date = t3.max_date
        WHERE t1.public IN (-1, 1, 3)
          AND t1.citycode IS NOT NULL
    ');
    $userpmtiles = $selectUserpmtilesStmt->fetchAll();

    // userpmtilesのデータ件数を記録
    $result['userpmtiles_count'] = count($userpmtiles);

    // userpmtilesのデータ検証
    if (!empty($userpmtiles)) {
        foreach ($userpmtiles as $index => $row) {
            if (empty($row['citycode']) || is_null($row['citycode'])) {
                throw new Exception("userpmtiles: citycodeが空またはNULLです（行: " . ($index + 1) . "）");
            }
        }

        // 6. userpmtilesをバッチインサート（上書き対応）
        $values = [];
        $placeholders = [];
        foreach ($userpmtiles as $row) {
            $placeholders[] = '(?, ?, ?, ?)';
            $values[] = $row['citycode'];
            $values[] = $row['prefname'] ?? '';
            $values[] = $row['cityname'] ?? '';
            $values[] = $row['public'] ?? '';
        }

        $sql = 'INSERT INTO chibanzumap (citycode, prefname, cityname, public) VALUES ' . implode(', ', $placeholders);
        $insertStmt = $pdo->prepare($sql);
        $insertStmt->execute($values);
    } else {
        $result['message'] .= 'userpmtilesデータがありません。';
    }

    // トランザクションコミット
    $pdo->commit();

    $result['success'] = true;
    $result['message'] = 'データが正常に処理されました。挿入レコード数: ' . ($result['data_count'] + $result['userpmtiles_count']) . ' (opendata: ' . $result['data_count'] . ', userpmtiles: ' . $result['userpmtiles_count'] . ')';

} catch (PDOException $e) {
    // エラー時にロールバック
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $result['message'] = 'データベースエラー: ' . $e->getMessage() . ' (SQLState: ' . $e->getCode() . ')';
} catch (Exception $e) {
    // その他のエラー
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $result['message'] = 'エラー: ' . $e->getMessage();
}

// エラーログに詳細を記録
if (!$result['success']) {
    error_log("インサート失敗: " . $result['message'] . "\nopendata件数: " . $result['data_count'] . "\nuserpmtiles件数: " . $result['userpmtiles_count'] . "\nサンプルデータ: " . print_r($result['sample_data'], true));
} else {
    error_log("インサート成功: 挿入レコード数: " . ($result['data_count'] + $result['userpmtiles_count']) . "\nopendata件数: " . $result['data_count'] . "\nuserpmtiles件数: " . $result['userpmtiles_count']);
}

// 結果をJSONで出力
echo json_encode($result, JSON_UNESCAPED_UNICODE);
