<?php
require_once 'db.php';



$user = getAuthenticatedUser($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized - Invalid or missing session"]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: List all displays owned by this user
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("
            SELECT 
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
                (SELECT COUNT(*) FROM devices WHERE display_id = d.id) as device_count
            FROM displays d
            WHERE d.user_id = ?
            ORDER BY d.id DESC
        ");
        $stmt->execute([$user['id']]);
        $displays = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "displays" => array_map(function($d) {
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
                    "created_at" => $d['created_at']
                ];
            }, $displays)
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch displays: " . $e->getMessage()]);
    }
    exit();
}

// POST: Create a new display profile
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($input['name'] ?? 'New Smart Display');
    $orientation = $input['orientation'] ?? 'landscape_720p';
    $theme = $input['theme'] ?? 'dark';

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["error" => "Display name is required"]);
        exit();
    }

    try {
        $cleanSlug = preg_replace('/[^a-z0-9]/', '-', strtolower($name));
        $cleanSlug = trim($cleanSlug, '-') ?: 'screen';
        $displayToken = $cleanSlug . '-' . substr(bin2hex(random_bytes(4)), 0, 6);

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
