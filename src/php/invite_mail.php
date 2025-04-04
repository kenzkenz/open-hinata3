<?php
// CORSとヘッダー
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// ↓↓↓ ここから出力が始まる前に何も出力しないこと！

// PHPMailer の読み込み（手動アップロード形式）
require_once __DIR__ . '/PHPMailer.php';
require_once __DIR__ . '/SMTP.php';
require_once __DIR__ . '/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// JSON受信
$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';
$groupName = $data['group'] ?? '(不明なグループ)';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "無効なメールアドレスです"]);
    exit;
}

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'sv1230.xserver.jp';
    $mail->SMTPAuth = true;
    $mail->Username = 'kenzkenz@kenzkenz.xsrv.jp';
    $mail->Password = 'ken1697/';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;
    $mail->CharSet = "UTF-8";

    $mail->setFrom('kenzkenz@kenzkenz.xsrv.jp', 'open-hinata3');
    $mail->addAddress($email);

    $mail->Subject = "【招待】グループ「{$groupName}」へのご案内";
    $mail->Body = <<<EOT
こんにちは！

あなたはグループ「{$groupName}」に招待されました。

以下のリンクから参加してください：
https://kenzkenz.xsrv.jp/open-hinata3/join.php?group={$groupName}


※このメールに心当たりがない場合は無視してください。
EOT;

    $mail->send();
    echo json_encode(["success" => true, "message" => "招待メールを送信しました"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "メール送信に失敗しました: " . $mail->ErrorInfo
    ]);
}
