<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

$state = (string)($_GET['state'] ?? '');
if (!$state || !hash_equals((string)($_SESSION['oauth_state'] ?? ''), $state)) {
    json_response(['error' => 'Invalid OAuth state.'], 400);
}
unset($_SESSION['oauth_state']);

$code = (string)($_GET['code'] ?? '');
if (!$code) {
    json_response(['error' => 'Google authorization was not completed.'], 400);
}

$token = google_request('https://oauth2.googleapis.com/token', 'POST', null, [
    'code' => $code,
    'client_id' => env_required('GOOGLE_OAUTH_CLIENT_ID'),
    'client_secret' => env_required('GOOGLE_OAUTH_CLIENT_SECRET'),
    'redirect_uri' => env_required('GOOGLE_OAUTH_REDIRECT_URI'),
    'grant_type' => 'authorization_code',
]);

$profile = google_request('https://openidconnect.googleapis.com/v1/userinfo', 'GET', $token['access_token']);
$_SESSION['google'] = [
    'id' => (string)$profile['sub'],
    'email' => (string)($profile['email'] ?? ''),
    'name' => (string)($profile['name'] ?? ''),
    'avatarUrl' => (string)($profile['picture'] ?? ''),
    'access_token' => (string)$token['access_token'],
    'refresh_token' => (string)($token['refresh_token'] ?? ''),
    'expires_at' => time() + (int)($token['expires_in'] ?? 3600),
];

header('Location: ' . env_required('APP_URL'), true, 302);
exit;
