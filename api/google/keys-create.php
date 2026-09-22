<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'POST required.'], 405);
}
$google = require_google_session();
$body = json_decode(file_get_contents('php://input'), true);
$displayName = trim((string)($body['displayName'] ?? 'nlbasic key'));
if ($displayName === '' || strlen($displayName) > 100) {
    json_response(['error' => 'A display name between 1 and 100 characters is required.'], 400);
}

$project = env_required('GOOGLE_CLOUD_PROJECT_ID');
$operation = google_request(
    'https://apikeys.googleapis.com/v2/projects/' . rawurlencode($project) . '/locations/global/keys',
    'POST',
    $google['access_token'],
    ['displayName' => $displayName]
);
json_response(['operation' => $operation], 202);
