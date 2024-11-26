<?php
require_once "pwd.php";

$MESH_ID = $_GET["MESH_ID"];

$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
$mysql = "SELECT * FROM suikei500m WHERE MESH_ID = ?";
$stmt = $pdo->prepare($mysql);
$stmt->execute(array($MESH_ID));
$count = $stmt->rowCount();
$array0 = array();
if ($count > 0) {
    foreach ($stmt as $row) {
        $years = range(2020, 2050, 5);
        foreach ($years as $year) {
            $year_suffix = "PTN_" . $year;
            $rta_suffix = "RTA_" . $year;
            $rtb_suffix = "RTB_" . $year;
            $rtc_suffix = "RTC_" . $year;

            if (isset($row[$year_suffix]) && $row[$year_suffix] != 0) {
                $array = [
                    "year" => (int)$year,
                    "value" => (int)round($row[$year_suffix]),
                    "ronenRate" => (int)$row[$rtc_suffix],
                    "nensyoRate" => (int)$row[$rta_suffix],
                    "seisanRate" => (int)$row[$rtb_suffix],
                ];
                $array0[] = $array;
            }
        }
    }
    $response = $array0;
} else {
    //一致データなし
    $response = array('error' => 'nodata');
}
echo json_encode($response);
?>

