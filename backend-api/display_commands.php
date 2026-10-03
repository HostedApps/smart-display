<?php
/**
 * Remote commands for kiosks (fleet hub).
 *
 * POST { tokens: string[1..50], command, payload? } -> { success: true, queued: n }
 *   command: reload | identify | sleep | wake | goto_page | screenshot
 *   payload: goto_page -> { page_index: int >= 0 }; ignored for the others.
 *
 * Auth: Authorization: Bearer <auth_token>; every display must belong to the caller.
 * Commands expire after 2 minutes and are delivered via the emergency.php poll.
 */
require_once 'db.php';

const DC_COMMANDS = ['reload', 'identify', 'sleep', 'wake', 'goto_page', 'screenshot'];
const DC_MAX_TARGETS = 50;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

$user = getAuthenticatedUser($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit();
}
$userId = (int)$user['id'];

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid payload"]);
    exit();
}

$rawTokens = $input['tokens'] ?? null;
if (!is_array($rawTokens) || count($rawTokens) < 1 || count($rawTokens) > DC_MAX_TARGETS) {
    http_response_code(400);
    echo json_encode(["error" => "tokens must be an array of 1-" . DC_MAX_TARGETS . " display tokens"]);
    exit();
}
$tokens = [];
foreach ($rawTokens as $t) {
    if (!is_string($t) || $t === '' || preg_replace('/[^a-zA-Z0-9_\-]/', '', $t) !== $t || strlen($t) > 64) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid display token in tokens"]);
        exit();
    }
    $tokens[$t] = true;
}
$tokens = array_keys($tokens);

$command = $input['command'] ?? '';
if (!is_string($command) || !in_array($command, DC_COMMANDS, true)) {
    http_response_code(400);
    echo json_encode(["error" => "Unknown command. Allowed: " . implode(', ', DC_COMMANDS)]);
    exit();
}

$payloadJson = null;
if ($command === 'goto_page') {
    $p = $input['payload'] ?? null;
    $pi = is_array($p) ? ($p['page_index'] ?? null) : null;
    if (is_string($pi) && ctype_digit($pi)) {
        $pi = (int)$pi;
    }
    if (!is_int($pi) || $pi < 0 || $pi > 1000) {
        http_response_code(400);
        echo json_encode(["error" => "goto_page requires payload.page_index (integer >= 0)"]);
        exit();
    }
    $payloadJson = json_encode(['page_index' => $pi]);
}

try {
    $placeholders = implode(',', array_fill(0, count($tokens), '?'));
    $stmt = $pdo->prepare("SELECT id, user_id FROM displays WHERE token IN ($placeholders)");
    $stmt->execute($tokens);
    $rows = $stmt->fetchAll();

    $displayIds = [];
    foreach ($rows as $r) {
        if ((int)$r['user_id'] === $userId) {
            $displayIds[] = (int)$r['id'];
        }
    }
    // Unknown tokens are treated like foreign ones (no existence leak)
    if (count($displayIds) !== count($tokens)) {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: one or more displays were not found or are not yours."]);
        exit();
    }

    try {
        // Opportunistic cleanup of long-expired commands
        $pdo->exec("DELETE FROM display_commands WHERE expires_at < NOW() - INTERVAL 1 DAY");

        $pdo->beginTransaction();
        $ins = $pdo->prepare("INSERT INTO display_commands (display_id, command, payload_json, created_by, expires_at) VALUES (?, ?, ?, ?, NOW() + INTERVAL 2 MINUTE)");
        foreach ($displayIds as $displayId) {
            $ins->execute([$displayId, $command, $payloadJson, $userId]);
        }
        $pdo->commit();
    } catch (\PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        // 42S02: display_commands table missing (migration not applied)
        if ($e->getCode() === '42S02') {
            http_response_code(503);
            echo json_encode(["error" => "Remote commands are not available yet. Apply migration_fleet_telemetry.sql."]);
            exit();
        }
        throw $e;
    }

    echo json_encode(["success" => true, "queued" => count($displayIds)]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to queue command: " . $e->getMessage()]);
}
