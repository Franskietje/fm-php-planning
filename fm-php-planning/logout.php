<?php
$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params(['lifetime' => 0,'path' => '/', 'secure' => $isHttps,'httponly' => true, 'samesite' => 'None']);

session_start();
session_destroy();
?>
<!DOCTYPE html>
<html>
<head>
    <title>Logging out...</title>
</head>
<body>
    <p>Je bent uitgelogd...</p>
    <p>Je mag dit venster sluiten.</p>
    <script>window.close();</script>
</body>
</html>
