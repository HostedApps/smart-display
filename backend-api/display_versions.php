<?php
/**
 * Display version history (read-only).
 *
 * GET ?token=X        -> {success, versions:[{id,label,widget_count,created_at}]} newest first, max 20
 * GET ?token=X&id=N   -> {success, version:{id,label,widget_count,created_at,snapshot}}
 *
 * Auth: Authorization: Bearer <auth_token>; only the display owner may read its history.
 * Snapshots are written by save_display.php.
 */
require_once 'db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

// Verify Authentication Token
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$authToken = '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $authToken = $matches[1];
}

if (empty($authToken)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized. Please log in to view version history."]);
    exit();
}

try {
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE auth_token = ?");
    $userStmt->execute([$authToken]);
    $user = $userStmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Session expired or invalid. Please log in again."]);
        exit();
    }

    $userId = (int)$user['id'];

    $rawToken = $_GET['token'] ?? '';
    $token = is_string($rawToken) ? preg_replace('/[^a-zA-Z0-9_\-]/', '', $rawToken) : '';
    if ($token === '' || $token !== $rawToken) {
        http_response_code(400);
        echo json_encode(["error" => "A valid display token is required"]);
        exit();
    }

    $versionId = null;
    if (isset($_GET['id'])) {
        $rawId = $_GET['id'];
        if (!is_string($rawId) || !ctype_digit($rawId) || (int)$rawId <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid version id"]);
            exit();
        }
        $versionId = (int)$rawId;
    }

    $stmt = $pdo->prepare("SELECT id, user_id FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        http_response_code(404);
        echo json_encode(["error" => "Display not found"]);
        exit();
    }

    if ((int)$display['user_id'] !== $userId) {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: You do not have permission to view this display's history."]);
        exit();
    }

    $displayId = (int)$display['id'];

    if ($versionId === null) {
        try {
            $listStmt = $pdo->prepare("SELECT id, label, widget_count, created_at FROM display_versions WHERE display_id = ? ORDER BY created_at DESC, id DESC LIMIT 20");
            $listStmt->execute([$displayId]);
            $rows = $listStmt->fetchAll();
        } catch (\PDOException $e) {
            // display_versions table missing (migration not applied): no history yet
            $rows = [];
        }

        $versions = array_map(function ($r) {
            return [
                'id' => (int)$r['id'],
                'label' => $r['label'],
                'widget_count' => (int)$r['widget_count'],
                'created_at' => $r['created_at'],
            ];
        }, $rows);

        echo json_encode(["success" => true, "versions" => $versions]);
        exit();
    }

    try {
        $getStmt = $pdo->prepare("SELECT id, label, widget_count, snapshot_json, created_at FROM display_versions WHERE id = ? AND display_id = ?");
        $getStmt->execute([$versionId, $displayId]);
        $row = $getStmt->fetch();
    } catch (\PDOException $e) {
        $row = false;
    }

    if (!$row) {
        http_response_code(404);
        echo json_encode(["error" => "Version not found"]);
        exit();
    }

    $snapshot = json_decode($row['snapshot_json'], true);
    echo json_encode([
        "success" => true,
        "version" => [
            'id' => (int)$row['id'],
            'label' => $row['label'],
            'widget_count' => (int)$row['widget_count'],
            'created_at' => $row['created_at'],
            'snapshot' => is_array($snapshot) && !empty($snapshot) ? $snapshot : new stdClass(),
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to load version history: " . $e->getMessage()]);
}
