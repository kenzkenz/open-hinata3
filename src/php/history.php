<?php
require_once "pwd.php";
$event = $_GET["event"];
$screen = $_GET["screen"];
$ua = $_GET["ua"];
$referrer = $_GET["referrer"];
$url = $_GET["url"];
$uid = $_GET["uid"];
$address = $_GET["address"];

if (!$url){
    $url = "";
};

$mysql = "INSERT INTO history(event,screen,ua,referrer,url,uid,address) values (?,?,?,?,?,?,?)";
$stmt = $pdo->prepare($mysql);
$stmt->execute(array($event,$screen,$ua,$referrer,$url,$uid,$address));
//$response = array('layer' => $layer);
//echo json_encode($response);
?>
