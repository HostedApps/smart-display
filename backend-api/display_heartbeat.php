<?php
/**
 * Kiosk heartbeat (fleet telemetry).
 *
 * POST { token, client: {...}, thumbnail?: "data:image/jpeg;base64,..." }
 *   -> { success: true, server_time: ISO8601 [, thumbnail: "stored"|"rejected"] [, throttled: true] }
 *
 * Auth: X-Device-Token of a device paired to that display, or the owner's Bearer token.
 * Writes are throttled to one per 10 s per display (extra heartbeats are accepted but not stored).
 * Requires database/migrations/migration_fleet_telemetry.sql; without it the heartbeat still
 * succeeds and only refreshes devices.last_ping.
 */
require_once 'db.php';

const HB_MAX_BODY_BYTES = 2097152;      // whole request body (2 MB)
const HB_MAX_THUMBNAIL_CHARS = 409600;  // 400 KB data URL
const HB_MIN_INTERVAL_S = 10;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

$headers = getallheaders();
$deviceTokenHeader = trim((string)($headers['X-Device-Token'] ?? $headers['x-device-token'] ?? ''));
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$hasBearer = (bool)preg_match('/Bearer\s(\S+)/', $authHeader);

if ($deviceTokenHeader === '' && !$hasBearer) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit();
}

