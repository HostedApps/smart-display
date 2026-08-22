<?php
require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['token'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid payload"]);
    exit();
}

$token = $input['token'];
$name = $input['name'] ?? 'Main Display';
$theme = $input['theme'] ?? 'dark';
$orientation = $input['orientation'] ?? 'landscape_720p';
$refreshInterval = (int)($input['refresh_interval'] ?? 60);
$background = isset($input['background']) ? json_encode($input['background']) : null;
$sleepSchedule = isset($input['sleep_schedule']) ? json_encode($input['sleep_schedule']) : null;
$pages = isset($input['pages']) ? json_encode($input['pages']) : null;
$widgets = $input['widgets'] ?? [];

try {
    $pdo->beginTransaction();

    // 1. Fetch Display ID or create if not exists
    $stmt = $pdo->prepare("SELECT id FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        // Auto-create display for this token if needed
        $insertDisplay = $pdo->prepare("INSERT INTO displays (user_id, token, name, theme, orientation, refresh_interval, background_json, sleep_schedule_json, pages_json) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insertDisplay->execute([$token, $name, $theme, $orientation, $refreshInterval, $background, $sleepSchedule, $pages]);
        $displayId = (int)$pdo->lastInsertId();
    } else {
        $displayId = (int)$display['id'];
        $updateStmt = $pdo->prepare("UPDATE displays SET name = ?, theme = ?, orientation = ?, refresh_interval = ?, background_json = ?, sleep_schedule_json = ?, pages_json = ? WHERE id = ?");
        $updateStmt->execute([$name, $theme, $orientation, $refreshInterval, $background, $sleepSchedule, $pages, $displayId]);
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
    echo json_encode(["success" => true, "message" => "Display settings & layout saved successfully"]);
} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Failed to save: " . $e->getMessage()]);
}
