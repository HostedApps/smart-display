<?php
require_once 'db.php';

// Rate limit: 20 drops per minute per IP
checkRateLimit($pdo, 'walldrop', 20, 60);

$token = $_GET['token'] ?? '';
if (empty($token)) {
    http_response_code(400);
    echo json_encode(["error" => "Display token is required"]);
    exit();
}

try {
    // 1. Resolve display by token
    $stmt = $pdo->prepare("SELECT id, name, theme FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        http_response_code(404);
        echo json_encode(["error" => "Display not found"]);
        exit();
    }

    $displayId = (int)$display['id'];
    $method = $_SERVER['REQUEST_METHOD'];

    // GET: Fetch recent walldrop items
    if ($method === 'GET') {
        $itemsStmt = $pdo->prepare("
            SELECT id, type, author, content, media_url, color, created_at 
            FROM walldrop_items 
            WHERE display_id = ? 
            ORDER BY id DESC 
            LIMIT 20
        ");
        $itemsStmt->execute([$displayId]);
        $items = $itemsStmt->fetchAll();

        echo json_encode([
            "success" => true,
            "display" => [
                "name" => $display['name'],
                "theme" => $display['theme']
            ],
            "items" => $items
        ]);
        exit();
    }

    // POST: Beam a note or photo to the display
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $type = in_array($input['type'] ?? '', ['note', 'photo', 'alert', 'flyer', 'calendar_event']) ? $input['type'] : 'note';
        $author = sanitizeText($input['author'] ?? 'Family Member');
        $content = sanitizeText($input['content'] ?? '');
        $mediaUrl = trim($input['media_url'] ?? '');
        $color = preg_match('/^#[0-9a-fA-F]{6}$/', $input['color'] ?? '') ? $input['color'] : '#fef08a';
        $eventData = isset($input['event']) && is_array($input['event']) ? $input['event'] : null;

        if (!empty($mediaUrl) && !isSafeExternalUrl($mediaUrl)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid or unsafe photo URL"]);
            exit();
        }

        if (empty($content) && empty($mediaUrl) && empty($eventData)) {
            http_response_code(400);
            echo json_encode(["error" => "Message content, photo URL, or event data is required"]);
            exit();
        }

        // Insert into walldrop_items
        $ins = $pdo->prepare("
            INSERT INTO walldrop_items (display_id, type, author, content, media_url, color) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([$displayId, $type, $author, $content, $mediaUrl, $color]);
        $dropId = (int)$pdo->lastInsertId();

        // If it's a note, sync into sticky_note widget
        if ($type === 'note') {
            $wStmt = $pdo->prepare("SELECT id, config_json FROM widgets WHERE display_id = ? AND type = 'sticky_note' LIMIT 1");
            $wStmt->execute([$displayId]);
            $stickyWidget = $wStmt->fetch();
            if ($stickyWidget) {
                $cfg = json_decode($stickyWidget['config_json'], true) ?? [];
                if (!isset($cfg['notes'])) $cfg['notes'] = [];
                
                array_unshift($cfg['notes'], [
                    "id" => "drop_" . $dropId,
                    "text" => $content,
                    "author" => $author,
                    "color" => $color,
                    "date" => "Just now"
                ]);
                
                $cfg['notes'] = array_slice($cfg['notes'], 0, 10);
                $up = $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?");
                $up->execute([json_encode($cfg), $stickyWidget['id']]);
            }
        }

        // If it's a calendar event / flyer scan, sync into calendar widget
        if (($type === 'calendar_event' || $type === 'flyer') && $eventData) {
            $cStmt = $pdo->prepare("SELECT id, config_json FROM widgets WHERE display_id = ? AND type = 'calendar' LIMIT 1");
            $cStmt->execute([$displayId]);
            $calWidget = $cStmt->fetch();
            if ($calWidget) {
                $calCfg = json_decode($calWidget['config_json'], true) ?? [];
                if (!isset($calCfg['customEvents'])) $calCfg['customEvents'] = [];

                $calCfg['customEvents'][] = [
                    "id" => "drop_ev_" . $dropId,
                    "title" => sanitizeText($eventData['title'] ?? $content),
                    "startDate" => $eventData['startDate'] ?? date('c'),
                    "endDate" => $eventData['endDate'] ?? '',
                    "isAllDay" => !empty($eventData['isAllDay']),
                    "location" => sanitizeText($eventData['location'] ?? ''),
                    "description" => sanitizeText($eventData['description'] ?? ''),
                    "category" => $eventData['category'] ?? 'family',
                    "color" => $color,
                    "feedName" => "WallDrop: " . $author
                ];

                $up = $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?");
                $up->execute([json_encode($calCfg), $calWidget['id']]);
            }
        }

        echo json_encode([
            "success" => true,
            "message" => "Beamed to display successfully!",
            "item_id" => $dropId
        ]);
        exit();
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error: " . $e->getMessage()]);
}
