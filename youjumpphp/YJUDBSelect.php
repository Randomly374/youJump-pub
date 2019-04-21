<?php
	list($user,$pass)=explode("&",file_get_contents("php://input"));
	$servername="localhost";
	$username="root";
	$password="123456789";
	$DBname="youtube_urls";
	$tablename="YouJumpUserDB";
	$conn = new mysqli($servername, $username, $password,$DBname);
	if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
} 

$sql = "SELECT userName FROM $tablename where (userName = '$user') AND (password = '$pass')";
$result = $conn->query($sql);
if(!$result)
{
	echo "error in db";
	die();
}
if($result->num_rows > 0){
	$row= $result->fetch_assoc();
	echo $row["userName"];
}
else{
	$sql = "SELECT userName FROM $tablename where (userName = '$user')";
	$result = $conn->query($sql);
	if(!$result)
	{
		echo "error in db";
		die();
	}if($result->num_rows > 0){
		echo "-1";
	}else{
		echo "-2";
	}
}
mysqli_close($conn);
?>