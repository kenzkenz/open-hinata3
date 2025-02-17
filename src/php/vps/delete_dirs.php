<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// **削除を許可するベースディレクトリ**
$allowedBaseDirs = [
    realpath("/var/www/html/public_html/tiles/"),
    realpath("/var/www/html/public_html/uploads/")
];

// **ディレクトリ削除関数**
function deleteDirectory($dir)
{
    if (!is_dir($dir)) {
        return false;
    }

    $files = array_diff(scandir($dir), array('.', '..'));

    foreach ($files as $file) {
        $filePath = $dir . DIRECTORY_SEPARATOR . $file;
        if (is_dir($filePath)) {
            deleteDirectory($filePath); // 再帰的にディレクトリ削除
        } else {
            unlink($filePath); // ファイル削除
        }
    }

    return rmdir($dir); // ディレクトリ削除
}

// **特定の文字列を含むファイルを削除する関数**
function deleteFilesContainingString($dir, $string)
{
    if (!is_dir($dir)) {
        return false;
    }

    $files = array_diff(scandir($dir), array('.', '..'));
    foreach ($files as $file) {
        $filePath = $dir . DIRECTORY_SEPARATOR . $file;
        if (is_file($filePath) && strpos($file, $string) !== false) {
            unlink($filePath); // ファイル削除
        }
    }
    return true;
}

// **JSON データの取得**
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["dir"]) || !isset($data["dir2"]) || !isset($data["string"])) {
    echo json_encode(["error" => "必要なパラメータが不足しています"]);
    exit;
}

$dir = realpath($data["dir"]);
$dir2 = realpath($data["dir2"]);
$string = $data["string"];

// **セキュリティ対策: 指定されたディレクトリが許可されたディレクトリの中にあるか確認**
function isAllowedDirectory($dir, $allowedBaseDirs)
{
    foreach ($allowedBaseDirs as $baseDir) {
        if ($dir !== false && strpos($dir, $baseDir) === 0) {
            return true;
        }
    }
    return false;
}

$dirAllowed = isAllowedDirectory($dir, $allowedBaseDirs);
$dir2Allowed = isAllowedDirectory($dir2, $allowedBaseDirs);

// **削除結果格納用**
$response = [];

// **tiles ディレクトリ削除**
if ($dirAllowed) {
    $deletedTiles = deleteDirectory($dir);
    $response["dirDeleted"] = $deletedTiles;
    if (!$deletedTiles) {
        $response["error_tiles"] = "tiles ディレクトリの削除に失敗";
    }
}

// **uploads のファイル削除**
if ($dir2Allowed) {
    $filesDeletedUploads = deleteFilesContainingString($dir2, $string);
    $response["filesDeleted"] = $filesDeletedUploads;
    if (!$filesDeletedUploads) {
        $response["error_uploads"] = "uploads のファイル削除に失敗";
    }
}

// **メッセージの作成**
if ($dirAllowed || $dir2Allowed) {
    if (!isset($response["error_tiles"]) && !isset($response["error_uploads"])) {
        $response["message"] = "ファイルとディレクトリの削除成功";
    } else {
        $response["message"] = "削除の一部または全部が失敗";
    }
} else {
    $response["error"] = "許可されていないディレクトリへのアクセス";
}

// **結果を JSON で返す**
echo json_encode($response);


//
//
//header("Access-Control-Allow-Origin: *");
//header("Access-Control-Allow-Methods: POST, DELETE, OPTIONS");
//header("Access-Control-Allow-Headers: Content-Type");
//
//// **削除を許可するベースディレクトリ**
//$allowedBaseDirs = [
//    realpath("/var/www/html/public_html/tiles/"),
//    realpath("/var/www/html/public_html/uploads/")
//];
//
//// **ディレクトリ削除関数**
//function deleteDirectory($dir)
//{
//    if (!is_dir($dir)) {
//        return false;
//    }
//
//    $files = array_diff(scandir($dir), array('.', '..'));
//
//    foreach ($files as $file) {
//        $filePath = $dir . DIRECTORY_SEPARATOR . $file;
//        if (is_dir($filePath)) {
//            deleteDirectory($filePath); // 再帰的にディレクトリ削除
//        } else {
//            unlink($filePath); // ファイル削除
//        }
//    }
//
//    return rmdir($dir); // ディレクトリ削除
//}
//
//// **特定の文字列を含むファイルを削除する関数**
//function deleteFilesContainingString($dir, $string)
//{
//    if (!is_dir($dir)) {
//        return false;
//    }
//
//    $files = array_diff(scandir($dir), array('.', '..'));
//    foreach ($files as $file) {
//        $filePath = $dir . DIRECTORY_SEPARATOR . $file;
//        if (is_file($filePath) && strpos($file, $string) !== false) {
//            unlink($filePath); // ファイル削除
//        }
//    }
//    return true;
//}
//
//// **JSON データの取得**
//$data = json_decode(file_get_contents("php://input"), true);
//
//if (!isset($data["dir"]) || !isset($data["dir2"]) || !isset($data["string"])) {
//    echo json_encode(["error" => "必要なパラメータが不足しています"]);
//    exit;
//}
//
//$dir = realpath($data["dir"]);
//$dir2 = realpath($data["dir2"]);
//$string = $data["string"];
//
//// **セキュリティ対策: 指定されたディレクトリが許可されたディレクトリの中にあるか確認**
//function isAllowedDirectory($dir, $allowedBaseDirs)
//{
//    foreach ($allowedBaseDirs as $baseDir) {
//        if ($dir !== false && strpos($dir, $baseDir) === 0) {
//            return true;
//        }
//    }
//    return false;
//}
//
//$dirAllowed = isAllowedDirectory($dir, $allowedBaseDirs);
//$dir2Allowed = isAllowedDirectory($dir2, $allowedBaseDirs);
//
//if (!$dirAllowed && !$dir2Allowed) {
//    echo json_encode(["error" => "許可されていないディレクトリへのアクセス"]);
//    exit;
//}
//
//// **削除結果格納用**
//$response = [];
//
//// **tiles ディレクトリ削除**
//if ($dirAllowed) {
//    $deletedTiles = deleteDirectory($dir);
//    $response["dirDeleted"] = $deletedTiles;
//    if (!$deletedTiles) {
//        $response["error_tiles"] = "tiles ディレクトリの削除に失敗";
//    }
//}
//
//// **uploads のファイル削除**
//if ($dir2Allowed) {
//    $filesDeletedUploads = deleteFilesContainingString($dir2, $string);
//    $response["filesDeleted"] = $filesDeletedUploads;
//    if (!$filesDeletedUploads) {
//        $response["error_uploads"] = "uploads のファイル削除に失敗";
//    }
//}
//
//// **メッセージの作成**
//if (!isset($response["error_tiles"]) && !isset($response["error_uploads"])) {
//    $response["message"] = "ファイルとディレクトリの削除成功";
//} else {
//    $response["message"] = "削除の一部または全部が失敗";
//}
//
//// **結果を JSON で返す**
//echo json_encode($response);
//
//?>
