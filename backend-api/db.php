<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Lightweight, zero-dependency environment loader.
 * Searches in order of priority:
 * 1. Outside web root: dirname(__DIR__, 2) . '/.env' or dirname(__DIR__) . '/.env'
 * 2. Current directory: __DIR__ . '/.env'
 */
function loadEnvironmentVariables() {
    $candidates = [
        dirname(__DIR__, 2) . '/.env',
        dirname(__DIR__) . '/.env',
        __DIR__ . '/.env'
    ];

    foreach ($candidates as $file) {
        if (file_exists($file) && is_readable($file)) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || str_starts_with($line, '#')) {
                    continue;
                }
                if (strpos($line, '=') !== false) {
                    list($key, $val) = explode('=', $line, 2);
                    $key = trim($key);
                    $val = trim($val);
                    if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                        (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                        $val = substr($val, 1, -1);
                    }
                    if (!empty($key)) {
                        putenv("{$key}={$val}");
                        $_ENV[$key] = $val;
                        $_SERVER[$key] = $val;
                    }
                }
            }
            break;
        }
    }
}
loadEnvironmentVariables();

function getEnvValue($key, $default = '') {
    $val = getenv($key);
    if ($val !== false && $val !== '') return $val;
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') return $_ENV[$key];
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') return $_SERVER[$key];
    return $default;
}

$host = getEnvValue('DB_HOST', 'localhost');
$db   = getEnvValue('DB_NAME', 'u528878684_smart_display');
$user = getEnvValue('DB_USER', 'u528878684_smart_user');
$pass = getEnvValue('DB_PASS', '');
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit();
}

function getClientIp() {
    return $_SERVER['HTTP_CF_CONNECTING_IP'] 
        ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
        ?? $_SERVER['REMOTE_ADDR'] 
        ?? '127.0.0.1';
}

function checkRateLimit($pdo, $action, $maxAttempts = 10, $windowSeconds = 60) {
    $ip = getClientIp();
    $rateKey = $action . ':' . md5($ip);
    $now = time();

    try {
        $stmt = $pdo->prepare("SELECT hits, expires_at FROM rate_limits WHERE rate_key = ?");
        $stmt->execute([$rateKey]);
        $record = $stmt->fetch();

        if ($record) {
            if ($record['expires_at'] < $now) {
                $up = $pdo->prepare("UPDATE rate_limits SET hits = 1, expires_at = ? WHERE rate_key = ?");
                $up->execute([$now + $windowSeconds, $rateKey]);
                return true;
            } else {
                if ((int)$record['hits'] >= $maxAttempts) {
                    http_response_code(429);
                    echo json_encode([
                        "error" => "Too many requests. Please wait a moment and try again.",
                        "retry_after_seconds" => max(1, $record['expires_at'] - $now)
                    ]);
                    exit();
                }
                $up = $pdo->prepare("UPDATE rate_limits SET hits = hits + 1 WHERE rate_key = ?");
                $up->execute([$rateKey]);
                return true;
            }
        } else {
            $ins = $pdo->prepare("INSERT INTO rate_limits (rate_key, hits, expires_at) VALUES (?, 1, ?)");
            $ins->execute([$rateKey, $now + $windowSeconds]);
            return true;
        }
    } catch (\Exception $e) {
        return true;
    }
}

function isSafeExternalUrl($url) {
    if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
        return false;
    }

    $parsed = parse_url($url);
    $scheme = strtolower($parsed['scheme'] ?? '');
    if (!in_array($scheme, ['http', 'https'])) {
        return false;
    }

    $host = strtolower($parsed['host'] ?? '');
    if (empty($host) || $host === 'localhost' || str_ends_with($host, '.local') || str_ends_with($host, '.internal')) {
        return false;
    }

    // Trusted public API & content providers bypass DNS resolution checks
    $trustedDomains = [
        'photos.app.goo.gl', 'photos.google.com', 'drive.google.com',
        'googleusercontent.com', 'google.com', 'goo.gl',
        'yahoo.com', 'coingecko.com', 'openweathermap.org',
        'unsplash.com', 'githubusercontent.com'
    ];
    foreach ($trustedDomains as $td) {
        if ($host === $td || str_ends_with($host, '.' . $td)) {
            return true;
        }
    }

    $ip = gethostbyname($host);
    if (!$ip || $ip === $host) {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ip = $host;
        }
    }

    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return false;
    }

    $long = ip2long($ip);
    if ($long === false) {
        if ($ip === '::1' || str_starts_with($ip, 'fc') || str_starts_with($ip, 'fd') || str_starts_with($ip, 'fe80')) {
            return false;
        }
        return true;
    }

    // Block Loopback, Private RFC1918, Link-local/Cloud Metadata, Broadcast
    if (($long & 0xFF000000) === 0x7F000000) return false; // 127.0.0.0/8
    if (($long & 0xFF000000) === 0x0A000000) return false; // 10.0.0.0/8
    if (($long & 0xFFF00000) === 0xAC100000) return false; // 172.16.0.0/12
    if (($long & 0xFFFF0000) === 0xC0A80000) return false; // 192.168.0.0/16
    if (($long & 0xFFFF0000) === 0xA9FE0000) return false; // 169.254.0.0/16
    if (($long & 0xFF000000) === 0x00000000) return false; // 0.0.0.0/8

    return true;
}

function sanitizeText($text) {
    if ($text === null) return '';
    return htmlspecialchars(strip_tags(trim($text)), ENT_QUOTES, 'UTF-8');
}

function logUserActivity($pdo, $userId, $userEmail, $action, $details = []) {
    try {
        $ip = getClientIp();
        $detailsJson = !empty($details) ? json_encode($details, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null;
        $stmt = $pdo->prepare("INSERT INTO user_activity_logs (user_id, user_email, action, details, ip_address) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $userEmail, $action, $detailsJson, $ip]);
    } catch (\Exception $e) {
        // Silently catch logging errors to never disrupt main user flows
    }
}

