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

    // Decode JSON fields if present
    $displayData = [
        'id' => (int)$display['id'],
        'name' => $display['name'] ?? 'Main Display',
        'theme' => $display['theme'] ?? 'dark',
        'orientation' => $display['orientation'] ?? 'landscape_720p',
        'refresh_interval' => (int)($display['refresh_interval'] ?? 60),
        'background' => !empty($display['background_json']) ? json_decode($display['background_json'], true) : null,
        'sleep_schedule' => !empty($display['sleep_schedule_json']) ? json_decode($display['sleep_schedule_json'], true) : null,
        'pages' => !empty($display['pages_json']) ? json_decode($display['pages_json'], true) : null
    ];

    // Fetch Widgets
    $stmt = $pdo->prepare("SELECT * FROM widgets WHERE display_id = ?");
    $stmt->execute([$display['id']]);
    $rawWidgets = $stmt->fetchAll();

    $widgets = array_map(function($w) {
        return [
            'id' => (int)$w['id'],
            'page_id' => $w['page_id'] ?? 'default',
            'type' => $w['type'],
            'position' => !empty($w['position_json']) ? json_decode($w['position_json'], true) : ['x' => 0, 'y' => 0, 'width' => 320, 'height' => 200],
            'style' => !empty($w['style_json']) ? json_decode($w['style_json'], true) : ['opacity' => 1, 'borderRadius' => 12, 'backdropBlur' => true],
            'config' => !empty($w['config_json']) ? json_decode($w['config_json'], true) : []
        ];
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
