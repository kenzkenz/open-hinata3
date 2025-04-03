<?php

header('Content-Type: application/json');

$geojson = file_get_contents('php://input');
if (!$geojson) {
    echo json_encode(['error' => 'No GeoJSON data provided']);
    exit;
}

// 一意のファイル名を生成
$uniqueId = uniqid('geojson_', true);
$geojsonFile = "/var/www/html/public_html/myphp/{$uniqueId}_input.geojson";
$outputDxf = "/var/www/html/public_html/myphp/{$uniqueId}_output.dxf";

$result = file_put_contents($geojsonFile, $geojson);
if ($result === false) {
    echo json_encode(['error' => 'Failed to save GeoJSON file']);
    exit;
}

$pythonPath = '/var/www/html/public_html/myphp/venv/bin/python3';
$pythonScript = '/var/www/html/public_html/myphp/convert_to_dxf.py';
if (!file_exists($pythonPath)) {
    echo json_encode(['error' => 'Python executable not found', 'path' => $pythonPath]);
    exit;
}

$command = "EZDXF_DISABLE_CACHE=1 $pythonPath $pythonScript $geojsonFile $outputDxf 2>&1";
$output = shell_exec($command);

if (!file_exists($outputDxf)) {
    echo json_encode(['error' => 'Failed to generate DXF', 'output' => $output]);
    if (file_exists($geojsonFile)) unlink($geojsonFile);
    exit;
}

header('Content-Type: application/dxf');
header('Content-Disposition: attachment; filename="output.dxf"');
readfile($outputDxf);

if (file_exists($geojsonFile)) unlink($geojsonFile);
if (file_exists($outputDxf)) unlink($outputDxf);


//
//header('Content-Type: application/json');
//
//// GeoJSONを受け取る
//$geojson = file_get_contents('php://input');
//if (!$geojson) {
//    echo json_encode(['error' => 'No GeoJSON data provided']);
//    exit;
//}
//
//// フルパスで一時ファイルを保存
//$geojsonFile = '/var/www/html/public_html/myphp/temp_input.geojson';
//$outputDxf = '/var/www/html/public_html/myphp/output.dxf';
//$result = file_put_contents($geojsonFile, $geojson);
//if ($result === false) {
//    echo json_encode(['error' => 'Failed to save GeoJSON file']);
//    exit;
//}
//
//// 仮想環境のPythonでスクリプトを実行（キャッシュ無効化オプション付き）
//$pythonPath = '/var/www/html/public_html/myphp/venv/bin/python3';
//$pythonScript = '/var/www/html/public_html/myphp/convert_to_dxf.py';
//$command = "EZDXF_DISABLE_CACHE=1 $pythonPath $pythonScript $geojsonFile $outputDxf 2>&1";
//$output = shell_exec($command);
//
//// エラーチェック
//if (!file_exists($outputDxf)) {
//    echo json_encode(['error' => 'Failed to generate DXF', 'output' => $output]);
//    if (file_exists($geojsonFile)) unlink($geojsonFile);
//    exit;
//}
//
//// DXFをクライアントに送信
//header('Content-Type: application/dxf');
//header('Content-Disposition: attachment; filename="output.dxf"');
//readfile($outputDxf);
//
//// 一時ファイルを削除
//if (file_exists($geojsonFile)) unlink($geojsonFile);
//if (file_exists($outputDxf)) unlink($outputDxf);
