<?php
$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params(['lifetime' => 0,'path' => '/', 'secure' => $isHttps,'httponly' => true, 'samesite' => 'None']);

session_start();

if (!isset($_SESSION['fm_token'])) 
{
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Not logged in']);
    exit;
}