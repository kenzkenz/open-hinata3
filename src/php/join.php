<?php
// エラー表示（開発時のみ）
ini_set('display_errors', 1);
error_reporting(E_ALL);

// クエリからグループ名を取得
$group = $_GET['group'] ?? '';

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>グループ参加</title>
</head>
<body>
<h1>グループ「<?php echo htmlspecialchars($group, ENT_QUOTES, 'UTF-8'); ?>」への参加</h1>

<?php if ($group): ?>
    <p>ようこそ！このページは、グループ「<strong><?php echo htmlspecialchars($group); ?></strong>」への参加リンクです。</p>
    <form action="join_submit.php" method="POST">
        <input type="hidden" name="group" value="<?php echo htmlspecialchars($group); ?>">
        <label>あなたのメールアドレス: <input type="email" name="email" required></label>
        <button type="submit">参加する</button>
    </form>
<?php else: ?>
    <p>グループ名が指定されていません。</p>
<?php endif; ?>
</body>
</html>
