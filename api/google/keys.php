<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

$google = require_google_session();
$project = env_required('GOOGLE_CLOUD_PROJECT_ID');
$data = google_request(
    'https://apikeys.googleapis.com/v2/projects/' . rawurlencode($project) . '/locations/global/keys',
    'GET',
    $google['access_token']
);

$keys = [];
foreach (($data['keys'] ?? []) as $key) {
    $keys[] = [
        'name' => $key['name'] ?? '',
        'displayName' => $key['displayName'] ?? '',
        'uid' => $key['uid'] ?? '',
        'createTime' => $key['createTime'] ?? '',
        'state' => $key['state'] ?? '',
        'keyString' => isset($key['keyString']) ? mask_google_key($key['keyString']) : null,
    ];
}
json_response(['keys' => $keys]);
