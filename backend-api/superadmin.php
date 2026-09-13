<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

// Rate limit super admin actions
checkRateLimit($pdo, 'superadmin_api', 120, 60);

// 1. Authenticate Super Admin
function getAuthToken() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        return $matches[1];
    }
    return $_GET['auth_token'] ?? $_POST['auth_token'] ?? '';
}

$authToken = getAuthToken();
if (empty($authToken)) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized - Authentication token required"]);
    exit();
}

$adminStmt = $pdo->prepare("SELECT id, name, email, role, is_active FROM users WHERE auth_token = ?");
$adminStmt->execute([$authToken]);
$currentAdmin = $adminStmt->fetch();

if (!$currentAdmin || (int)$currentAdmin['is_active'] !== 1) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized - Invalid or expired session"]);
    exit();
}

if ($currentAdmin['role'] !== 'superadmin') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Access Denied: Super Admin privileges required"]);
    exit();
}

$action = $_GET['action'] ?? 'stats';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

try {
    // -------------------------------------------------------------
    // ACTION: STATS
    // -------------------------------------------------------------
    if ($action === 'stats') {
        $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $activeUsers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE is_active = 1")->fetchColumn();
        $verifiedUsers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE email_verified = 1")->fetchColumn();
        $totalDisplays = (int)$pdo->query("SELECT COUNT(*) FROM displays")->fetchColumn();
        $totalWidgets = (int)$pdo->query("SELECT COUNT(*) FROM widgets")->fetchColumn();
        $totalDevices = (int)$pdo->query("SELECT COUNT(*) FROM devices")->fetchColumn();
        $recent24h = (int)$pdo->query("SELECT COUNT(*) FROM user_activity_logs WHERE created_at >= NOW() - INTERVAL 1 DAY")->fetchColumn();

        echo json_encode([
            "success" => true,
            "stats" => [
                "totalUsers" => $totalUsers,
                "maxCapacity" => 50,
                "capacityUsedPercent" => round(($totalUsers / 50) * 100, 1),
                "activeUsers" => $activeUsers,
                "verifiedUsers" => $verifiedUsers,
                "totalDisplays" => $totalDisplays,
                "totalWidgets" => $totalWidgets,
                "totalDevices" => $totalDevices,
                "recentActivities24h" => $recent24h
            ]
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: USERS LIST
    // -------------------------------------------------------------
    if ($action === 'users') {
        $sql = "
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.role, 
                u.is_active, 
                u.email_verified, 
                u.oauth_provider, 
                u.created_at, 
                u.last_login_at,
                (SELECT COUNT(*) FROM displays d WHERE d.user_id = u.id) AS display_count,
                (SELECT COUNT(*) FROM widgets w JOIN displays d2 ON w.display_id = d2.id WHERE d2.user_id = u.id) AS widget_count
            FROM users u
            ORDER BY u.created_at DESC
        ";
        $users = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

        // Format booleans
        foreach ($users as &$u) {
            $u['is_active'] = (bool)$u['is_active'];
            $u['email_verified'] = (bool)$u['email_verified'];
            $u['display_count'] = (int)$u['display_count'];
            $u['widget_count'] = (int)$u['widget_count'];
        }

        echo json_encode([
            "success" => true,
            "users" => $users,
            "count" => count($users),
            "maxCapacity" => 50
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: TOGGLE USER STATUS (Active / Inactive)
    // -------------------------------------------------------------
    if ($action === 'toggle_user_status') {
        $targetUserId = (int)($input['userId'] ?? 0);
        $isActive = !empty($input['isActive']) ? 1 : 0;

        if ($targetUserId <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid user ID is required"]);
            exit();
        }

        if ($targetUserId === (int)$currentAdmin['id']) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "You cannot deactivate your own Super Admin account"]);
            exit();
        }

        $targetUser = $pdo->prepare("SELECT email, role FROM users WHERE id = ?");
        $targetUser->execute([$targetUserId]);
        $target = $targetUser->fetch();

        if (!$target) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "User not found"]);
            exit();
        }

        $up = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        $up->execute([$isActive, $targetUserId]);

        logUserActivity($pdo, $currentAdmin['id'], $currentAdmin['email'], 'USER_STATUS_TOGGLED', [
            "targetUserId" => $targetUserId,
            "targetEmail" => $target['email'],
            "newStatus" => $isActive ? 'active' : 'inactive'
        ]);

        echo json_encode([
            "success" => true,
            "message" => "User status updated to " . ($isActive ? 'Active' : 'Deactivated')
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: UPDATE ROLE
    // -------------------------------------------------------------
    if ($action === 'update_role') {
        $targetUserId = (int)($input['userId'] ?? 0);
        $newRole = strtolower(trim($input['role'] ?? ''));

        if (!in_array($newRole, ['user', 'admin', 'superadmin'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid role. Must be 'user', 'admin', or 'superadmin'"]);
            exit();
        }

        if ($targetUserId === (int)$currentAdmin['id'] && $newRole !== 'superadmin') {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "You cannot demote your own Super Admin role"]);
            exit();
        }

        $targetUser = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $targetUser->execute([$targetUserId]);
        $target = $targetUser->fetch();

        if (!$target) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "User not found"]);
            exit();
        }

        $up = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
        $up->execute([$newRole, $targetUserId]);

        logUserActivity($pdo, $currentAdmin['id'], $currentAdmin['email'], 'USER_ROLE_UPDATED', [
            "targetUserId" => $targetUserId,
            "targetEmail" => $target['email'],
            "newRole" => $newRole
        ]);

        echo json_encode([
            "success" => true,
            "message" => "User role elevated to " . ucfirst($newRole)
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: DELETE USER
    // -------------------------------------------------------------
    if ($action === 'delete_user') {
        $targetUserId = (int)($input['userId'] ?? 0);

        if ($targetUserId <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Valid user ID is required"]);
            exit();
        }

        if ($targetUserId === (int)$currentAdmin['id']) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "You cannot delete your own Super Admin account"]);
            exit();
        }

        $targetUser = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $targetUser->execute([$targetUserId]);
        $target = $targetUser->fetch();

        if (!$target) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "User not found"]);
            exit();
        }

        $del = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $del->execute([$targetUserId]);

        logUserActivity($pdo, $currentAdmin['id'], $currentAdmin['email'], 'USER_DELETED', [
            "deletedUserId" => $targetUserId,
            "deletedEmail" => $target['email']
        ]);

        echo json_encode([
            "success" => true,
            "message" => "User and all associated displays deleted successfully"
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: ACTIVITIES AUDIT STREAM
    // -------------------------------------------------------------
    if ($action === 'activities') {
        $limit = min(200, max(10, (int)($_GET['limit'] ?? 50)));
        $sql = "
            SELECT id, user_id, user_email, action, details, ip_address, created_at 
            FROM user_activity_logs 
            ORDER BY created_at DESC 
            LIMIT {$limit}
        ";
        $logs = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

        foreach ($logs as &$log) {
            $log['details'] = !empty($log['details']) ? json_decode($log['details'], true) : null;
        }

        echo json_encode([
            "success" => true,
            "activities" => $logs,
            "count" => count($logs)
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: USER DISPLAYS INSPECTOR
    // -------------------------------------------------------------
    if ($action === 'user_displays') {
        $targetUserId = (int)($_GET['user_id'] ?? 0);
        if ($targetUserId <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Target user ID required"]);
            exit();
        }

        $dispStmt = $pdo->prepare("
            SELECT id, token, name, theme, orientation, refresh_interval, created_at,
                   (SELECT COUNT(*) FROM widgets w WHERE w.display_id = displays.id) AS widget_count
            FROM displays 
            WHERE user_id = ?
            ORDER BY id ASC
        ");
        $dispStmt->execute([$targetUserId]);
        $displays = $dispStmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "userId" => $targetUserId,
            "displays" => $displays
        ]);
        exit();
    }

    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid action specified"]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Super Admin error: " . $e->getMessage()]);
}
