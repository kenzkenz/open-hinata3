<?php
require_once "pwd.php";

$MESH_ID = $_GET["MESH_ID"];
$azaCode = $_GET["azaCode"];

$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
$mysql = "SELECT * FROM suikei1km WHERE MESH_ID = ?";
$stmt = $pdo->prepare($mysql);
$stmt->execute(array($MESH_ID));
$count = $stmt->rowCount();
$array0 = array();
if ($count > 0) {
    foreach ($stmt as $row) {
        $array = [
//            "秘匿処理" => $row['秘匿処理'],
            "総数" => $row['PTN_2050'],

            "男0～4歳" => $row['PM1_2050'],
            "男5～9歳" => $row['PM2_2050'],
            "男10～14歳" => $row['PM3_2050'],
            "男15～19歳" => $row['PM4_2050'],
            "男20～24歳" => $row['PM5_2050'],
            "男25～29歳" => $row['PM6_2050'],
            "男30～34歳" => $row['PM7_2050'],
            "男35～39歳" => $row['PM8_2050'],
            "男40～44歳" => $row['PM9_2050'],
            "男45～49歳" => $row['PM10_2050'],
            "男50～54歳" => $row['PM11_2050'],
            "男55～59歳" => $row['PM12_2050'],
            "男60～64歳" => $row['PM13_2050'],
            "男65～69歳" => $row['PM14_2050'],
            "男70～74歳" => $row['PM15_2050'],
            "男75～79歳" => $row['PM16_2050'],
            "男80～84歳" => $row['PM17_2050'],
            "男85～89歳" => $row['PM18_2050'],
            "男90歳以上" => $row['PM19_2050'],

            "女0～4歳" => $row['PF1_2050'],
            "女5～9歳" => $row['PF2_2050'],
            "女10～14歳" => $row['PF3_2050'],
            "女15～19歳" => $row['PF4_2050'],
            "女20～24歳" => $row['PF5_2050'],
            "女25～29歳" => $row['PF6_2050'],
            "女30～34歳" => $row['PF7_2050'],
            "女35～39歳" => $row['PF8_2050'],
            "女40～44歳" => $row['PF9_2050'],
            "女45～49歳" => $row['PF10_2050'],
            "女50～54歳" => $row['PF11_2050'],
            "女55～59歳" => $row['PF12_2050'],
            "女60～64歳" => $row['PF13_2050'],
            "女65～69歳" => $row['PF14_2050'],
            "女70～74歳" => $row['PF15_2050'],
            "女75～79歳" => $row['PF16_2050'],
            "女80～84歳" => $row['PF17_2050'],
            "女85～89歳" => $row['PF18_2050'],
            "女90歳以上" => $row['PF19_2050'],

            "65歳以上" => $row['PTC_2050'],
            "15歳未満" => $row['PTA_2050'],
            "15～64歳" => $row['PTB_2050'],

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

