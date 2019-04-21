<?php
	$servername="localhost";
	$username="root";
	$password="123456789";
	$DBname="youtube_urls";
	$tablename="YouJumpDB";
	$url=$_POST["url"];
	$conn = new mysqli($servername, $username, $password,$DBname);
	if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
} 

$sql = "SELECT urltime, description, start FROM $tablename where url like '$url' ";
$result = $conn->query($sql);
if(!$result)
{
	echo "error in db";
	die();
}
if($result->num_rows > 0){
	$row= $result->fetch_assoc();
	echo $row["urltime"] . "$" . $row["description"] . "$" . $row["start"];
}
else{
	echo "-1$-1$-1";
}
mysqli_close($conn);
?>