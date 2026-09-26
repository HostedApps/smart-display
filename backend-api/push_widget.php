<?php
if (!headers_sent()) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-Token");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Content-Type: application/json; charset=UTF-8");
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $token = sanitizeText($input['token'] ?? $_GET['token'] ?? '');
    $widgetId = (int)($input['widget_id'] ?? $_GET['widget_id'] ?? 0);

    if (empty($token)) {
        http_response_code(400);
        echo json_encode(["error" => "Display token is required (token)"]);
        exit();
    }

    if ($widgetId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Valid widget ID is required (widget_id)"]);
        exit();
    }

    // 1. Authenticate Display
    $stmt = $pdo->prepare("SELECT id, user_id FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        http_response_code(404);
        echo json_encode(["error" => "Display not found for provided token"]);
        exit();
    }

    $displayId = (int)$display['id'];

    // 2. Fetch Widget
    $wStmt = $pdo->prepare("SELECT id, config_json, type FROM widgets WHERE id = ? AND display_id = ?");
    $wStmt->execute([$widgetId, $displayId]);
    $widget = $wStmt->fetch();

    if (!$widget) {
        http_response_code(404);
        echo json_encode(["error" => "Widget {$widgetId} not found on this display"]);
        exit();
    }

    $config = !empty($widget['config_json']) ? json_decode($widget['config_json'], true) : [];
    if (!is_array($config)) {
        $config = [];
    }

    // 3. Update Widget Config with Pushed Data
    $nowIso = date('c');

    if (isset($input['value'])) {
        $config['value'] = is_numeric($input['value']) ? (float)$input['value'] : sanitizeText(strval($input['value']));
    } elseif (isset($_GET['value'])) {
        $config['value'] = is_numeric($_GET['value']) ? (float)$_GET['value'] : sanitizeText(strval($_GET['value']));
    }

    if (!empty($input['status'])) {
        $config['status'] = sanitizeText(strval($input['status']));
    }

    if (!empty($input['title'])) {
        $config['title'] = sanitizeText(strval($input['title']));
    }

    if (!empty($input['unit'])) {
        $config['unit'] = sanitizeText(strval($input['unit']));
    }

    if (!empty($input['custom_data']) && is_array($input['custom_data'])) {
        foreach ($input['custom_data'] as $k => $v) {
            $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '', strval($k));
            if (!empty($safeKey)) {
                $config[$safeKey] = is_scalar($v) ? sanitizeText(strval($v)) : $v;
            }
        }
    }

    $config['last_pushed_at'] = $nowIso;

    // 4. Save to Database
    $updStmt = $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?");
    $updStmt->execute([json_encode($config), $widgetId]);

    echo json_encode([
        "success" => true,
        "message" => "Widget {$widgetId} updated successfully",
        "widget_id" => $widgetId,
        "type" => $widget['type'],
        "updated_at" => $nowIso,
        "value" => $config['value'] ?? null
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error updating widget: " . $e->getMessage()]);
}
