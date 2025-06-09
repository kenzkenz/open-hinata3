<?php

require_once "pwd.php"; // DB接続情報

header("Content-Type: application/json; charset=utf-8");

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = <<<SQL
SELECT 
    c.color, 
    c.setsumei, 
    m.citycode,
    m.prefname,
    m.cityname
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
WHERE m.public <> 0
ORDER BY m.public, m.citycode
SQL;

    $stmt = $pdo->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($data, JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
