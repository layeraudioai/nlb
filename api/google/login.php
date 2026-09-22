<?php
declare(strict_types=1);
require __DIR__ . '/common.php';

$clientId = get_config('GOOGLE_OAUTH_CLIENT_ID');
$redirectUri = auto_detect_redirect_uri();
$appUrl = auto_detect_app_url();

if (!$clientId) {
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Google OAuth Setup</title><style>*{box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;max-width:560px;width:100%;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);}h2{color:#38bdf8;margin-top:0;font-size:1.4rem;}p{font-size:0.9rem;color:#94a3b8;line-height:1.6;}code{background:#090d16;color:#38bdf8;padding:3px 6px;border-radius:6px;font-size:0.85rem;}pre{background:#090d16;border:1px solid #334155;padding:16px;border-radius:10px;font-size:0.8rem;color:#e2e8f0;overflow-x:auto;line-height:1.5;}.btn{display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.9rem;margin-top:16px;}.btn:hover{background:#0369a1;}</style></head><body><div class="card"><h2>Google OAuth Configuration Required</h2><p>Google Account tethering requires OAuth credentials. Place a <code>config.php</code> file in the same folder as your <code>index.php</code>:</p><pre>&lt;?php
return [
    \'GOOGLE_OAUTH_CLIENT_ID\' => \'your-client-id.apps.googleusercontent.com\',
    \'GOOGLE_OAUTH_CLIENT_SECRET\' => \'your-client-secret\',
    \'GOOGLE_CLOUD_PROJECT_ID\' => \'your-gcp-project-id\',
    \'GUEST_GEMINI_API_KEY\' => \'your-gemini-key\',
];</pre><p>In Google Cloud Console, add this exact redirect URI under <b>Authorized redirect URIs</b>:<br><br><code>' . htmlspecialchars($redirectUri) . '</code></p><a class="btn" href="' . htmlspecialchars($appUrl) . '">&larr; Return to Builder</a></div></body></html>';
    exit;
}

$state = bin2hex(random_bytes(32));
$_SESSION['oauth_state'] = $state;

$query = http_build_query([
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'response_type' => 'code',
    'scope' => 'openid email profile https://www.googleapis.com/auth/cloud-platform',
    'access_type' => 'offline',
    'prompt' => 'select_account',
    'state' => $state,
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $query, true, 302);
exit;
