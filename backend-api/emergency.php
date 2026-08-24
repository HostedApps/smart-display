<?php
require_once 'db.php';

function getAuthenticatedUser($pdo) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }
    $token = $matches[1];
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE auth_token = ?");
    $stmt->execute([$token]);
    return $stmt->fetch();
}

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
            echo json_encode(["active" => false]);
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
