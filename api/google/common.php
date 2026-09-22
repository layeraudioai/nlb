<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'cookie_samesite' => 'Lax',
    ]);
}

function app_config(): array
{
    static $config;
    if ($config !== null) {
        return $config;
    }

    $config = [];
    $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    $cwd = getcwd() ?: '';
    $paths = array_unique(array_filter([
        __DIR__ . '/config.php',
        dirname(__DIR__) . '/config.php',
        dirname(dirname(__DIR__)) . '/config.php',
        $cwd . '/config.php',
        $docRoot ? $docRoot . '/config.php' : '',
    ]));

    foreach ($paths as $path) {
        if (is_file($path)) {
            $loaded = @include $path;
            if (is_array($loaded)) {
                $config = $loaded;
                break;
            }
        }
    }
    return $config;
}

function get_config(string $name, ?string $default = null): ?string
{
    $config = app_config();
    if (isset($config[$name]) && $config[$name] !== '') {
        return (string)$config[$name];
    }
    $val = getenv($name);
    if ($val !== false && $val !== '') {
        return (string)$val;
    }
    if (isset($_ENV[$name]) && $_ENV[$name] !== '') {
        return (string)$_ENV[$name];
    }
    if (isset($_SERVER[$name]) && $_SERVER[$name] !== '') {
        return (string)$_SERVER[$name];
    }
    return $default;
}

function auto_detect_app_url(): string
{
    $custom = get_config('APP_URL');
    if ($custom) {
        return $custom;
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $protocol = $isHttps ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
    return "{$protocol}://{$host}{$script}";
}

function auto_detect_redirect_uri(): string
{
    $custom = get_config('GOOGLE_OAUTH_REDIRECT_URI');
    if ($custom) {
        return $custom;
    }
    $appUrl = auto_detect_app_url();
    if (strpos($appUrl, '.php') !== false) {
        return $appUrl . '?api=google/callback.php';
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $protocol = $isHttps ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
    return "{$protocol}://{$host}/api/google/callback.php";
}

function env_required(string $name): string
{
    $value = get_config($name);
    if (!$value) {
        json_response([
            'error' => [
                'message' => "Missing server configuration: {$name}. Please set it in config.php on the server."
            ]
        ], 503);
    }
    return $value;
}

function json_response(array $payload, int $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload);
    exit;
}

function google_request(string $url, string $method = 'GET', ?string $token = null, ?array $body = null): array
{
    if (!function_exists('curl_init')) {
        json_response(['error' => 'PHP cURL extension is not enabled on this host.'], 500);
    }

    $headers = ['Accept: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_POSTFIELDS => $body === null ? null : json_encode($body),
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        json_response(['error' => "Google request failed: {$error}"], 502);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(['error' => 'Google returned an invalid response.', 'raw' => $raw], 502);
    }
    if ($status >= 400) {
        $message = $data['error']['message'] ?? "Google returned HTTP {$status}.";
        json_response(['error' => $message, 'details' => $data], $status);
    }
    return $data;
}

function require_google_session(): array
{
    if (empty($_SESSION['google'])) {
        json_response(['error' => 'Google account is not connected.'], 401);
    }
    return $_SESSION['google'];
}

function mask_google_key(string $key): string
{
    return strlen($key) > 8 ? substr($key, 0, 4) . '...' . substr($key, -4) : '****';
}
