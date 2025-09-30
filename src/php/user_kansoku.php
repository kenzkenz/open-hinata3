<?php
require_once "pwd.php"; // DB接続情報を含むファイル
header("Content-Type: application/json");

// 最小版（user_id は VARCHAR(255) 前提）
// 対応: jobs.create / jobs.list / jobs.delete
// action 未指定のときは疎通用の ping を返すだけ。

if (!isset($pdo) || !($pdo instanceof PDO)) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'PDO 未初期化（pwd.php を確認）']);
    exit;
}
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$action = isset($_POST['action']) ? (string)$_POST['action'] : '';

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
            $user_id  = trim((string)($_POST['user_id'] ?? ''));
            $job_name = trim((string)($_POST['job_name'] ?? $_POST['name'] ?? ''));
            $note     = isset($_POST['note']) ? trim((string)$_POST['note']) : null;
            if ($user_id === '' || $job_name === '') {
                echo json_encode(['ok'=>false,'error'=>'user_id と job_name は必須']);
                exit;
            }
            if ($note === '') $note = null;

            if ($note !== null) {
                $stmt = $pdo->prepare('INSERT INTO jobs (user_id, job_name, note) VALUES (?, ?, ?)');
                $stmt->execute([$user_id, $job_name, $note]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO jobs (user_id, job_name) VALUES (?, ?)');
                $stmt->execute([$user_id, $job_name]);
            }

            $id  = (int)$pdo->lastInsertId();
            $row = $pdo->query("SELECT * FROM jobs WHERE job_id={$id}")->fetch();
            echo json_encode(['ok'=>true,'data'=>$row], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // -------------------- jobs.list --------------------
        case 'jobs.list': {
            $user_id = isset($_POST['user_id']) ? trim((string)$_POST['user_id']) : '';
            if ($user_id !== '') {
                $stmt = $pdo->prepare('SELECT * FROM jobs WHERE user_id=? ORDER BY job_id DESC');
                $stmt->execute([$user_id]);
                $rows = $stmt->fetchAll();
            } else {
                $rows = $pdo->query('SELECT * FROM jobs ORDER BY job_id DESC')->fetchAll();
            }
            echo json_encode(['ok'=>true,'data'=>$rows], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // -------------------- jobs.delete --------------------
        case 'jobs.delete': {
            $job_id = (int)($_POST['job_id'] ?? 0);
            if ($job_id <= 0) {
                echo json_encode(['ok'=>false,'error'=>'job_id は必須']);
                exit;
            }
            $stmt = $pdo->prepare('DELETE FROM jobs WHERE job_id=?');
            $stmt->execute([$job_id]);
            echo json_encode(['ok'=>true,'data'=>['deleted_id'=>$job_id]], JSON_UNESCAPED_UNICODE);
            exit;
        }

        default:
            echo json_encode(['ok'=>false,'error'=>'未知の action: '.$action], JSON_UNESCAPED_UNICODE);
            exit;

        // 追加: job_points.create
        case 'job_points.create': {
            $job_id   = (int)($_POST['job_id'] ?? 0);
            $user_id  = trim((string)($_POST['user_id'] ?? ''));
            $pname    = trim((string)($_POST['point_name'] ?? $_POST['name'] ?? ''));
            if ($job_id <= 0 || $user_id === '' || $pname === '') {
                echo json_encode(['ok'=>false,'error'=>'job_id / user_id / point_name は必須']); exit;
            }

            $x_north         = $_POST['x_north']         ?? null;
            $y_east          = $_POST['y_east']          ?? null;
            $h_orthometric   = $_POST['h_orthometric']   ?? null;
            $antenna_height  = $_POST['antenna_height']  ?? null;
            $h_at_antenna    = $_POST['h_at_antenna']    ?? null;
            $hae_ellipsoidal = $_POST['hae_ellipsoidal'] ?? null;
            $xy_diff         = $_POST['xy_diff']         ?? null;
            $crs_label       = $_POST['crs_label']       ?? null;
            $observed_at     = $_POST['observed_at']     ?? null; // "YYYY-MM-DD HH:MM:SS"

            $sql = 'INSERT INTO job_points
    (job_id,user_id,point_name,x_north,y_east,h_orthometric,antenna_height,h_at_antenna,hae_ellipsoidal,xy_diff,crs_label,observed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $job_id,$user_id,$pname,
                $x_north,$y_east,$h_orthometric,$antenna_height,$h_at_antenna,
                $hae_ellipsoidal,$xy_diff,$crs_label,$observed_at
            ]);

            $id  = (int)$pdo->lastInsertId();
            $row = $pdo->query("SELECT * FROM job_points WHERE point_id={$id}")->fetch();
            echo json_encode(['ok'=>true,'data'=>$row], JSON_UNESCAPED_UNICODE); exit;
        }

        // 追加: job_points.list（job_id 指定で昇順）
        case 'job_points.list': {
            $job_id = (int)($_POST['job_id'] ?? 0);
            if ($job_id <= 0) { echo json_encode(['ok'=>false,'error'=>'job_id は必須']); exit; }
            $stmt = $pdo->prepare('SELECT * FROM job_points WHERE job_id=? ORDER BY point_id ASC');
            $stmt->execute([$job_id]);
            $rows = $stmt->fetchAll();
            echo json_encode(['ok'=>true,'data'=>$rows], JSON_UNESCAPED_UNICODE); exit;
        }

    }
} catch (PDOException $e) {
    // 一意制約（uk_user_jobname）違反はメッセージ化
    if (strpos($e->getMessage(), '1062') !== false) {
        echo json_encode(['ok'=>false,'error'=>'重複：同一 user_id に同名の job_name が存在します'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
