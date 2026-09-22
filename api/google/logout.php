<?php
declare(strict_types=1);
require __DIR__ . '/common.php';
$_SESSION = [];
session_destroy();
json_response(['ok' => true]);
