<?php
require_once "pwd.php";
$event = $_GET["event"];
$screen = $_GET["screen"];
$ua = $_GET["ua"];
$referrer = $_GET["referrer"];
$url = $_GET["url"];
$uid = $_GET["uid"];
$address = $_GET["address"];
$thumbnail = $_GET["thumbnail"];

if (!$url){
    $url = "";
};

//$mysql = "INSERT INTO history(event,screen,ua,referrer,url,uid,address) values (?,?,?,?,?,?,?)";
//$stmt = $pdo->prepare($mysql);
//$stmt->execute(array($event,$screen,$ua,$referrer,$url,$uid,$address));

$mysql = "INSERT INTO history(event,screen,ua,referrer,url,uid,address,thumbnail) values (?,?,?,?,?,?,?,?)";
$stmt = $pdo->prepare($mysql);
$stmt->execute(array($event,$screen,$ua,$referrer,$url,$uid,$address,$thumbnail));


?>
