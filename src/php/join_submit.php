<?php
$group = $_POST['group'] ?? '';
$email = $_POST['email'] ?? '';

// 仮処理（本来はDB登録など）
if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "メール「{$email}」をグループ「{$group}」に登録しました。";
} else {
    echo "無効なメールアドレスです。";
}
