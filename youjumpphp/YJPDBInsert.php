<?php
	list($user,$url,$t,$des,$start,$likes)=explode("&",file_get_contents("php://input"));
	$servername="localhost";
	$username="root";
	$password="123456789";
	$DBname="youtube_urls";
	$tablename="youjumpuserurldb";
	$conn = new mysqli($servername, $username, $password, $DBname);
// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
} 

$sql = "SELECT * FROM $tablename WHERE (url like '$url') AND (user like '$user')";
$result = $conn->query($sql);
if(!$result)
{
	echo "error in db";
	die();
}
if ($result->num_rows > 0) {
    // output data of each row
    $sql = "UPDATE $tablename SET urltime='$t', description='$des', start='$start', likes='$likes' WHERE url like '$url' AND user like '$user'";

if ($conn->query($sql) === TRUE) {
    echo "Record updated successfully";
} else {
    echo "Error updating record: " . $conn->error;
}
} else {
    $sql = "INSERT INTO $tablename (user, url, urltime, description, start, likes)
VALUES ('$user','$url','$t','$des','$start','$likes')";

if (mysqli_query($conn, $sql)) {
    echo "New record created successfully";
} else {
    echo "Error: " . $sql . "<br>" . mysqli_error($conn);
}

}

mysqli_close($conn);
?>