<?php
// === 固定の公開WMSエンドポイント（Capabilitiesの OnlineResource をそのまま使う） ===
const WMS_BASE = 'https://geo-gifu.org/cgi-bin/mapserv?map=/var/www/html/gifu_geology/gifugeo_detail_postgis.map&';

// 許可するクエリキー（最低限）
$ALLOW_KEYS = [
    'SERVICE','REQUEST','VERSION','FORMAT','TRANSPARENT','STYLES',
    'LAYERS','TILED','CRS','SRS','WIDTH','HEIGHT','BBOX','EXCEPTIONS'
];

// 1) ユーザーから来たクエリのうち、許可キーだけ拾う（= 任意の外部URLへ飛ばさない）
$params = [];
foreach ($_GET as $k => $v) {
    $uk = strtoupper($k);
    if (in_array($uk, $ALLOW_KEYS, true)) {
        // 値を素直に文字列化（BBOXなど）
        $params[$uk] = (string)$v;
    }
}

// 2) 必須の基本バリデーション（最低限）
if (empty($params['SERVICE']))  $params['SERVICE']  = 'WMS';
if (empty($params['REQUEST']))  $params['REQUEST']  = 'GetMap';
if (empty($params['VERSION']))  $params['VERSION']  = '1.3.0';
if (empty($params['FORMAT']))   $params['FORMAT']   = 'image/png';
if (empty($params['TRANSPARENT'])) $params['TRANSPARENT'] = 'TRUE';
if (empty($params['WIDTH']))    $params['WIDTH']    = '256';
if (empty($params['HEIGHT']))   $params['HEIGHT']   = '256';
if (empty($params['EXCEPTIONS'])) $params['EXCEPTIONS'] = 'INIMAGE';

// 3) 軽い防御（リクエスト爆増やHTML混入を回避）
if (!isset($params['LAYERS'])) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'missing LAYERS';
    exit;
}
if (!isset($params['BBOX'])) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'missing BBOX';
    exit;
}

// 4) 上流URLを組み立て（固定BASEに対して安全なキーのみ連結）
$qs = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
$target = WMS_BASE . $qs;

// 5) 取得（cURL）
$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_USERAGENT => 'OH3-WMS-Proxy/1.0',
    CURLOPT_HTTPHEADER => ['Accept: image/png,image/*;q=0.8,*/*;q=0.5'],
]);
$bin  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502;
$ct   = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
curl_close($ch);

// 6) 応答（CORSを自サイトで許可）
http_response_code($code);
header('Access-Control-Allow-Origin: *');
header('Content-Type: '.$ct);
header('Cache-Control: public, max-age=600'); // タイルは短期キャッシュ
echo $bin;
