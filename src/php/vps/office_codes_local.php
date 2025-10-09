<?php
// /api/office_codes_local.php
// ローカルCSV → [{code,label}] を返す（ヘッダ有無どちらも対応）

declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=UTF-8');

// ★CSVの設置場所に合わせて
$csvPath = '/var/www/html/public_html/data/site_information_f.csv';

function send($obj, int $code=200){
    http_response_code($code);
    echo json_encode($obj, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}
function clean_utf8(string $s): string {
    $enc = mb_detect_encoding($s, ['UTF-8','SJIS-win','EUC-JP','ISO-2022-JP'], true) ?: 'UTF-8';
    if ($enc !== 'UTF-8') $s = mb_convert_encoding($s, 'UTF-8', $enc);
    return preg_replace("/\r\n|\r/u", "\n", $s);
}
function ymd_today(): string { return date('Ymd'); }

if (!is_file($csvPath)) send(['error'=>'not_found','path'=>$csvPath], 404);

try {
    $raw = file_get_contents($csvPath);
    if ($raw === false) throw new RuntimeException('read failed');
    $csv = clean_utf8($raw);

    // ★ここを修正（括弧数）
    $lines = array_values(array_filter(explode("\n", $csv), fn($l) => trim($l) !== ''));
    if (!$lines) send([], 200);

    // 先頭行を見てヘッダ判定
    $first = str_getcsv($lines[0]);
    $hasHeader = false;
    foreach ($first as $cell) {
        if (preg_match('/(コード|庁|登記所|名称|code|name)/iu', trim($cell))) { $hasHeader = true; break; }
    }

    $idxCode = -1; $idxName = -1; $idxPref = -1; $idxStart = -1; $idxEnd = -1;

    if ($hasHeader) {
        $header = str_getcsv(array_shift($lines));
        foreach ($header as $i => $h) {
            $h = trim($h);
            if ($idxCode  < 0 && preg_match('/(コード|code)/iu', $h)) $idxCode = $i;
            if ($idxName  < 0 && preg_match('/(庁|登記所|名称|name)/iu', $h)) $idxName = $i;
            if ($idxPref  < 0 && preg_match('/(都道府県|pref)/iu', $h)) $idxPref = $i;
            if ($idxStart < 0 && preg_match('/(開始|start)/iu', $h)) $idxStart = $i;
            if ($idxEnd   < 0 && preg_match('/(終了|end)/iu',   $h)) $idxEnd = $i;
        }
        if ($idxCode < 0) $idxCode = 0;
        if ($idxName < 0) $idxName = 1;
    } else {
        // あなたのCSV形（ヘッダ無し）：[0連番,1コード,2都道府県,3登記所名,4開始日,5終了日]
        $idxCode  = 1;
        $idxPref  = 2;
        $idxName  = 3;
        $idxStart = 4;
        $idxEnd   = 5;
    }

    $today = ymd_today();
    $out = [];

    foreach ($lines as $line) {
        $cols = str_getcsv($line);
        $cCode = $cols[$idxCode]  ?? '';
        $cName = $cols[$idxName]  ?? '';
        $cPref = $idxPref >= 0 ? ($cols[$idxPref] ?? '') : '';
        $cStart= $idxStart>= 0 ? ($cols[$idxStart]?? '') : '';
        $cEnd  = $idxEnd  >= 0 ? ($cols[$idxEnd]  ?? '') : '';

        $code = preg_replace('/\D+/', '', (string)$cCode);
        if (strlen($code) !== 4) continue;

        $label = trim($cPref) ? (trim($cPref).' '.trim($cName)) : trim($cName);
        if ($label === '') continue;

        // 有効期間フィルタ
        if ($cStart && preg_match('/^\d{8}$/', $cStart) && $today < $cStart) continue;
        if ($cEnd   && preg_match('/^\d{8}$/', $cEnd)   && $cEnd !== '99991231' && $today > $cEnd) continue;

        $out[$code] = ['code'=>$code, 'label'=>$label];
    }

    ksort($out);
    send(array_values($out), 200);

} catch (Throwable $e) {
    // 必要ならロギング
    send(['error'=>'parse_failed','message'=>$e->getMessage()], 500);
}