$raw = file_get_contents('php://input', false, null, 0, HB_MAX_BODY_BYTES + 1);
if ($raw !== false && strlen($raw) > HB_MAX_BODY_BYTES) {
    http_response_code(413);
    echo json_encode(["error" => "Heartbeat payload too large"]);
    exit();
}
$input = json_decode((string)$raw, true);
$rawToken = is_array($input) ? ($input['token'] ?? '') : '';
$token = is_string($rawToken) ? preg_replace('/[^a-zA-Z0-9_\-]/', '', $rawToken) : '';
if ($token === '' || $token !== $rawToken) {
    http_response_code(400);
    echo json_encode(["error" => "A valid display token is required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id, user_id FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        http_response_code(404);
        echo json_encode(["error" => "Display not found"]);
        exit();
    }
    $displayId = (int)$display['id'];

    // Device token for this display, or the display owner
    $deviceId = null;
    if ($deviceTokenHeader !== '') {
        $devStmt = $pdo->prepare("SELECT id FROM devices WHERE display_id = ? AND device_token = ?");
        $devStmt->execute([$displayId, $deviceTokenHeader]);
        $dev = $devStmt->fetch();
        if ($dev) {
            $deviceId = (int)$dev['id'];
        }
    }
    $isAuthorized = $deviceId !== null;
    if (!$isAuthorized && $hasBearer) {
        $user = getAuthenticatedUser($pdo);
        $isAuthorized = $user && (int)$user['id'] === (int)$display['user_id'];
    }
    if (!$isAuthorized) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized access to display"]);
        exit();
    }

    // A heartbeat without a client object keeps the previously reported client info
    $clientJson = is_array($input['client'] ?? null)
        ? json_encode(hbSanitizeClient($input['client']), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        : null;

    // Thumbnail: optional, never fails the heartbeat
    $thumbnail = null;
    $thumbStatus = null;
    if (isset($input['thumbnail']) && $input['thumbnail'] !== null && $input['thumbnail'] !== '') {
        $t = $input['thumbnail'];
        if (is_string($t) && strlen($t) <= HB_MAX_THUMBNAIL_CHARS
            && preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$#', $t, $tm)
            && base64_decode($tm[2], true) !== false) {
            $thumbnail = $t;
        } else {
            $thumbStatus = 'rejected';
        }
    }

    $response = ["success" => true];
    $throttled = false;

    try {
        $ageStmt = $pdo->prepare("SELECT TIMESTAMPDIFF(SECOND, last_seen_at, NOW()) AS seen_age, TIMESTAMPDIFF(SECOND, thumbnail_at, NOW()) AS thumb_age, UNIX_TIMESTAMP() AS now_unix FROM displays WHERE id = ?");
        $ageStmt->execute([$displayId]);
        $ages = $ageStmt->fetch();
        $response['server_time'] = fleetIsoFromUnix($ages['now_unix']);

        // updated_at = updated_at: telemetry must not bump the layout config_version
        if ($ages['seen_age'] !== null && (int)$ages['seen_age'] < HB_MIN_INTERVAL_S) {
            $throttled = true;
        } else {
            $upd = $pdo->prepare("UPDATE displays SET last_seen_at = NOW(), client_info_json = COALESCE(?, client_info_json), updated_at = updated_at WHERE id = ?");
            $upd->execute([$clientJson, $displayId]);
            if ($deviceId !== null) {
                $devUpd = $pdo->prepare("UPDATE devices SET last_seen_at = NOW(), last_ping = NOW(), client_info_json = COALESCE(?, client_info_json) WHERE id = ?");
                $devUpd->execute([$clientJson, $deviceId]);
            }
        }

        if ($thumbnail !== null) {
            if ($ages['thumb_age'] !== null && (int)$ages['thumb_age'] < HB_MIN_INTERVAL_S) {
                $thumbStatus = 'throttled';
            } else {
                $thUpd = $pdo->prepare("UPDATE displays SET thumbnail_data = ?, thumbnail_at = NOW(), updated_at = updated_at WHERE id = ?");
                $thUpd->execute([$thumbnail, $displayId]);
                $thumbStatus = 'stored';
            }
        }
    } catch (\PDOException $e) {
        // Telemetry migration not applied: keep the legacy device ping working
        if ($deviceId !== null) {
            $pdo->prepare("UPDATE devices SET last_ping = NOW() WHERE id = ?")->execute([$deviceId]);
        }
        $response['server_time'] = gmdate('Y-m-d\TH:i:s\Z');
        if ($thumbnail !== null) {
            $thumbStatus = 'rejected';
        }
    }

    if ($thumbStatus !== null) {
        $response['thumbnail'] = $thumbStatus;
    }
    if ($throttled) {
        $response['throttled'] = true;
    }
    echo json_encode($response);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Heartbeat failed: " . $e->getMessage()]);
}

/** Whitelist + clamp the kiosk's self-reported client info. */
function hbSanitizeClient(array $c): array {
    $str = function ($v, $max) {
        if (!is_scalar($v) || is_bool($v)) return null;
        $s = preg_replace('/[\x00-\x1F\x7F]/u', '', strip_tags(trim((string)$v)));
        return $s === null || $s === '' ? null : mb_substr($s, 0, $max);
    };
    $int = function ($v, $min, $max) {
        if (!is_numeric($v)) return null;
        return (int)max($min, min($max, (int)round((float)$v)));
    };
    $num = function ($v, $min, $max, $dp) {
        if (!is_numeric($v)) return null;
        $f = (float)$v;
        if (!is_finite($f)) return null;
        return round(max($min, min($max, $f)), $dp);
    };
    $bool = function ($v) {
        return is_bool($v) ? $v : (is_numeric($v) ? ((int)$v !== 0) : false);
    };
    return [
        'app_version' => $str($c['app_version'] ?? null, 40),
        'screen_w' => $int($c['screen_w'] ?? null, 0, 20000),
        'screen_h' => $int($c['screen_h'] ?? null, 0, 20000),
        'viewport_w' => $int($c['viewport_w'] ?? null, 0, 20000),
        'viewport_h' => $int($c['viewport_h'] ?? null, 0, 20000),
        'dpr' => $num($c['dpr'] ?? null, 0, 10, 2),
        'user_agent' => $str($c['user_agent'] ?? null, 300),
        'platform' => $str($c['platform'] ?? null, 60),
        'uptime_s' => $int($c['uptime_s'] ?? null, 0, 315360000),
        'perf_mode' => $bool($c['perf_mode'] ?? false),
        'heap_mb' => $num($c['heap_mb'] ?? null, 0, 1000000, 1),
        'online' => $bool($c['online'] ?? false),
        'page_index' => $int($c['page_index'] ?? null, 0, 1000),
        'sleeping' => $bool($c['sleeping'] ?? false),
    ];
}
