<?php
require_once 'db.php';



$user = getAuthenticatedUser($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized - Invalid or missing session"]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// GET ?action=thumbnail&id=N: latest kiosk screenshot for one owned display
if ($method === 'GET' && ($_GET['action'] ?? '') === 'thumbnail') {
    $rawId = $_GET['id'] ?? '';
    if (!is_string($rawId) || !ctype_digit($rawId) || (int)$rawId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Display ID is required"]);
        exit();
    }
    try {
        $stmt = $pdo->prepare("SELECT thumbnail_data, UNIX_TIMESTAMP(thumbnail_at) AS thumbnail_unix FROM displays WHERE id = ? AND user_id = ? AND thumbnail_data IS NOT NULL");
        $stmt->execute([(int)$rawId, $user['id']]);
        $row = $stmt->fetch();
    } catch (\Exception $e) {
        $row = false; // telemetry migration not applied: no thumbnails yet
    }
    if (!$row) {
        http_response_code(404);
        echo json_encode(["error" => "No thumbnail available"]);
        exit();
    }
    echo json_encode([
        "success" => true,
        "data_url" => $row['thumbnail_data'],
        "thumbnail_at" => fleetIsoFromUnix($row['thumbnail_unix'])
    ]);
    exit();
}

// GET: List all displays owned by this user (with fleet presence)
if ($method === 'GET') {
    $baseSelect = "
                d.id, 
                d.token, 
                d.name, 
                d.theme, 
                d.orientation, 
                d.refresh_interval,
                d.logo_url,
                d.show_logo_kiosk,
                d.created_at,
                (SELECT COUNT(*) FROM widgets WHERE display_id = d.id) as widget_count,
                (SELECT COUNT(*) FROM devices WHERE display_id = d.id) as device_count";
    try {
        try {
            $stmt = $pdo->prepare("
                SELECT $baseSelect,
                    UNIX_TIMESTAMP(d.last_seen_at) AS last_seen_unix,
                    TIMESTAMPDIFF(SECOND, d.last_seen_at, NOW()) AS seen_age,
                    d.client_info_json,
                    UNIX_TIMESTAMP(d.thumbnail_at) AS thumbnail_unix,
                    (d.thumbnail_data IS NOT NULL) AS has_thumbnail
                FROM displays d
                WHERE d.user_id = ?
                ORDER BY d.id DESC
            ");
            $stmt->execute([$user['id']]);
        } catch (\PDOException $e) {
            // Telemetry migration not applied: list without presence data
            $stmt = $pdo->prepare("SELECT $baseSelect FROM displays d WHERE d.user_id = ? ORDER BY d.id DESC");
            $stmt->execute([$user['id']]);
        }
        $displays = $stmt->fetchAll();
        $serverTime = fleetIsoFromUnix($pdo->query("SELECT UNIX_TIMESTAMP()")->fetchColumn());

        echo json_encode([
            "success" => true,
            "server_time" => $serverTime,
            "displays" => array_map(function($d) {
                $client = !empty($d['client_info_json']) ? json_decode($d['client_info_json'], true) : null;
                return [
                    "id" => (int)$d['id'],
                    "token" => $d['token'],
                    "name" => $d['name'],
                    "theme" => $d['theme'],
                    "orientation" => $d['orientation'] ?? 'landscape_720p',
                    "refresh_interval" => (int)($d['refresh_interval'] ?? 60),
                    "logo_url" => $d['logo_url'],
                    "show_logo_kiosk" => (bool)($d['show_logo_kiosk'] ?? false),
                    "widget_count" => (int)$d['widget_count'],
                    "device_count" => (int)$d['device_count'],
                    "created_at" => $d['created_at'],
                    "last_seen_at" => fleetIsoFromUnix($d['last_seen_unix'] ?? null),
                    "status" => fleetStatusFromAge($d['seen_age'] ?? null),
                    "client" => is_array($client) ? $client : null,
                    "thumbnail_at" => fleetIsoFromUnix($d['thumbnail_unix'] ?? null),
                    "has_thumbnail" => (bool)($d['has_thumbnail'] ?? false)
                ];
            }, $displays)
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch displays: " . $e->getMessage()]);
    }
    exit();
}

// POST {action:'copy_layout'|'duplicate'}: fleet layout tools
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }
    $postAction = $input['action'] ?? '';
    if ($postAction === 'copy_layout') {
        handleCopyLayout($pdo, (int)$user['id'], $input);
        exit();
    }
    if ($postAction === 'duplicate') {
        handleDuplicate($pdo, (int)$user['id'], $input);
        exit();
    }
    if ($postAction !== '' && $postAction !== null) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid display action"]);
        exit();
    }
}

// POST: Create a new display profile
if ($method === 'POST') {
    $name = trim($input['name'] ?? 'New Smart Display');
    $orientation = $input['orientation'] ?? 'landscape_720p';
    $theme = $input['theme'] ?? 'dark';

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["error" => "Display name is required"]);
        exit();
    }

    try {
        $displayToken = generateDisplayToken($name);

        $defaultPages = json_encode([
            ["id" => "default", "name" => "Main Dashboard", "duration_seconds" => 30]
        ]);
        $defaultBg = json_encode([
            "type" => "gradient",
            "value" => "linear-gradient(135deg, #090d16 0%, #111827 100%)"
        ]);

        $stmt = $pdo->prepare("
            INSERT INTO displays (user_id, token, name, theme, orientation, refresh_interval, background_json, pages_json)
            VALUES (?, ?, ?, ?, ?, 60, ?, ?)
        ");
        $stmt->execute([$user['id'], $displayToken, $name, $theme, $orientation, $defaultBg, $defaultPages]);
        $displayId = (int)$pdo->lastInsertId();

        // Seed basic clock & weather widgets
        $isPortrait = strpos($orientation, 'portrait') !== false;
        $wWidth = $isPortrait ? 640 : 420;
        
        $clockPos = json_encode(["x" => 30, "y" => 30, "width" => $wWidth, "height" => 190]);
        $clockConfig = json_encode(["is24Hour" => false, "showSeconds" => true, "showDate" => true]);
        
        $weatherPos = json_encode(["x" => $isPortrait ? 30 : 470, "y" => $isPortrait ? 240 : 30, "width" => $wWidth, "height" => 190]);
        $weatherConfig = json_encode(["city" => "New York", "units" => "imperial"]);

        $wStmt = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, config_json) VALUES (?, 'default', ?, ?, ?)");
        $wStmt->execute([$displayId, 'clock', $clockPos, $clockConfig]);
        $wStmt->execute([$displayId, 'weather', $weatherPos, $weatherConfig]);

        echo json_encode([
            "success" => true,
            "display" => [
                "id" => $displayId,
                "token" => $displayToken,
                "name" => $name,
                "orientation" => $orientation,
                "theme" => $theme
            ]
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create display: " . $e->getMessage()]);
    }
    exit();
}

// DELETE: Delete a display profile (Enforcing user ownership)
if ($method === 'DELETE') {
    $displayId = (int)($_GET['id'] ?? 0);
    if (!$displayId) {
        http_response_code(400);
        echo json_encode(["error" => "Display ID is required"]);
        exit();
    }

    try {
        // Verify user owns this display
        $checkStmt = $pdo->prepare("SELECT id FROM displays WHERE id = ? AND user_id = ?");
        $checkStmt->execute([$displayId, $user['id']]);
        if (!$checkStmt->fetch()) {
            http_response_code(403);
            echo json_encode(["error" => "Display not found or unauthorized"]);
            exit();
        }

        $delStmt = $pdo->prepare("DELETE FROM displays WHERE id = ? AND user_id = ?");
        $delStmt->execute([$displayId, $user['id']]);

        echo json_encode(["success" => true, "message" => "Display deleted successfully"]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to delete display: " . $e->getMessage()]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);


/** New random display token, same format as the create path: "<slug>-<6 hex>". */
function generateDisplayToken(string $name): string {
    $cleanSlug = preg_replace('/[^a-z0-9]/', '-', strtolower($name));
    $cleanSlug = trim($cleanSlug, '-') ?: 'screen';
    return $cleanSlug . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
}

/** Strictly parse a positive integer id (int or digit string); 0 if invalid. */
function parsePositiveId($v): int {
    if (is_int($v)) return $v > 0 ? $v : 0;
    if (is_string($v) && ctype_digit($v) && strlen($v) <= 10) return max(0, (int)$v);
    return 0;
}

/**
 * Insert copies of $sourceWidgets onto $targetId. Linked-widget references
 * (style_json._meta.linkedWidgetId) are remapped to the new ids; links that point
 * outside the copied set are dropped. Caller owns the transaction.
 */
function copyWidgetsTo(PDO $pdo, array $sourceWidgets, int $targetId): int {
    $ins = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, style_json, config_json) VALUES (?, ?, ?, ?, ?, ?)");
    $idMap = [];
    $styles = [];
    foreach ($sourceWidgets as $w) {
        $ins->execute([$targetId, $w['page_id'], $w['type'], $w['position_json'], $w['style_json'], $w['config_json']]);
        $newId = (int)$pdo->lastInsertId();
        $idMap[(int)$w['id']] = $newId;
        $styles[$newId] = $w['style_json'];
    }
    $restyle = $pdo->prepare("UPDATE widgets SET style_json = ? WHERE id = ?");
    foreach ($styles as $newId => $styleJson) {
        if (empty($styleJson)) continue;
        $style = json_decode($styleJson); // objects, so {} stays {}
        if (!is_object($style) || !isset($style->_meta) || !is_object($style->_meta) || !property_exists($style->_meta, 'linkedWidgetId')) {
            continue;
        }
        $old = $style->_meta->linkedWidgetId;
        if (is_numeric($old) && isset($idMap[(int)$old])) {
            $style->_meta->linkedWidgetId = $idMap[(int)$old];
        } else {
            unset($style->_meta->linkedWidgetId);
        }
        $restyle->execute([json_encode($style, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), $newId]);
    }
    return count($idMap);
}

function fetchSourceWidgets(PDO $pdo, int $displayId): array {
    $stmt = $pdo->prepare("SELECT id, page_id, type, position_json, style_json, config_json FROM widgets WHERE display_id = ? ORDER BY id ASC");
    $stmt->execute([$displayId]);
    return $stmt->fetchAll();
}

/** POST {action:'copy_layout', source_id, target_ids[1..50]} -> {success, copied} */
function handleCopyLayout(PDO $pdo, int $userId, array $input): void {
    $sourceId = parsePositiveId($input['source_id'] ?? null);
    $rawTargets = $input['target_ids'] ?? null;
    if (!$sourceId || !is_array($rawTargets) || count($rawTargets) < 1 || count($rawTargets) > 50) {
        http_response_code(400);
        echo json_encode(["error" => "source_id and target_ids (1-50 display ids) are required"]);
        return;
    }
    $targetIds = [];
    foreach ($rawTargets as $t) {
        $tid = parsePositiveId($t);
        if (!$tid) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid display id in target_ids"]);
            return;
        }
        $targetIds[$tid] = true;
    }
    $targetIds = array_keys($targetIds);
    if (in_array($sourceId, $targetIds, true)) {
        http_response_code(400);
        echo json_encode(["error" => "The source display cannot also be a target"]);
        return;
    }

    try {
        $allIds = array_merge([$sourceId], $targetIds);
        $placeholders = implode(',', array_fill(0, count($allIds), '?'));
        $own = $pdo->prepare("SELECT id FROM displays WHERE user_id = ? AND id IN ($placeholders)");
        $own->execute(array_merge([$userId], $allIds));
        if (count($own->fetchAll()) !== count($allIds)) {
            http_response_code(403);
            echo json_encode(["error" => "Forbidden: one or more displays were not found or are not yours."]);
            return;
        }

        $srcStmt = $pdo->prepare("SELECT theme, orientation, background_json, pages_json, sleep_schedule_json FROM displays WHERE id = ? AND user_id = ?");
        $srcStmt->execute([$sourceId, $userId]);
        $src = $srcStmt->fetch();
        $srcWidgets = fetchSourceWidgets($pdo, $sourceId);

        $upd = $pdo->prepare("UPDATE displays SET theme = ?, orientation = ?, background_json = ?, pages_json = ?, sleep_schedule_json = ? WHERE id = ? AND user_id = ?");
        $del = $pdo->prepare("DELETE FROM widgets WHERE display_id = ?");
        $copied = 0;
        foreach ($targetIds as $targetId) {
            $pdo->beginTransaction();
            try {
                $upd->execute([$src['theme'], $src['orientation'], $src['background_json'], $src['pages_json'], $src['sleep_schedule_json'], $targetId, $userId]);
                $del->execute([$targetId]);
                copyWidgetsTo($pdo, $srcWidgets, $targetId);
                $pdo->commit();
                $copied++;
            } catch (\Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(["error" => "Failed to copy layout: " . $e->getMessage(), "copied" => $copied]);
                return;
            }
        }
        echo json_encode(["success" => true, "copied" => $copied]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to copy layout: " . $e->getMessage()]);
    }
}

/** POST {action:'duplicate', id, name?} -> {success, display:{id, token, name, orientation, theme}} */
function handleDuplicate(PDO $pdo, int $userId, array $input): void {
    $sourceId = parsePositiveId($input['id'] ?? null);
    if (!$sourceId) {
        http_response_code(400);
        echo json_encode(["error" => "Display ID is required"]);
        return;
    }
    try {
        $srcStmt = $pdo->prepare("SELECT name, theme, orientation, refresh_interval, background_json, sleep_schedule_json, pages_json, logo_url, show_logo_kiosk FROM displays WHERE id = ? AND user_id = ?");
        $srcStmt->execute([$sourceId, $userId]);
        $src = $srcStmt->fetch();
        if (!$src) {
            http_response_code(403);
            echo json_encode(["error" => "Display not found or unauthorized"]);
            return;
        }

        $name = '';
        if (isset($input['name']) && is_scalar($input['name'])) {
            $name = sanitizeText((string)$input['name']);
        }
        if ($name === '') {
            $name = $src['name'] . ' (copy)';
        }
        $name = mb_substr($name, 0, 100);
        $displayToken = generateDisplayToken($name);

        $pdo->beginTransaction();
        $ins = $pdo->prepare("
            INSERT INTO displays (user_id, token, name, theme, orientation, refresh_interval, background_json, sleep_schedule_json, pages_json, logo_url, show_logo_kiosk)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $userId, $displayToken, $name, $src['theme'], $src['orientation'], $src['refresh_interval'],
            $src['background_json'], $src['sleep_schedule_json'], $src['pages_json'], $src['logo_url'],
            $src['show_logo_kiosk']
        ]);
        $newId = (int)$pdo->lastInsertId();
        copyWidgetsTo($pdo, fetchSourceWidgets($pdo, $sourceId), $newId);
        $pdo->commit();

        echo json_encode([
            "success" => true,
            "display" => [
                "id" => $newId,
                "token" => $displayToken,
                "name" => $name,
                "orientation" => $src['orientation'],
                "theme" => $src['theme']
            ]
        ]);
    } catch (\Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(["error" => "Failed to duplicate display: " . $e->getMessage()]);
    }
}
