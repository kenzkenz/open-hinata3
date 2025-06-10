<?php


header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $spaUrl = isset($_POST['spaUrl']) ? $_POST['spaUrl'] : '';
    if (!$spaUrl) {
        http_response_code(400);
        echo json_encode(['error' => 'spaUrl required']);
        exit;
    }

    // ランダム8文字
    $basename = substr(bin2hex(random_bytes(4)), 0, 8);

    $dir = __DIR__ . '/../uploads/x/';
    if (!is_dir($dir)) mkdir($dir, 0777, true);

    $imgPath = $dir . $basename . '.jpg'; // ★JPGに変更

    // 一旦テンポラリ保存
    $tmpPath = $dir . $basename . '_tmp.png';
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $tmpPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'upload failed']);
        exit;
    }

    // サムネ用 1200x630 にリサイズ
    list($src_w, $src_h) = getimagesize($tmpPath);
    $dst_w = 1200;
    $dst_h = 630;

    // PNG読込
    $src_img = imagecreatefrompng($tmpPath);
    $dst_img = imagecreatetruecolor($dst_w, $dst_h);

    // 白背景
    $bg = imagecolorallocate($dst_img, 255, 255, 255);
    imagefill($dst_img, 0, 0, $bg);

    // アスペクト比維持して中央配置
    $scale = min($dst_w / $src_w, $dst_h / $src_h);
    $resize_w = (int)($src_w * $scale);
    $resize_h = (int)($src_h * $scale);
    $dst_x = (int)(($dst_w - $resize_w) / 2);
    $dst_y = (int)(($dst_h - $resize_h) / 2);

    imagecopyresampled(
        $dst_img, $src_img,
        $dst_x, $dst_y, // dst
        0, 0,           // src
        $resize_w, $resize_h,
        $src_w, $src_h
    );

    imagedestroy($src_img);
    unlink($tmpPath); // テンポラリ削除

    // ------ JPG画質調整しつつ500KB以下にする ------
    $maxSize = 512000;
    $quality = 90;
    $minQuality = 30;

    do {
        imagejpeg($dst_img, $imgPath, $quality);
        clearstatcache(true, $imgPath);
        $size = file_exists($imgPath) ? filesize($imgPath) : 0;
        $quality -= 10; // 10ずつ下げる
    } while ($size > $maxSize && $quality >= $minQuality);

    imagedestroy($dst_img);

    // 書き込み待機（指定のループ部分）
    clearstatcache(true, $imgPath);
    $maxTry = 10;
    $try = 0;
    while ((!file_exists($imgPath) || filesize($imgPath) < 1024) && $try < $maxTry) {
        usleep(1500 * 1000); // 1.5秒
        clearstatcache(true, $imgPath);
        $try++;
    }

    // 最終サイズチェック
    if (!file_exists($imgPath) || filesize($imgPath) < 1024) {
        http_response_code(500);
        echo json_encode(['error' => 'image save failed or too small']);
        exit;
    }
    if (filesize($imgPath) > $maxSize) {
        http_response_code(500);
        echo json_encode(['error' => 'cannot reduce under 500KB']);
        exit;
    }

    $imgUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.jpg";
    $htmlPath = $dir . $basename . '.html';
    $htmlUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.html";

    // OGP+0秒SPAリダイレクトHTML
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
  <script>
   location.replace("$spaUrl");
  </script>
</body>
</html>
EOT;

    file_put_contents($htmlPath, $ogpHtml);
    @file_get_contents($imgUrl);

    echo json_encode(['shareUrl' => $htmlUrl]);
    exit;
}
http_response_code(400);
echo json_encode(['error' => 'invalid request']);



