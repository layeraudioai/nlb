<?php
declare(strict_types=1);
require __DIR__ . '/google/common.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => ['message' => 'POST required.']]);
    exit;
}

$apiKey = env_required('GUEST_GEMINI_API_KEY');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Guest Gemini service is not configured.']]);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$prompt = is_array($payload) ? trim((string)($payload['prompt'] ?? '')) : '';

if ($prompt === '' || strlen($prompt) > 20000) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Prompt is required and must be 20,000 characters or less.']]);
    exit;
}

$ch = curl_init(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' .
    rawurlencode($apiKey)
);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => [
            'temperature' => 0.2,
            'maxOutputTokens' => 2500,
        ],
    ]),
    CURLOPT_TIMEOUT => 90,
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => ['message' => 'Guest Gemini request failed: ' . $error]]);
    exit;
}

http_response_code($status >= 400 ? $status : 200);
echo $response;
