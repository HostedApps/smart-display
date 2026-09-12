<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

// Rate limit: 60 task toggles per minute per IP
checkRateLimit($pdo, 'tasks_sync', 60, 60);

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$token = trim($input['token'] ?? $_GET['token'] ?? '');
$taskId = trim((string)($input['taskId'] ?? $input['id'] ?? ''));
$completed = isset($input['completed']) ? (bool)$input['completed'] : null;

if (empty($token) || empty($taskId)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Display token and taskId are required"]);
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

    // 2. Fetch the todo widget for this display
    $wStmt = $pdo->prepare("SELECT id, config_json FROM widgets WHERE display_id = ? AND type = 'todo' LIMIT 1");
    $wStmt->execute([$displayId]);
    $todoWidget = $wStmt->fetch();

    if (!$todoWidget) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Todo widget not found on this display"]);
        exit();
    }

    $widgetId = (int)$todoWidget['id'];
    $config = json_decode($todoWidget['config_json'], true) ?? [];
    $items = $config['items'] ?? [];

    $updated = false;
    $newStatus = false;

    // Mutate the matching task
    foreach ($items as &$item) {
        if ((string)($item['id'] ?? '') === $taskId) {
            if ($completed !== null) {
                $item['completed'] = $completed;
            } else {
                $item['completed'] = !($item['completed'] ?? false);
            }
            $newStatus = (bool)$item['completed'];
            $updated = true;
            break;
        }
    }
    unset($item);

    // If task was not in custom items list (e.g. default task toggle), create task entry
    if (!$updated) {
        $newStatus = ($completed !== null) ? $completed : true;
        $items[] = [
            "id" => $taskId,
            "text" => sanitizeText($input['text'] ?? 'Task ' . $taskId),
            "completed" => $newStatus,
            "priority" => $input['priority'] ?? 'medium'
        ];
        $updated = true;
    }

    $config['items'] = $items;
    $upStmt = $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?");
    $upStmt->execute([json_encode($config), $widgetId]);

    // 3. OPTIONAL: SYNC TO TODOIST API IF TOKEN CONFIGURED
    $todoistSynced = false;
    $todoistToken = trim($config['todoistToken'] ?? $input['todoistToken'] ?? '');
    if (!empty($todoistToken) && is_numeric($taskId)) {
        try {
            $todoistUrl = $newStatus 
                ? "https://api.todoist.com/rest/v2/tasks/" . urlencode($taskId) . "/close"
                : "https://api.todoist.com/rest/v2/tasks/" . urlencode($taskId) . "/reopen";

            $ch = curl_init($todoistUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer " . $todoistToken,
                "Content-Type: application/json"
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code === 204 || $code === 200) {
                $todoistSynced = true;
            }
        } catch (\Exception $e) {
            // Ignore external sync failure
        }
    }

    echo json_encode([
        "success" => true,
        "taskId" => $taskId,
        "completed" => $newStatus,
        "todoistSynced" => $todoistSynced,
        "totalTasks" => count($items)
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
}
