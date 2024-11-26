<?php
require_once "pwd.php";

$MESH_ID = $_GET["MESH_ID"];
$suikeiYear = $_GET["suikeiYear"];

$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
$mysql = "SELECT * FROM suikei500m WHERE MESH_ID = ?";
$stmt = $pdo->prepare($mysql);
$stmt->execute(array($MESH_ID));
$count = $stmt->rowCount();
$array0 = array();
if ($count > 0) {
    foreach ($stmt as $row) {

        $array = [
            // "秘匿処理" => $row['秘匿処理'],
            "総数" => $row['PTN_' . $suikeiYear],

            "男0～4歳" => $row['PM1_' . $suikeiYear],
            "男5～9歳" => $row['PM2_' . $suikeiYear],
            "男10～14歳" => $row['PM3_' . $suikeiYear],
            "男15～19歳" => $row['PM4_' . $suikeiYear],
            "男20～24歳" => $row['PM5_' . $suikeiYear],
            "男25～29歳" => $row['PM6_' . $suikeiYear],
            "男30～34歳" => $row['PM7_' . $suikeiYear],
            "男35～39歳" => $row['PM8_' . $suikeiYear],
            "男40～44歳" => $row['PM9_' . $suikeiYear],
            "男45～49歳" => $row['PM10_' . $suikeiYear],
            "男50～54歳" => $row['PM11_' . $suikeiYear],
            "男55～59歳" => $row['PM12_' . $suikeiYear],
            "男60～64歳" => $row['PM13_' . $suikeiYear],
            "男65～69歳" => $row['PM14_' . $suikeiYear],
            "男70～74歳" => $row['PM15_' . $suikeiYear],
            "男75～79歳" => $row['PM16_' . $suikeiYear],
            "男80～84歳" => $row['PM17_' . $suikeiYear],
            "男85～89歳" => $row['PM18_' . $suikeiYear],
            "男90歳以上" => $row['PM19_' . $suikeiYear],

            "女0～4歳" => $row['PF1_' . $suikeiYear],
            "女5～9歳" => $row['PF2_' . $suikeiYear],
            "女10～14歳" => $row['PF3_' . $suikeiYear],
            "女15～19歳" => $row['PF4_' . $suikeiYear],
            "女20～24歳" => $row['PF5_' . $suikeiYear],
            "女25～29歳" => $row['PF6_' . $suikeiYear],
            "女30～34歳" => $row['PF7_' . $suikeiYear],
            "女35～39歳" => $row['PF8_' . $suikeiYear],
            "女40～44歳" => $row['PF9_' . $suikeiYear],
            "女45～49歳" => $row['PF10_' . $suikeiYear],
            "女50～54歳" => $row['PF11_' . $suikeiYear],
            "女55～59歳" => $row['PF12_' . $suikeiYear],
            "女60～64歳" => $row['PF13_' . $suikeiYear],
            "女65～69歳" => $row['PF14_' . $suikeiYear],
            "女70～74歳" => $row['PF15_' . $suikeiYear],
            "女75～79歳" => $row['PF16_' . $suikeiYear],
            "女80～84歳" => $row['PF17_' . $suikeiYear],
            "女85～89歳" => $row['PF18_' . $suikeiYear],
            "女90歳以上" => $row['PF19_' . $suikeiYear],

            "65歳以上" => $row['PTC_' . $suikeiYear],
            "15歳未満" => $row['PTA_' . $suikeiYear],
            "15～64歳" => $row['PTB_' . $suikeiYear],
        ];
        $array0[] = $array;
        $response = $array0;
    }
} else {
    //一致データなし
    $response = array('error' => 'nodata');
}
echo json_encode($response);
?>

