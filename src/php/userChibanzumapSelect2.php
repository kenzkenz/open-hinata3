<?php

require_once "pwd.php"; // DB接続情報を含むファイル

header("Content-Type: application/json; charset=utf-8");

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 市区町村コードとpublicを取得
    $stmt = $pdo->query('
SELECT 
    c.color, 
    c.setsumei, 
    m.citycode,
    m.prefname,
    m.cityname,
    m.public,
    m.last_modified_date
FROM chibanzumap AS m
INNER JOIN chibanzumapcode AS c
  ON m.public = c.public
INNER JOIN (
  SELECT citycode, MIN(public) AS min_public
  FROM chibanzumap
  WHERE public <> 0
  GROUP BY citycode
) AS sub
  ON m.citycode = sub.citycode AND m.public = sub.min_public
INNER JOIN (
  SELECT citycode, public, MAX(last_modified_date) AS max_last_modified_date
  FROM chibanzumap
  WHERE public <> 0
  GROUP BY citycode, public
) AS latest
  ON m.citycode = latest.citycode
  AND m.public = latest.public
  AND m.last_modified_date = latest.max_last_modified_date
WHERE m.public <> 0
ORDER BY m.public, m.citycode;

');
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // JSON出力
    echo json_encode($data);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
