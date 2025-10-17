<?php
// File: jobs.php
// 最小CRUD + ジョブ名更新（jobs.update） — あなたの雛形に準拠
// 先頭は必須: DB接続（$pdo: PDO インスタンス）
require_once "pwd.php"; // DB接続情報を含むファイル
header("Content-Type: application/json; charset=UTF-8");

// =========================
// 入力の受け取り
// =========================
// application/json でも x-www-form-urlencoded でも受け付ける
$raw = file_get_contents('php://input');
if ($raw && (!isset($_POST) || count($_POST) === 0)) {
    $j = json_decode($raw, true);
    if (is_array($j)) {
        foreach ($j as $k => $v) { $_POST[$k] = $v; }
    }
}

if (!isset($pdo) || !($pdo instanceof PDO)) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'PDO 未初期化（pwd.php を確認）']);
    exit;
}
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$action = isset($_POST['action']) ? trim((string)$_POST['action']) : '';

if ($action === '') {
    echo json_encode([
        'ok'=>true,
        'ping'=>'pong',
        'method'=>$_SERVER['REQUEST_METHOD'] ?? 'CLI',
        'timestamp'=>date('c'),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    switch ($action) {
        // -------------------- jobs.create --------------------
        case 'jobs.create': {
            $user_id   = trim((string)($_POST['user_id'] ?? ''));
            $user_name = trim((string)($_POST['user_name'] ?? ''));
            $job_name  = trim((string)($_POST['job_name'] ?? $_POST['name'] ?? ''));
            $note      = isset($_POST['note']) ? trim((string)$_POST['note']) : null;
            if ($user_id === '' || $job_name === '') { echo json_encode(['ok'=>false,'error'=>'user_id と job_name は必須']); exit; }
            if ($note === '') $note = null;

            if ($note !== null) {
                $stmt = $pdo->prepare('INSERT INTO jobs (user_id, user_name, job_name, note) VALUES (?, ?, ?, ?)');
                $stmt->execute([$user_id, $user_name, $job_name, $note]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO jobs (user_id, user_name, job_name) VALUES (?, ?, ?)');
                $stmt->execute([$user_id, $user_name, $job_name]);
            }

            $id  = (int)$pdo->lastInsertId();
            $stmt2 = $pdo->prepare('SELECT * FROM jobs WHERE job_id = ?');
            $stmt2->execute([$id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }

        // -------------------- jobs.list --------------------
        case 'jobs.list': {
            $user_id = isset($_POST['user_id']) ? trim((string)$_POST['user_id']) : '';

            $sql = "SELECT j.*, COALESCE(p.cnt,0) AS point_count
                    FROM jobs j
                    LEFT JOIN (
                      SELECT job_id, COUNT(*) AS cnt
                      FROM job_points
                      GROUP BY job_id
                    ) p ON p.job_id = j.job_id";
            $order = " ORDER BY j.job_id DESC";

            if ($user_id !== '') {
                $stmt = $pdo->prepare($sql . " WHERE j.user_id=? " . $order);
                $stmt->execute([$user_id]);
                $rows = $stmt->fetchAll();
            } else {
                $rows = $pdo->query($sql . $order)->fetchAll();
            }
            echo json_encode(['ok'=>true,'data'=>$rows], JSON_UNESCAPED_UNICODE); exit;
        }

        // -------------------- jobs.update（★ジョブ名変更） --------------------
        case 'jobs.update': {
            $job_id   = (int)($_POST['job_id'] ?? 0);
            $job_name = trim((string)($_POST['job_name'] ?? $_POST['name'] ?? ''));
            if ($job_id <= 0 || $job_name === '') { echo json_encode(['ok'=>false,'error'=>'job_id と job_name は必須']); exit; }
            $stmt = $pdo->prepare('UPDATE jobs SET job_name = ? WHERE job_id = ?');
            $stmt->execute([$job_name, $job_id]);
            $stmt2 = $pdo->prepare('SELECT * FROM jobs WHERE job_id = ?');
            $stmt2->execute([$job_id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }
        // -------------------- jobs.update（★ノート変更） --------------------
        case 'jobs.update_note': {
            $job_id   = (int)($_POST['job_id'] ?? 0);
            $job_note = trim((string)($_POST['job_note'] ?? $_POST['note'] ?? ''));
            if ($job_id <= 0 ) { echo json_encode(['ok'=>false,'error'=>'job_id と job_note は必須']); exit; }
            $stmt = $pdo->prepare('UPDATE jobs SET note = ? WHERE job_id = ?');
            $stmt->execute([$job_note, $job_id]);
            $stmt2 = $pdo->prepare('SELECT * FROM jobs WHERE job_id = ?');
            $stmt2->execute([$job_id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }

        // -------------------- jobs.delete --------------------
        case 'jobs.delete': {
            $job_id = (int)($_POST['job_id'] ?? 0);
            if ($job_id <= 0) { echo json_encode(['ok'=>false,'error'=>'job_id は必須']); exit; }
            $stmt = $pdo->prepare('DELETE FROM jobs WHERE job_id=?');
            $stmt->execute([$job_id]);
            echo json_encode(['ok'=>true,'data'=>['deleted_id'=>$job_id]], JSON_UNESCAPED_UNICODE); exit;
        }

        // -------------------- job_points.create --------------------
        case 'job_points.create': {
            $job_id   = (int)($_POST['job_id'] ?? 0);
            $user_id  = trim((string)($_POST['user_id'] ?? ''));
            $pname    = trim((string)($_POST['point_name'] ?? $_POST['name'] ?? ''));
            if ($job_id <= 0 || $user_id === '' || $pname === '') { echo json_encode(['ok'=>false,'error'=>'job_id / user_id / point_name は必須']); exit; }

            $nz = function($v){ return (isset($v) && $v !== '') ? $v : null; };
            $x_north         = $nz($_POST['x_north']         ?? null);
            $y_east          = $nz($_POST['y_east']          ?? null);
            $lng             = $nz($_POST['lng']             ?? null);
            $lat             = $nz($_POST['lat']             ?? null);
            $h_orthometric   = $nz($_POST['h_orthometric']   ?? null);
            $antenna_height  = $nz($_POST['antenna_height']  ?? null);
            $h_at_antenna    = $nz($_POST['h_at_antenna']    ?? null);
            $hae_ellipsoidal = $nz($_POST['hae_ellipsoidal'] ?? null);
            $xy_diff         = $nz($_POST['xy_diff']         ?? null);
            $crs_label       = $nz($_POST['crs_label']       ?? null);
            $observed_at     = $nz($_POST['observed_at']     ?? null);
            $observe_count   = isset($_POST['observe_count']) && $_POST['observe_count'] !== '' ? (int)$_POST['observe_count'] : null;
            $address         = $_POST['address']         ?? null;  // ★追加

            $sql = 'INSERT INTO job_points
                (job_id,user_id,point_name,
                 x_north,y_east,lng,lat,
                 h_orthometric,antenna_height,h_at_antenna,hae_ellipsoidal,
                 xy_diff,crs_label,observed_at,
                 observe_count,address)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            $stmt = $pdo->prepare($sql);
            $ok = $stmt->execute([
                $job_id, $user_id, $pname,
                $x_north, $y_east, $lng, $lat,
                $h_orthometric, $antenna_height, $h_at_antenna, $hae_ellipsoidal,
                $xy_diff, $crs_label, $observed_at,
                $observe_count,
                $address
            ]);
            if (!$ok) { echo json_encode(['ok'=>false,'error'=>'DB insert failed'], JSON_UNESCAPED_UNICODE); exit; }

            $id  = (int)$pdo->lastInsertId();
            $stmt2 = $pdo->prepare('SELECT * FROM job_points WHERE point_id = ?');
            $stmt2->execute([$id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }

        // -------------------- job_points.list --------------------
        case 'job_points.list': {
            $job_id = (int)($_POST['job_id'] ?? 0);
            if ($job_id <= 0) { echo json_encode(['ok'=>false,'error'=>'job_id は必須']); exit; }
            $stmt = $pdo->prepare('SELECT * FROM job_points WHERE job_id=? ORDER BY point_id DESC');
            $stmt->execute([$job_id]);
            echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()], JSON_UNESCAPED_UNICODE); exit;
        }

        // -------------------- job_points.delete --------------------
        case 'job_points.delete': {
            $point_id = (int)($_POST['point_id'] ?? 0);
            if ($point_id <= 0) { echo json_encode(['ok'=>false,'error'=>'point_id は必須']); exit; }
            $stmt = $pdo->prepare('DELETE FROM job_points WHERE point_id=?');
            $stmt->execute([$point_id]);
            echo json_encode(['ok'=>true,'data'=>['deleted_id'=>$point_id]], JSON_UNESCAPED_UNICODE); exit;
        }
        // -------------------- job_points.update_name --------------------
        case 'job_points.update_name': {
            $point_id   = (int)($_POST['point_id'] ?? 0);
            $point_name = trim((string)($_POST['point_name'] ?? ''));
            if ($point_id <= 0 || $point_name === '') {
                echo json_encode(['ok'=>false,'error'=>'point_id と point_name は必須'], JSON_UNESCAPED_UNICODE); exit;
            }
            $stmt = $pdo->prepare('UPDATE job_points SET point_name = ? WHERE point_id = ?');
            $stmt->execute([$point_name, $point_id]);

            $stmt2 = $pdo->prepare('SELECT * FROM job_points WHERE point_id = ?');
            $stmt2->execute([$point_id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }
        // -------------------- job_points.update_address --------------------
        case 'job_points.update_address': {
            $point_id   = (int)($_POST['point_id'] ?? 0);
            $address = trim((string)($_POST['address'] ?? ''));
            if ($point_id <= 0 ) {
                echo json_encode(['ok'=>false,'error'=>'point_id と point_address は必須'], JSON_UNESCAPED_UNICODE); exit;
            }
            $stmt = $pdo->prepare('UPDATE job_points SET address = ? WHERE point_id = ?');
            $stmt->execute([$address, $point_id]);

            $stmt2 = $pdo->prepare('SELECT * FROM job_points WHERE point_id = ?');
            $stmt2->execute([$point_id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }
        // -------------------- job_points.update_note --------------------
        case 'job_points.update_note': {
            $point_id   = (int)($_POST['point_id'] ?? 0);
            $address = trim((string)($_POST['note'] ?? ''));
            if ($point_id <= 0 ) {
                echo json_encode(['ok'=>false,'error'=>'point_id と note は必須'], JSON_UNESCAPED_UNICODE); exit;
            }
            $stmt = $pdo->prepare('UPDATE job_points SET note = ? WHERE point_id = ?');
            $stmt->execute([$address, $point_id]);

            $stmt2 = $pdo->prepare('SELECT * FROM job_points WHERE point_id = ?');
            $stmt2->execute([$point_id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }
        // -------------------- job_points.update_media（超軽量版：常に6項目受領） --------------------
        case 'job_points.update_media': {
            $point_id = (int)($_POST['point_id'] ?? 0);
            if ($point_id <= 0) { echo json_encode(['ok'=>false,'error'=>'point_id は必須']); exit; }

            // 1) 受領値を正規化（空文字→NULL、型を揃える）
            $note = isset($_POST['note']) ? trim((string)$_POST['note']) : '';
            $note = ($note === '') ? null : $note;

            $mk = strtolower((string)($_POST['media_kind'] ?? ''));
            if (!in_array($mk, ['none','image','video'], true)) $mk = 'none';  // enum保護

            $media_path = isset($_POST['media_path']) ? trim((string)$_POST['media_path']) : '';
            if ($media_path === '') $media_path = null;       // WEB上のURL

            $abs_path = isset($_POST['abs_path']) ? trim((string)$_POST['abs_path']) : '';
            if ($abs_path === '') $abs_path = null;           // サーバー上のフルパス

            $media_size = ($_POST['media_size'] ?? '');
            $media_size = ($media_size === '' || $media_size === null) ? null : $media_size;

            $media_processing = ($_POST['media_processing'] ?? '');
            $media_processing = ($media_processing === '' || $media_processing === null) ? 0 : ((int)$media_processing ? 1 : 0);

            // 2) 一括UPDATE（毎回6カラムすべて更新）
            $sql = 'UPDATE job_points
               SET note = :note,
                   media_kind = :mk,
                   media_path = :mp,
                   abs_path = :ap,
                   media_size = :ms,
                   media_processing = :mpc
             WHERE point_id = :pid';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':note'=>$note, ':mk'=>$mk, ':mp'=>$media_path, ':ap'=>$abs_path,
                ':ms'=>$media_size, ':mpc'=>$media_processing, ':pid'=>$point_id
            ]);

            // 3) 反映行を返す
            $stmt2 = $pdo->prepare('SELECT * FROM job_points WHERE point_id = ?');
            $stmt2->execute([$point_id]);
            echo json_encode(['ok'=>true,'data'=>$stmt2->fetch()], JSON_UNESCAPED_UNICODE); exit;
        }

        default: {
            echo json_encode(['ok'=>false,'error'=>'未知の action: '.$action], JSON_UNESCAPED_UNICODE); exit;
        }
    }
} catch (PDOException $e) {
    if (strpos($e->getMessage(), '1062') !== false) {
        echo json_encode(['ok'=>false,'error'=>'重複：同一 user_id に同名の job_name が存在します'], JSON_UNESCAPED_UNICODE); exit;
    }
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE); exit;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE); exit;
}
?>