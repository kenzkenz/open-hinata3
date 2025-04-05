<?php
header('Content-Type: application/json');

// デバッグ用ログ
file_put_contents('debug.log', print_r($_POST, true) . "\n", FILE_APPEND);
file_put_contents('debug.log', file_get_contents('php://input') . "\n", FILE_APPEND);

// 受信データを取得
$input = json_decode(file_get_contents('php://input'), true);

// デバッグ用ログ（受信データ）
file_put_contents('debug.log', "受信データ: " . json_encode($input, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);

if (!$input || !isset($input['email']) || !isset($input['group']) || !isset($input['groupId']) || !isset($input['inviter'])) {
    file_put_contents('debug.log', "必要なデータが不足しています: " . json_encode($input, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
    echo json_encode(['success' => false, 'message' => '必要なデータが不足しています']);
    exit;
}

$email = $input['email'];
$groupName = isset($input['group']) ? $input['group'] : '';
$groupId = $input['groupId'];
$inviter = $input['inviter'];
$inviterEmail = isset($input['inviterEmail']) ? $input['inviterEmail'] : '不明なメールアドレス';

// グループ名が空の場合のフォールバック
$groupName = $groupName ?: "不明なグループ";

// デバッグ用ログ（処理中のデータ）
file_put_contents('debug.log', "処理中のデータ: groupName=$groupName, groupId=$groupId, inviter=$inviter\n", FILE_APPEND);

// 招待リンクを生成
$inviteLink = "https://kenzkenz.xsrv.jp/open-hinata3/?group=" . urlencode($groupId) . "&groupName=" . urlencode($groupName);

// デバッグ用ログ（招待リンク）
file_put_contents('debug.log', "生成した招待リンク: $inviteLink\n", FILE_APPEND);

// メールの境界文字列
$boundary = md5(uniqid(rand(), true));

// メール送信設定
$to = $email;
$subject = "Open Hinata: 「{$groupName}」への招待";

// デバッグ用ログ（メール件名）
file_put_contents('debug.log', "メール件名: {$subject}\n", FILE_APPEND);

// プレーンテキスト形式の本文
$textMessage = "こんにちは、\n\n";
$textMessage .= "あなたは「{$groupName}」に招待されました！\n";
$textMessage .= "招待者: {$inviter} ({$inviterEmail})\n\n";
$textMessage .= "Open Hinata3 は、地理情報を共有し、グループで地図を活用するアプリです。\n\n";
$textMessage .= "以下のリンクからグループに参加してください：\n";
$textMessage .= "$inviteLink\n\n";
$textMessage .= "参加手順：\n";
$textMessage .= "1. 事前にOpen Hinata3にログインしておいてください。\n";
$textMessage .= "2. リンクをクリックして Open Hinata3 にアクセスします。\n";
$textMessage .= "3. グループ管理ダイアログから「参加する」をクリックしてグループに参加します。\n\n";
$textMessage .= "何かご不明な点があれば、サポートまでお問い合わせください。\n";
$textMessage .= "よろしくお願いします。\n";
$textMessage .= "Open Hinata3 チーム\n";

// デバッグ用ログ（プレーンテキスト本文）
file_put_contents('debug.log', "プレーンテキスト本文: $textMessage\n", FILE_APPEND);

// HTML 形式の本文
$htmlMessage = "<!DOCTYPE html>";
$htmlMessage .= "<html lang='ja'>";
$htmlMessage .= "<head><meta charset='UTF-8'></head>";
$htmlMessage .= "<body style='font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;'>";
$htmlMessage .= "<div style='text-align: center; margin-bottom: 20px;'>";
$htmlMessage .= "<img src='https://kenzkenz.xsrv.jp/open-hinata3/logo.png' alt='Open Hinata Logo' style='max-width: 150px;' />";
$htmlMessage .= "</div>";
$htmlMessage .= "<h2 style='color: #1976d2;'>こんにちは</h2>";
$htmlMessage .= "<p>あなたは <strong style='color: #d32f2f;'>「{$groupName}」</strong> に招待されました！</p>";
//$htmlMessage .= "<p>招待者: <strong>{$inviter}</strong> ({$inviterEmail})</p>";
$htmlMessage .= "<p>招待者: ({$inviterEmail})</p>";
$htmlMessage .= "<p>Open Hinata3 は、地理情報を共有し、グループで地図を活用するアプリです。</p>";
$htmlMessage .= "<p>以下のリンクからグループに参加してください：</p>";
$htmlMessage .= "<p style='text-align: center;'>
  <a href='{$inviteLink}' 
     style='display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; 
            text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; 
            font-family: sans-serif;'>
    グループに参加する
  </a>
</p>";
$htmlMessage .= "<p style='color: #555; font-size: 14px;'>リンク: {$inviteLink}</p>";
$htmlMessage .= "<h3>参加手順</h3>";
$htmlMessage .= "<ol>";
$htmlMessage .= "<li>事前にOpen Hinata3にログインしておいてください。</li>";
$htmlMessage .= "<li>リンクをクリックして Open Hinata3 にアクセスします。</li>";
$htmlMessage .= "<li>グループ管理ダイアログから「参加する」をクリックしてグループに参加します。</li>";
$htmlMessage .= "</ol>";
$htmlMessage .= "<p>何かご不明な点があれば、サポートまでお問い合わせください。</p>";
$htmlMessage .= "<p style='color: #777; font-size: 12px; margin-top: 20px; text-align: center;'>よろしくお願いします。<br>Open Hinata3 チーム</p>";
$htmlMessage .= "</body>";
$htmlMessage .= "</html>";

// デバッグ用ログ（HTML本文）
file_put_contents('debug.log', "HTML本文: $htmlMessage\n", FILE_APPEND);

// マルチパートメールのヘッダー
$headers = "From: noreply@your-app.com\r\n";
$headers .= "Reply-To: noreply@your-app.com\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

// マルチパートメールの本文
$message = "--{$boundary}\r\n";
$message .= "Content-Type: text/plain; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$message .= $textMessage . "\r\n";
$message .= "--{$boundary}\r\n";
$message .= "Content-Type: text/html; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$message .= $htmlMessage . "\r\n";
$message .= "--{$boundary}--";

// メール送信
if (mail($to, $subject, $message, $headers)) {
    file_put_contents('debug.log', "メール送信成功: $to\n", FILE_APPEND);
    echo json_encode(['success' => true, 'message' => 'メールを送信しました']);
} else {
    $error = error_get_last();
    file_put_contents('debug.log', "メール送信失敗: " . json_encode($error) . "\n", FILE_APPEND);
    echo json_encode(['success' => false, 'message' => 'メール送信に失敗しました: ' . ($error['message'] ?? '不明なエラー')]);
}

exit;
?>