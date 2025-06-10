<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    // 引数でSPAのリダイレクト先URLを受け取る
    $spaUrl = isset($_POST['spaUrl']) ? $_POST['spaUrl'] : '';
    if (!$spaUrl) {
        http_response_code(400);
        echo json_encode(['error' => 'spaUrl required']);
        exit;
    }

    // ランダムな8文字英数字でbasenameを作成
    $basename = substr(bin2hex(random_bytes(4)), 0, 8);

    $dir = __DIR__ . '/../uploads/x/';
    if (!is_dir($dir)) mkdir($dir, 0777, true);

    $imgPath = $dir . $basename . '.png';
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $imgPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'upload failed']);
        exit;
    }

    $imgUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.png";
    $htmlPath = $dir . $basename . '.html';
    $htmlUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.html";

    // OGP＋0秒SPAリダイレクトHTMLを生成
    $ogpHtml = <<<EOT
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="OH3">
  <meta property="og:description" content="open-hinata3で表示した地図です">
  <meta property="og:image" content="$imgUrl">
  <meta property="og:type" content="website">
  <meta property="og:url" content="$htmlUrl">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="$imgUrl">
  <meta http-equiv="refresh" content="0;url=$spaUrl">
  <title>Open-hinata3 シェア</title>
</head>
<body>
  <p>自動的にアプリへ移動します...</p>
  <script>
   location.replace("$spaUrl");
  </script>
</body>
</html>
EOT;
    file_put_contents($htmlPath, $ogpHtml);
    // 1回アクセス（curlでもOK）
    file_get_contents($htmlUrl); // または
    exec("curl -s " . escapeshellarg($htmlUrl));
    echo json_encode(['shareUrl' => $htmlUrl]);
    exit;
}
http_response_code(400);
echo json_encode(['error' => 'invalid request']);
?>

