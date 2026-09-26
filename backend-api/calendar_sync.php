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

// Rate limit: 60 calendar event updates per minute per IP
checkRateLimit($pdo, 'calendar_sync', 60, 60);

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = trim((string)($input['action'] ?? 'add'));
$token = trim($input['token'] ?? $_GET['token'] ?? '');
$eventId = trim((string)($input['eventId'] ?? $input['id'] ?? ''));

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

    // 2. Fetch the calendar widget for this display
    $wStmt = $pdo->prepare("SELECT id, config_json FROM widgets WHERE display_id = ? AND type = 'calendar' LIMIT 1");
    $wStmt->execute([$displayId]);
    $calWidget = $wStmt->fetch();

    if (!$calWidget) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Calendar widget not found on this display"]);
        exit();
    }

    $widgetId = (int)$calWidget['id'];
    $config = json_decode($calWidget['config_json'], true) ?? [];
    $customEvents = $config['customEvents'] ?? [];

    if (!is_array($customEvents)) {
        $customEvents = [];
    }

    $createdEvent = null;

    if ($action === 'delete') {
        if (empty($eventId)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "eventId is required for delete"]);
            exit();
        }
        $customEvents = array_values(array_filter($customEvents, function($ev) use ($eventId) {
            return (string)($ev['id'] ?? '') !== $eventId;
        }));
    } else {
        // Add new event
        $title = sanitizeText($input['title'] ?? ($input['event']['title'] ?? ''));
        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Event title is required"]);
            exit();
        }

        $eventPayload = $input['event'] ?? $input;
        $newId = (string)time() . '_' . substr(md5(uniqid()), 0, 4);
        $startDate = !empty($eventPayload['startDate']) ? $eventPayload['startDate'] : date('c');
        $endDate = !empty($eventPayload['endDate']) ? $eventPayload['endDate'] : date('c', strtotime('+1 hour'));

        $createdEvent = [
            "id" => $newId,
            "title" => $title,
            "startDate" => $startDate,
            "endDate" => $endDate,
            "isAllDay" => !empty($eventPayload['isAllDay']),
            "color" => sanitizeText($eventPayload['color'] ?? '#38bdf8'),
            "feedName" => sanitizeText($eventPayload['feedName'] ?? 'Quick Event'),
            "location" => sanitizeText($eventPayload['location'] ?? ''),
            "description" => sanitizeText($eventPayload['description'] ?? '')
        ];

        $customEvents[] = $createdEvent;
    }

    $config['customEvents'] = $customEvents;
    $upStmt = $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?");
    $upStmt->execute([json_encode($config), $widgetId]);

    echo json_encode([
        "success" => true,
        "action" => $action,
        "event" => $createdEvent,
        "customEvents" => $customEvents,
        "totalEvents" => count($customEvents)
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
}
