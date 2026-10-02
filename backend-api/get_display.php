<?php
require_once 'db.php';

$token = $_GET['token'] ?? '';

if (empty($token)) {
    http_response_code(400);
    echo json_encode(["error" => "Token is required"]);
    exit();
}

try {
    // Fetch Display with extended fields
    $stmt = $pdo->prepare("SELECT * FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        http_response_code(404);
        echo json_encode(["error" => "Display not found"]);
        exit();
    }
    // Authenticate the request (Security feature)
    $headers = getallheaders();
    $deviceTokenHeader = $headers['X-Device-Token'] ?? $headers['x-device-token'] ?? '';
    $user = getAuthenticatedUser($pdo);
    
    $isAuthorized = false;
    
    // 1. Is it the owner or superadmin?
    if ($user) {
        if ((int)$display['user_id'] === (int)$user['id'] || $user['role'] === 'superadmin') {
            $isAuthorized = true;
        }
    }
    
    // 2. Is it a paired device?
    if (!$isAuthorized && !empty($deviceTokenHeader)) {
        $devStmt = $pdo->prepare("SELECT id FROM devices WHERE display_id = ? AND device_token = ?");
        $devStmt->execute([$display['id'], $deviceTokenHeader]);
        if ($devStmt->fetch()) {
            $isAuthorized = true;
        }
    }
    
    if (!$isAuthorized) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized access to display"]);
        exit();
    }
    // Decode JSON fields if present
    $bgData = !empty($display['background_json']) ? json_decode($display['background_json'], true) : [];
    $displayData = [
        'id' => (int)$display['id'],
        'name' => $display['name'] ?? 'Main Display',
        'theme' => $display['theme'] ?? 'dark',
        'orientation' => $display['orientation'] ?? 'landscape_720p',
        'refresh_interval' => (int)($display['refresh_interval'] ?? 60),
        'background' => $bgData,
        'sleep_schedule' => !empty($display['sleep_schedule_json']) ? json_decode($display['sleep_schedule_json'], true) : null,
        'pages' => !empty($display['pages_json']) ? json_decode($display['pages_json'], true) : null,
        'logo_url' => $display['logo_url'] ?? null,
        'show_logo_kiosk' => (bool)($display['show_logo_kiosk'] ?? false),
        'font_family' => $bgData['font_family'] ?? null,
        'accent_color' => $bgData['accent_color'] ?? null,
        'canvas_width' => isset($bgData['canvas_width']) ? (int)$bgData['canvas_width'] : null,
        'canvas_height' => isset($bgData['canvas_height']) ? (int)$bgData['canvas_height'] : null,
        'scale_mode' => $bgData['scale_mode'] ?? 'fit',
        'safe_area' => isset($bgData['safe_area']) ? (float)$bgData['safe_area'] : 0,
        'page_transition' => $bgData['page_transition'] ?? 'fade',
        'performance_mode' => $bgData['performance_mode'] ?? 'auto',
        'burn_in_shift' => (bool)($bgData['burn_in_shift'] ?? true),
        'weather_alerts_enabled' => $bgData['weather_alerts_enabled'] ?? true,
        'weather_alert' => $bgData['weather_alert'] ?? null,
        'custom_css' => $bgData['custom_css'] ?? null,
        'audio_chimes_enabled' => (bool)($bgData['audio_chimes_enabled'] ?? false),
        'hourly_chime' => (bool)($bgData['hourly_chime'] ?? false),
        'touchhub_enabled' => (bool)($bgData['touchhub_enabled'] ?? false),
        'touchhub_config' => $bgData['touchhub_config'] ?? null
    ];

    // Fetch Widgets
    $stmt = $pdo->prepare("SELECT * FROM widgets WHERE display_id = ?");
    $stmt->execute([$display['id']]);
    $rawWidgets = $stmt->fetchAll();

    $widgets = array_map(function($w) {
        $style = !empty($w['style_json']) ? json_decode($w['style_json'], true) : ['opacity' => 1, 'borderRadius' => 12, 'backdropBlur' => true];
        // Editor fields (schedule, rules, links, lock/hide, nickname) are stored under style._meta
        $meta = (is_array($style) && isset($style['_meta']) && is_array($style['_meta'])) ? $style['_meta'] : [];
        unset($style['_meta']);
        return array_merge([
            'id' => (int)$w['id'],
            'page_id' => $w['page_id'] ?? 'default',
            'type' => $w['type'],
            'position' => !empty($w['position_json']) ? json_decode($w['position_json'], true) : ['x' => 0, 'y' => 0, 'width' => 320, 'height' => 200],
            'style' => !empty($style) ? $style : new stdClass(),
            'config' => (!empty($w['config_json']) && ($cfg = json_decode($w['config_json'], true))) ? $cfg : new stdClass()
        ], array_intersect_key($meta, array_flip(['schedule', 'rules', 'linkedWidgetId', 'locked', 'hidden', 'customName'])));
    }, $rawWidgets);

    echo json_encode([
        "success" => true,
        "display" => $displayData,
        "widgets" => $widgets
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to load display: " . $e->getMessage()]);
}