//
//header('Content-Type: application/json');
//
//if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
//    $spaUrl = isset($_POST['spaUrl']) ? $_POST['spaUrl'] : '';
//    if (!$spaUrl) {
//        http_response_code(400);
//        echo json_encode(['error' => 'spaUrl required']);
//        exit;
//    }
//
//    $basename = substr(bin2hex(random_bytes(4)), 0, 8);
//
//    $dir = __DIR__ . '/../uploads/x/';
//    if (!is_dir($dir)) mkdir($dir, 0777, true);
//
//    $imgPath = $dir . $basename . '.png';
//
//    // いったんテンポラリに保存
//    $tmpPath = $dir . $basename . '_tmp.png';
//    if (!move_uploaded_file($_FILES['file']['tmp_name'], $tmpPath)) {
//        http_response_code(500);
//        echo json_encode(['error' => 'upload failed']);
//        exit;
//    }
//
//    // サムネ用 1200x630 にリサイズ
//    list($src_w, $src_h, $src_type) = getimagesize($tmpPath);
//    $dst_w = 1200;
//    $dst_h = 630;
//
//    // PNG/JPEG判定
//    if ($src_type === IMAGETYPE_JPEG) {
//        $src_img = imagecreatefromjpeg($tmpPath);
//    } else {
//        // デフォルトPNG
//        $src_img = imagecreatefrompng($tmpPath);
//    }
//    $dst_img = imagecreatetruecolor($dst_w, $dst_h);
//
//    // 透明度処理（PNGのみ）
//    imagealphablending($dst_img, false);
//    imagesavealpha($dst_img, true);
//
//    // 縦横比を維持して中央に配置
//    $scale = min($dst_w / $src_w, $dst_h / $src_h);
//    $resize_w = (int)($src_w * $scale);
//    $resize_h = (int)($src_h * $scale);
//    $dst_x = (int)(($dst_w - $resize_w) / 2);
//    $dst_y = (int)(($dst_h - $resize_h) / 2);
//
//    // 余白は透明（または白背景にしたいなら fill）
//    $bg = imagecolorallocatealpha($dst_img, 255, 255, 255, 127); // 透明
//    imagefill($dst_img, 0, 0, $bg);
//
//    imagecopyresampled(
//        $dst_img, $src_img,
//        $dst_x, $dst_y, // dst
//        0, 0,           // src
//        $resize_w, $resize_h,
//        $src_w, $src_h
//    );
//
//    imagepng($dst_img, $imgPath);
//
//    imagedestroy($src_img);
//    imagedestroy($dst_img);
//    unlink($tmpPath); // テンポラリ削除
//
//    clearstatcache(true, $imgPath);
//    $maxTry = 10;
//    $try = 0;
//    while ((!file_exists($imgPath) || filesize($imgPath) < 1024) && $try < $maxTry) {
//        usleep(1500 * 1000); // 1.5秒
//        clearstatcache(true, $imgPath);
//        $try++;
//    }
//    if (!file_exists($imgPath) || filesize($imgPath) < 1024) {
//        http_response_code(500);
//        echo json_encode(['error' => 'image save failed or too small']);
//        exit;
//    }
//
//    $imgUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.png";
//    $htmlPath = $dir . $basename . '.html';
//    $htmlUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.html";
//
//    // OGP＋0秒SPAリダイレクトHTMLを生成
//    $ogpHtml = <<<EOT
//<!DOCTYPE html>
//<html lang="ja">
//<head>
//  <meta charset="UTF-8">
//  <meta property="og:title" content="OH3">
//  <meta property="og:description" content="open-hinata3で表示した地図です">
//  <meta property="og:image" content="$imgUrl">
//  <meta property="og:type" content="website">
//  <meta property="og:url" content="$htmlUrl">
//  <meta name="twitter:card" content="summary_large_image">
//  <meta name="twitter:image" content="$imgUrl">
//  <meta http-equiv="refresh" content="0;url=$spaUrl">
//  <title>Open-hinata3 シェア</title>
//</head>
//<body>
//  <script>
//   location.replace("$spaUrl");
//  </script>
//</body>
//</html>
//EOT;
//
//    file_put_contents($htmlPath, $ogpHtml);
//    @file_get_contents($imgUrl);
//
//    echo json_encode(['shareUrl' => $htmlUrl]);
//    exit;
//}
//http_response_code(400);
//echo json_encode(['error' => 'invalid request']);


//
//header('Content-Type: application/json');
//
//if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
//    // 引数でSPAのリダイレクト先URLを受け取る
//    $spaUrl = isset($_POST['spaUrl']) ? $_POST['spaUrl'] : '';
//    if (!$spaUrl) {
//        http_response_code(400);
//        echo json_encode(['error' => 'spaUrl required']);
//        exit;
//    }
//
//    // ランダムな8文字英数字でbasenameを作成
//    $basename = substr(bin2hex(random_bytes(4)), 0, 8);
//
//    $dir = __DIR__ . '/../uploads/x/';
//    if (!is_dir($dir)) mkdir($dir, 0777, true);
//
//    $imgPath = $dir . $basename . '.png';
//    if (!move_uploaded_file($_FILES['file']['tmp_name'], $imgPath)) {
//        http_response_code(500);
//        echo json_encode(['error' => 'upload failed']);
//        exit;
//    }
//
//    // 画像のファイルサイズを必ずチェック（0バイトや極小なら失敗扱い）
//    clearstatcache(true, $imgPath);
//    $maxTry = 10;
//    $try = 0;
//    while ((!file_exists($imgPath) || filesize($imgPath) < 1024) && $try < $maxTry) {
//        // まだファイルができてない・極小（1KB未満）ならちょっと待つ
//        usleep(200 * 1000); // 0.2秒
//        clearstatcache(true, $imgPath);
//        $try++;
//    }
//    if (!file_exists($imgPath) || filesize($imgPath) < 1024) {
//        http_response_code(500);
//        echo json_encode(['error' => 'image save failed or too small']);
//        exit;
//    }
//
//    $imgUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.png";
//    $htmlPath = $dir . $basename . '.html';
//    $htmlUrl = "https://kenzkenz.xsrv.jp/open-hinata3/uploads/x/$basename.html";
//
//    // OGP＋0秒SPAリダイレクトHTMLを生成（画像生成後・ファイル存在確認後）
//    $ogpHtml = <<<EOT
//<!DOCTYPE html>
//<html lang="ja">
//<head>
//  <meta charset="UTF-8">
//  <meta property="og:title" content="OH3">
//  <meta property="og:description" content="open-hinata3で表示した地図です">
//  <meta property="og:image" content="$imgUrl">
//  <meta property="og:type" content="website">
//  <meta property="og:url" content="$htmlUrl">
//  <meta name="twitter:card" content="summary_large_image">
//  <meta name="twitter:image" content="$imgUrl">
//  <meta http-equiv="refresh" content="0;url=$spaUrl">
//  <title>Open-hinata3 シェア</title>
//</head>
//<body>
//  <script>
//   location.replace("$spaUrl");
//  </script>
//</body>
//</html>
//EOT;
//
//    file_put_contents($htmlPath, $ogpHtml);
//
//    // （オプション）画像ファイルに一度GETアクセスして、Webサーバーキャッシュを作る
//    @file_get_contents($imgUrl);
//
//    echo json_encode(['shareUrl' => $htmlUrl]);
//    exit;
//}
//http_response_code(400);
//echo json_encode(['error' => 'invalid request']);
//
