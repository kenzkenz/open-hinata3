<?php

header('Content-Type: application/json; charset=utf-8');

require_once "pwd.php";  // ここで $pdo が定義されている前提
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

try {
    $sql = "SELECT * FROM appconfig WHERE id = 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'row' => $row
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'db_error',
        'detail' => $e->getMessage()
    ]);
}