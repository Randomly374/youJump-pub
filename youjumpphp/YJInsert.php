<?php
	$servername="localhost";
	$username="root";
	$password="123456789";
	$DBname="youtube_urls";
	$tablename="YouJumpDB";
	$url=$_POST["url"];
	$t=$_POST["t"];
	$des=$_POST["des"];
	$start=$_POST["start"];
	$conn = new mysqli($servername, $username, $password,$DBname);
// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
} 

$sql = "SELECT * FROM $tablename where url like '$url' ";
$result = $conn->query($sql);
if(!$result)
{
	echo "error in db";
	die();
}
if ($result->num_rows > 0) {
    // output data of each row
    $sql = "UPDATE $tablename SET urltime='$t', description='$des', start='$start' WHERE url='$url'";

if ($conn->query($sql) === TRUE) {
    echo "Record updated successfully";
} else {
    echo "Error updating record: " . $conn->error;
}
} else {
    $sql = "INSERT INTO $tablename (url, urltime, description,start)
VALUES ('$url','$t','$des','$start')";

if (mysqli_query($conn, $sql)) {
    echo "New record created successfully";
} else {
    echo "Error: " . $sql . "<br>" . mysqli_error($conn);
}

}

mysqli_close($conn);
?>