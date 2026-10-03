<?php
require_once 'db.php';



$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// 1. Kiosk Screen polls for active emergency alerts (Public via display token)
if ($method === 'GET' && empty($action)) {
    $displayToken = $_GET['token'] ?? '';
    if (empty($displayToken)) {
        http_response_code(400);
        echo json_encode(["error" => "Display token required"]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("SELECT id, user_id FROM displays WHERE token = ?");
        $stmt->execute([$displayToken]);
        $display = $stmt->fetch();

        if (!$display) {
            echo json_encode(["active" => false]);
            exit();
        }

        $displayId = (int)$display['id'];
        $userId = (int)$display['user_id'];

        // Layout version stamp: kiosks reload their config when it changes, so a
        // publish (or a push_widget / on-screen sync update) shows up within one poll.
        $configVersion = displayConfigVersion($pdo, $displayId);

        // Remote commands queued from the fleet hub (display_commands.php)
        $sinceRaw = $_GET['since'] ?? '0';
        $since = (is_string($sinceRaw) && ctype_digit($sinceRaw)) ? (int)$sinceRaw : 0;
        [$commands, $latestCommandId] = pendingDisplayCommands($pdo, $displayId, $since);

        // Check if there is an active broadcast for this specific display or for all user displays
        $alertStmt = $pdo->prepare("
            SELECT id, severity, title, message, play_sound, created_at
            FROM emergency_broadcasts
            WHERE user_id = ? 
              AND is_active = 1 
              AND (display_id IS NULL OR display_id = ?)
            ORDER BY id DESC 
            LIMIT 1
        ");
        $alertStmt->execute([$userId, $displayId]);
        $alert = $alertStmt->fetch();

        if ($alert) {
            echo json_encode([
                "active" => true,
                "config_version" => $configVersion,
                "commands" => $commands,
                "latest_command_id" => $latestCommandId,
                "broadcast" => [
                    "id" => (int)$alert['id'],
                    "severity" => $alert['severity'],
                    "title" => $alert['title'],
                    "message" => $alert['message'],
                    "play_sound" => (bool)$alert['play_sound'],
                    "created_at" => $alert['created_at']
                ]
            ]);
        } else {
            echo json_encode([
                "active" => false,
                "config_version" => $configVersion,
                "commands" => $commands,
                "latest_command_id" => $latestCommandId
            ]);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Emergency check failed: " . $e->getMessage()]);
    }
    exit();
}

// 2. Admin operations (Requires Authentication)
$user = getAuthenticatedUser($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit();
}

// POST: Trigger Emergency Broadcast
if ($method === 'POST' && empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $title = trim($input['title'] ?? 'EMERGENCY ALERT');
    $message = trim($input['message'] ?? 'Please pay attention to this urgent announcement.');
    $severity = $input['severity'] ?? 'warning'; // 'info' | 'warning' | 'critical'
    $playSound = isset($input['play_sound']) ? (int)$input['play_sound'] : 1;
    $displayId = !empty($input['display_id']) ? (int)$input['display_id'] : null;

    try {
        // Deactivate older active broadcasts for this user
        $clearOld = $pdo->prepare("UPDATE emergency_broadcasts SET is_active = 0 WHERE user_id = ?");
        $clearOld->execute([$user['id']]);

        // Insert new active emergency broadcast
        $ins = $pdo->prepare("
            INSERT INTO emergency_broadcasts (user_id, display_id, severity, title, message, play_sound, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ");
        $ins->execute([$user['id'], $displayId, $severity, $title, $message, $playSound]);

        echo json_encode([
            "success" => true,
            "message" => "Emergency broadcast transmitted across fleet successfully!"
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to trigger broadcast: " . $e->getMessage()]);
    }
    exit();
}

// POST / DELETE ?action=dismiss: Clear active broadcast
if ($action === 'dismiss' || $method === 'DELETE') {
    try {
        $stmt = $pdo->prepare("UPDATE emergency_broadcasts SET is_active = 0 WHERE user_id = ?");
        $stmt->execute([$user['id']]);

        echo json_encode([
            "success" => true,
            "message" => "Active emergency broadcasts dismissed."
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to dismiss: " . $e->getMessage()]);
    }
    exit();
}

http_response_code(400);
echo json_encode(["error" => "Invalid emergency action"]);

/**
 * Cheap fingerprint of everything that affects what a display shows.
 * Returns null if the displays.updated_at migration has not been applied yet,
 * so the emergency poll keeps working either way.
 */
function displayConfigVersion(PDO $pdo, int $displayId): ?string {
    try {
        $stmt = $pdo->prepare("
            SELECT d.updated_at AS d_updated,
                   (SELECT MAX(w.updated_at) FROM widgets w WHERE w.display_id = d.id) AS w_updated,
                   (SELECT COUNT(*) FROM widgets w WHERE w.display_id = d.id) AS w_count,
                   (SELECT COALESCE(SUM(w.id), 0) FROM widgets w WHERE w.display_id = d.id) AS w_ids
            FROM displays d WHERE d.id = ?
        ");
        $stmt->execute([$displayId]);
        $row = $stmt->fetch();
        return $row ? substr(sha1(implode('|', $row)), 0, 16) : null;
    } catch (\Exception $e) {
        return null;
    }
}

/**
 * Unexpired commands for a display with id > $since (oldest first, max 10), plus the
 * display's highest command id so a freshly booted kiosk can skip stale ones.
 * Returns [[], 0] if migration_fleet_telemetry.sql has not been applied yet.
 */
function pendingDisplayCommands(PDO $pdo, int $displayId, int $since): array {
    try {
        $stmt = $pdo->prepare("
            SELECT id, command, payload_json
            FROM display_commands
            WHERE display_id = ? AND id > ? AND expires_at > NOW()
            ORDER BY id ASC
            LIMIT 10
        ");
        $stmt->execute([$displayId, $since]);
        $commands = array_map(function ($c) {
            $payload = !empty($c['payload_json']) ? json_decode($c['payload_json'], true) : null;
            return [
                "id" => (int)$c['id'],
                "command" => $c['command'],
                "payload" => is_array($payload) ? $payload : null
            ];
        }, $stmt->fetchAll());

        $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(id), 0) FROM display_commands WHERE display_id = ?");
        $maxStmt->execute([$displayId]);
        return [$commands, (int)$maxStmt->fetchColumn()];
    } catch (\Exception $e) {
        return [[], 0];
    }
}
