<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json");

// **リクエストボディを取得**
$inputJSON = file_get_contents("php://input");
$input = json_decode($inputJSON, true);

// **idToken を取得**
$idToken = $input['idToken'] ?? null;

// **デバッグ用: 受信したデータをログに出力**
file_put_contents("debug.log", "Received JSON: " . $inputJSON . PHP_EOL, FILE_APPEND);

// **トークンが送られていない場合のエラーメッセージ**
if (!$idToken) {
    http_response_code(400);
    echo json_encode([
        "error" => "idToken がありません",
        "received_body" => $inputJSON // デバッグ用に受信データを確認
    ]);
    exit;
}

// **Firebase API キーを設定**
$firebaseApiKey = "AIzaSyD0br7P-RNCERYEO2pfnVJsQjstd-GztQY";

// **Firebase の REST API にリクエスト**
$url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=$firebaseApiKey";

$data = json_encode(["idToken" => $idToken]);
$options = [
    "http" => [
        "header" => "Content-Type: application/json",
        "method" => "POST",
        "content" => $data
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

// **レスポンスのエラーチェック**
if ($result === FALSE) {
    http_response_code(500);
    echo json_encode(["error" => "Firebase API リクエストに失敗しました"]);
    exit;
}

// **レスポンスを解析**
$responseData = json_decode($result, true);

// **Firebase から UID を取得**
$uid = $responseData["users"][0]["localId"] ?? null;

// **UID が取得できなかった場合のエラーメッセージ**
if (!$uid) {
    http_response_code(403);
    echo json_encode([
        "error" => "Firebase から UID を取得できません",
        "firebase_response" => $responseData
    ]);
    exit;
}

// **成功レスポンス**
http_response_code(200);
echo json_encode(["message" => "認証成功", "uid" => $uid]);

?>

