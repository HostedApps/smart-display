<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-Token");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

// Rate limit: 120 whiteboard syncs per minute per IP
checkRateLimit($pdo, 'whiteboard_sync', 120, 60);

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = trim((string)($input['action'] ?? 'save'));
$token = trim($input['token'] ?? $_GET['token'] ?? '');
$widgetIdParam = !empty($input['widgetId']) ? (int)$input['widgetId'] : null;

if (empty($token)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Display token is required"]);
    exit();
}

try {
    // 1. Resolve display by token
    $stmt = $pdo->prepare("SELECT id FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Display not found"]);
        exit();
    }

    $displayId = (int)$display['id'];

    // 2. Fetch the whiteboard widget
    if ($widgetIdParam) {
        $wStmt = $pdo->prepare("SELECT id, config_json FROM widgets WHERE id = ? AND display_id = ? AND type = 'whiteboard' LIMIT 1");
        $wStmt->execute([$widgetIdParam, $displayId]);
    } else {
        $wStmt = $pdo->prepare("SELECT id, config_json FROM widgets WHERE display_id = ? AND type = 'whiteboard' LIMIT 1");
        $wStmt->execute([$displayId]);
    }
    $wbWidget = $wStmt->fetch();

    if (!$wbWidget) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Whiteboard widget not found on this display"]);
        exit();
    }

    $widgetId = (int)$wbWidget['id'];
    $config = json_decode($wbWidget['config_json'], true) ?? [];

    if ($action === 'clear') {
        $config['strokes'] = [];
    } else {
        // Save strokes
        $strokes = isset($input['strokes']) && is_array($input['strokes']) ? $input['strokes'] : [];
        // Cap stroke history to last 500 strokes to prevent unbounded DB growth
        if (count($strokes) > 500) {
            $strokes = array_slice($strokes, -500);
        }
        $config['strokes'] = $strokes;

        if (isset($input['canvasBackground'])) {
            $config['canvasBackground'] = sanitizeText($input['canvasBackground']);
        }
    }

    $config['lastModified'] = date('c');

    $upStmt = $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?");
    $upStmt->execute([json_encode($config), $widgetId]);

    echo json_encode([
        "success" => true,
        "action" => $action,
        "widgetId" => $widgetId,
        "strokeCount" => count($config['strokes'] ?? []),
        "lastModified" => $config['lastModified']
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
}
