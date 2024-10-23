<?php
// エラーレポートを有効化
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORSヘッダーの設定
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// OPTIONSリクエストへの対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("HTTP/1.1 204 No Content");
    exit;
}

// リクエストされたURLを取得し、エンコードされているか確認
$targetUrl = isset($_GET['url']) ? filter_var($_GET['url'], FILTER_VALIDATE_URL) : null;

// URLが無効または指定されていない場合はエラーメッセージを返す
if (!$targetUrl) {
    header('HTTP/1.1 400 Bad Request');
    echo 'A valid URL is required.';
    exit;
}

// HTTPをHTTPSに変換
if (strpos($targetUrl, 'http://') === 0) {
    $targetUrl = preg_replace('/^http:/i', 'https:', $targetUrl);
}

// cURLの初期化
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 10); // 最大リダイレクト回数
curl_setopt($ch, CURLOPT_AUTOREFERER, true); // リダイレクト時にRefererを自動設定
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // HTTPS対応

// User-Agent を偽装して設定
$curlHeaders = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept: */*',
    'Accept-Language: en-US,en;q=0.9'
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $curlHeaders);

// リクエストを実行
$response = curl_exec($ch);
$info = curl_getinfo($ch);
$httpCode = $info['http_code'];

// cURLエラーのチェック
if (curl_errno($ch)) {
    header('HTTP/1.1 500 Internal Server Error');
    echo 'cURL Error: ' . curl_error($ch);
    curl_close($ch);
    exit;
}

// HTTPステータスコードが404の場合
if ($httpCode == 404) {
    header('HTTP/1.1 404 Not Found');
    echo 'The requested URL was not found on the target server.';
    exit;
}

// cURLを閉じる
curl_close($ch);

// レスポンスの分割
$headerSize = $info['header_size'];
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

// クライアントにレスポンスヘッダーを送信
$headerLines = explode("\r\n", $responseHeaders);
foreach ($headerLines as $header) {
    if (stripos($header, 'Transfer-Encoding') === false && stripos($header, 'Content-Length') === false) {
        header($header);
    }
}

// CORSヘッダーを再度追加
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// クライアントにレスポンスボディを送信
http_response_code($httpCode);
echo $responseBody;
?>
