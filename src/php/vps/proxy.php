<?php
// CORS ヘッダーを追加
header("Access-Control-Allow-Origin: *");  // すべてのオリジンを許可
header("Access-Control-Allow-Methods: GET, OPTIONS"); // 許可するHTTPメソッド
header("Access-Control-Allow-Headers: Ocp-Apim-Subscription-Key");

// OPTIONSリクエスト（プリフライト）の処理
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit();
}

// APIキーの設定
$API_KEY = "54463d21c79e48b9a9ba992263f2c4db";

// APIのエンドポイント名を取得 (例: XKT004, XIT001 など)
$api = isset($_GET['api']) ? preg_replace("/[^A-Z0-9_]/", "", $_GET['api']) : "XKT004"; // セキュリティ対策: 余計な文字を除去

// 国土数値情報APIのベースURL
$API_BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external/";

// クエリパラメータの取得
$z = isset($_GET['z']) ? intval($_GET['z']) : 12;
$x = isset($_GET['x']) ? intval($_GET['x']) : 3600;
$y = isset($_GET['y']) ? intval($_GET['y']) : 1600;

// APIリクエストURLの作成
$request_url = "{$API_BASE_URL}{$api}?response_format=pbf&z={$z}&x={$x}&y={$y}";

// cURLを使用してAPIリクエストを送信
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $request_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Ocp-Apim-Subscription-Key: $API_KEY"
]);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// エラーハンドリング
if ($http_code !== 200) {
    header("HTTP/1.1 $http_code Error");
    exit("Error fetching tile: $http_code");
}

// 正常な場合はタイルデータを返す
header("Content-Type: application/x-protobuf");
echo $response;
