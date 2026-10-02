<?php
require_once 'db.php';

// Verify Authentication Token
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$authToken = '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $authToken = $matches[1];
}

if (empty($authToken)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized. Please log in to edit and save displays."]);
    exit();
}

try {
    // Validate User Token
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE auth_token = ?");
    $userStmt->execute([$authToken]);
    $user = $userStmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Session expired or invalid. Please log in again."]);
        exit();
    }

    $userId = (int)$user['id'];

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['token'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid payload"]);
        exit();
    }

    $token = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['token']);
    $name = sanitizeText($input['name'] ?? 'Main Display');
    $theme = in_array($input['theme'] ?? '', ['glass', 'paper', 'solid', 'mirror', 'ambient', 'contrast', 'dark', 'light', 'minimal', 'oled'], true) ? $input['theme'] : 'glass';
    $orientation = $input['orientation'] ?? 'landscape_720p';
    $refreshInterval = max(10, (int)($input['refresh_interval'] ?? 60));
    $backgroundArr = isset($input['background']) && is_array($input['background']) ? $input['background'] : [];
    if (isset($input['font_family'])) {
        $backgroundArr['font_family'] = sanitizeText($input['font_family']);
    }
    if (isset($input['accent_color'])) {
        $accent = trim((string)$input['accent_color']);
        if (preg_match('/^#[0-9a-fA-F]{6}$/', $accent)) {
            $backgroundArr['accent_color'] = $accent;
        } else {
            unset($backgroundArr['accent_color']);
        }
    }
    if (isset($input['weather_alerts_enabled'])) {
        $backgroundArr['weather_alerts_enabled'] = (bool)$input['weather_alerts_enabled'];
    }
    if (isset($input['weather_alert'])) {
        $backgroundArr['weather_alert'] = is_string($input['weather_alert']) ? sanitizeText($input['weather_alert']) : $input['weather_alert'];
    }
    if (isset($input['custom_css'])) {
        // Strip script tags for security, preserve CSS
        $cleanCss = preg_replace('/<\s*script\b[^>]*>(.*?)<\s*\/\s*script\s*>/is', '', $input['custom_css']);
        $backgroundArr['custom_css'] = $cleanCss;
    }
    if (isset($input['audio_chimes_enabled'])) {
        $backgroundArr['audio_chimes_enabled'] = (bool)$input['audio_chimes_enabled'];
    }
    if (isset($input['hourly_chime'])) {
        $backgroundArr['hourly_chime'] = (bool)$input['hourly_chime'];
    }
    if (isset($input['touchhub_enabled'])) {
        $backgroundArr['touchhub_enabled'] = (bool)$input['touchhub_enabled'];
    }
    if (isset($input['touchhub_config'])) {
        $backgroundArr['touchhub_config'] = $input['touchhub_config'];
    }
    $background = !empty($backgroundArr) ? json_encode($backgroundArr) : null;
    $sleepSchedule = isset($input['sleep_schedule']) ? json_encode($input['sleep_schedule']) : null;
    $pages = isset($input['pages']) ? json_encode($input['pages']) : null;
    $logoUrl = (!empty($input['logo_url']) && isSafeExternalUrl($input['logo_url'])) ? trim($input['logo_url']) : null;
    $showLogoKiosk = !empty($input['show_logo_kiosk']) ? 1 : 0;
    $widgets = $input['widgets'] ?? [];

    $pdo->beginTransaction();

    // 1. Fetch Display ID or create if not exists
    $stmt = $pdo->prepare("SELECT id, user_id FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        // Create new display owned by authenticated user
        $insertDisplay = $pdo->prepare("INSERT INTO displays (user_id, token, name, theme, orientation, refresh_interval, background_json, sleep_schedule_json, pages_json, logo_url, show_logo_kiosk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insertDisplay->execute([$userId, $token, $name, $theme, $orientation, $refreshInterval, $background, $sleepSchedule, $pages, $logoUrl, $showLogoKiosk]);
        $displayId = (int)$pdo->lastInsertId();
    } else {
        // Verify ownership
        if ((int)$display['user_id'] !== $userId) {
            $pdo->rollBack();
            http_response_code(403);
            echo json_encode(["error" => "Forbidden: You do not have permission to modify this display."]);
            exit();
        }

        $displayId = (int)$display['id'];
        $updateStmt = $pdo->prepare("UPDATE displays SET name = ?, theme = ?, orientation = ?, refresh_interval = ?, background_json = ?, sleep_schedule_json = ?, pages_json = ?, logo_url = ?, show_logo_kiosk = ? WHERE id = ?");
        $updateStmt->execute([$name, $theme, $orientation, $refreshInterval, $background, $sleepSchedule, $pages, $logoUrl, $showLogoKiosk, $displayId]);
    }

    // 2. Clear existing widgets and re-insert updated configuration
    $deleteStmt = $pdo->prepare("DELETE FROM widgets WHERE display_id = ?");
    $deleteStmt->execute([$displayId]);

    $insertStmt = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, style_json, config_json) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($widgets as $w) {
        $pageId = $w['page_id'] ?? 'default';
        $styleJson = isset($w['style']) ? json_encode($w['style']) : json_encode(['opacity' => 1, 'borderRadius' => 12, 'backdropBlur' => true]);
        
        $insertStmt->execute([
            $displayId,
            $pageId,
            $w['type'],
            json_encode($w['position']),
            $styleJson,
            json_encode($w['config'])
        ]);
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Display settings & layout saved securely"]);
} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Failed to save: " . $e->getMessage()]);
}
