<?php

// エラー表示を有効化
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS 設定（Vue からのリクエストを許可）
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

// OPTIONSリクエストを処理（CORS preflight request）
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// `verify_token.php` を呼び出して UID を取得
$inputJSON = file_get_contents("php://input");
$input = json_decode($inputJSON, true);

$ch = curl_init("https://kenzkenz.xsrv.jp/open-hinata3/php/verify_token.php");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["idToken" => $input['idToken'] ?? '']));
$verifyResponse = json_decode(curl_exec($ch), true);
curl_close($ch);

$uid = $verifyResponse["uid"] ?? null;

// UID の取得をチェック
if (!$uid) {
    http_response_code(403);
    echo json_encode(["message" => "認証に失敗しました", "error" => "UIDが NULL です"]);
    exit;
}

// ユーザー専用ディレクトリのパス
$userDir = __DIR__ . "/uploads/$uid";

// ディレクトリの作成処理
if (!file_exists($userDir)) {
    if (!mkdir($userDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(["message" => "ディレクトリ作成に失敗", "error" => error_get_last()]);
        exit;
    }
}

// 成功レスポンスを返す
http_response_code(200);
echo json_encode(["message" => "ディレクトリ作成成功", "path" => $userDir, "uid" => $uid]);
exit;

?>
