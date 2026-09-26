<?php
require_once 'db.php';



$action = $_GET['action'] ?? 'generate_code';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// 1. Kiosk Screen requests new 6-digit pairing code
if ($action === 'generate_code') {
    checkRateLimit($pdo, 'pairing_gen', 30, 60);
    try {
        // Clean up expired pairings (> 15 mins old)
        $pdo->query("DELETE FROM device_pairings WHERE expires_at < NOW()");

        // Generate friendly 6-char code e.g. SD-8492
        $digits = str_pad((string)random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
        $letters = substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ'), 0, 2);
        $code = $letters . '-' . $digits;
        $secret = bin2hex(random_bytes(32));

        $stmt = $pdo->prepare("
            INSERT INTO device_pairings (pairing_code, device_secret, status, expires_at) 
            VALUES (?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
        ");
        $stmt->execute([$code, $secret]);

        echo json_encode([
            "success" => true,
            "pairing_code" => $code,
            "device_secret" => $secret,
            "expires_in_seconds" => 900
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to generate pairing code: " . $e->getMessage()]);
    }
    exit();
}

// 2. Kiosk Screen polls to check if admin approved the code
if ($action === 'check_status') {
    $secret = trim($_GET['device_secret'] ?? $input['device_secret'] ?? '');
    if (empty($secret)) {
        http_response_code(400);
        echo json_encode(["error" => "Device secret is required"]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            SELECT dp.status, dp.display_id, d.token as display_token, dev.device_token
            FROM device_pairings dp
            LEFT JOIN displays d ON dp.display_id = d.id
            LEFT JOIN devices dev ON dev.display_id = dp.display_id
            WHERE dp.device_secret = ? AND dp.expires_at > NOW()
            ORDER BY dev.id DESC LIMIT 1
        ");
        $stmt->execute([$secret]);
        $pairing = $stmt->fetch();

        if (!$pairing) {
            echo json_encode(["status" => "expired"]);
            exit();
        }

        if ($pairing['status'] === 'paired' && $pairing['display_token']) {
            echo json_encode([
                "status" => "paired",
                "display_token" => $pairing['display_token'],
                "device_token" => $pairing['device_token'] ?? ''
            ]);
            exit();
        }

        echo json_encode(["status" => "pending"]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Status check failed: " . $e->getMessage()]);
    }
    exit();
}

// 3. Admin pairs device by entering 6-digit PIN (Requires Auth)
if ($action === 'pair_device') {
    checkRateLimit($pdo, 'pair_claim', 10, 60);
    $user = getAuthenticatedUser($pdo);
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit();
    }

    $code = strtoupper(trim($input['pairing_code'] ?? ''));
    $displayId = (int)($input['display_id'] ?? 0);
    $deviceName = sanitizeText($input['device_name'] ?? 'Smart Display Device');

    if (empty($code) || !$displayId) {
        http_response_code(400);
        echo json_encode(["error" => "Pairing code and Display ID are required"]);
        exit();
    }

    try {
        // Verify user owns the target display
        $dStmt = $pdo->prepare("SELECT id, token, name FROM displays WHERE id = ? AND user_id = ?");
        $dStmt->execute([$displayId, $user['id']]);
        $display = $dStmt->fetch();

        if (!$display) {
            http_response_code(404);
            echo json_encode(["error" => "Target display not found or unauthorized"]);
            exit();
        }

        // Verify pairing code is valid and pending
        $pStmt = $pdo->prepare("SELECT id FROM device_pairings WHERE pairing_code = ? AND status = 'pending' AND expires_at > NOW()");
        $pStmt->execute([$code]);
        $pairing = $pStmt->fetch();

        if (!$pairing) {
            http_response_code(404);
            echo json_encode(["error" => "Invalid or expired pairing code. Check the code on the screen."]);
            exit();
        }

        // Generate persistent hardware device token
        $deviceToken = bin2hex(random_bytes(32));
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

        $devStmt = $pdo->prepare("
            INSERT INTO devices (display_id, device_token, device_name, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        ");
        $devStmt->execute([$displayId, $deviceToken, $deviceName, $ip, $ua]);

        // Update pairing to paired status so kiosk screen unlocks
        $upStmt = $pdo->prepare("UPDATE device_pairings SET status = 'paired', display_id = ? WHERE id = ?");
        $upStmt->execute([$displayId, $pairing['id']]);

        echo json_encode([
            "success" => true,
            "message" => "Device paired successfully!",
            "display_name" => $display['name'],
            "display_token" => $display['token']
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Pairing failed: " . $e->getMessage()]);
    }
    exit();
}

// 4. Admin lists bonded devices for a display
if ($action === 'list_devices') {
    $user = getAuthenticatedUser($pdo);
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit();
    }

    $displayId = (int)($_GET['display_id'] ?? 0);
    try {
        $stmt = $pdo->prepare("
            SELECT dev.id, dev.device_name, dev.ip_address, dev.last_ping, dev.created_at, d.name as display_name
            FROM devices dev
            JOIN displays d ON dev.display_id = d.id
            WHERE d.user_id = ? " . ($displayId > 0 ? "AND dev.display_id = " . $displayId : "") . "
            ORDER BY dev.last_ping DESC
        ");
        $stmt->execute([$user['id']]);
        $devices = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "devices" => $devices
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch devices: " . $e->getMessage()]);
    }
    exit();
}

// 5. Admin revokes a bonded device
if ($action === 'revoke_device') {
    $user = getAuthenticatedUser($pdo);
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit();
    }

    $deviceId = (int)($_GET['id'] ?? $input['id'] ?? 0);
    try {
        // Enforce ownership
        $stmt = $pdo->prepare("
            DELETE dev FROM devices dev
            JOIN displays d ON dev.display_id = d.id
            WHERE dev.id = ? AND d.user_id = ?
        ");
        $stmt->execute([$deviceId, $user['id']]);

        echo json_encode(["success" => true, "message" => "Device revoked successfully"]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to revoke device: " . $e->getMessage()]);
    }
    exit();
}

http_response_code(400);
echo json_encode(["error" => "Invalid pairing action"]);
