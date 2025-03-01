<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

function listDirectories($baseDir, $maxDepth = 2, $currentDepth = 0) {
    if (!is_dir($baseDir)) {
        return [];
    }

    $directories = [];
    $items = scandir($baseDir);

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $fullPath = rtrim($baseDir, '/') . '/' . $item;

        if (is_dir($fullPath)) {
            if ($currentDepth + 1 == $maxDepth) {
                $layerJsonPath = $fullPath . '/layer.json';
                if (file_exists($layerJsonPath)) {
                    $jsonContent = json_decode(file_get_contents($layerJsonPath), true);
                    if ($jsonContent && isset($jsonContent['fileName']) && isset($jsonContent['bounds'])) {
                        $directories[] = [
                            "path" => $fullPath,
                            "fileName" => $jsonContent['fileName'],
                            "bounds" => $jsonContent['bounds']
                        ];
                    }
                }
            } else {
                $directories = array_merge($directories, listDirectories($fullPath, $maxDepth, $currentDepth + 1));
            }
        }
    }

    return $directories;
}

$basePath = '/var/www/html/public_html/tiles/';
$directories = listDirectories($basePath);

echo json_encode([
    "success" => true,
    "directories" => $directories
]);




//
//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//function listDirectories($baseDir, $maxDepth = 2, $currentDepth = 0) {
//    if ($currentDepth >= $maxDepth) {
//        return [];
//    }
//
//    $directories = [];
//
//    if (!is_dir($baseDir)) {
//        return [];
//    }
//
//    $items = scandir($baseDir);
//
//    foreach ($items as $item) {
//        if ($item === '.' || $item === '..') {
//            continue;
//        }
//
//        $fullPath = rtrim($baseDir, '/') . '/' . $item;
//
//        if (is_dir($fullPath)) {
//            $directories[] = $fullPath;
//            $directories = array_merge($directories, listDirectories($fullPath, $maxDepth, $currentDepth + 1));
//        }
//    }
//
//    return $directories;
//}
//
//$basePath = '/var/www/html/public_html/tiles/';
//$directories = listDirectories($basePath);
//
//echo json_encode([
//    "success" => true,
//    "$directories" => $directories
//]);
//
//?>
