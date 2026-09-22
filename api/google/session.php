<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

if (empty($_SESSION['google'])) {
    json_response(['authenticated' => false]);
}
$google = $_SESSION['google'];
json_response([
    'authenticated' => true,
    'user' => [
        'id' => $google['id'],
        'email' => $google['email'],
        'name' => $google['name'],
        'avatarUrl' => $google['avatarUrl'],
        'tetheredAt' => 0,
    ],
]);
