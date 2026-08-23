<?php
require_once 'db.php';

$action = $_GET['action'] ?? 'login';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

if ($action === 'login') {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(["error" => "Email and password are required"]);
        exit();
    }

    try {
        // Check if any users exist; if not, create the first user as admin automatically
        $countStmt = $pdo->query("SELECT COUNT(*) FROM users");
        $userCount = (int)$countStmt->fetchColumn();

        if ($userCount === 0) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $insert = $pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
            $insert->execute(['Admin', $email, $hash]);
        }

        // Fetch user by email
        $stmt = $pdo->prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid email or password"]);
            exit();
        }

        // Generate secure 64-char token
        $token = bin2hex(random_bytes(32));
        $updateStmt = $pdo->prepare("UPDATE users SET auth_token = ? WHERE id = ?");
        $updateStmt->execute([$token, $user['id']]);

        echo json_encode([
            "success" => true,
            "token" => $token,
            "user" => [
                "id" => (int)$user['id'],
                "name" => $user['name'] ?? 'Admin',
                "email" => $user['email']
            ]
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Authentication failed: " . $e->getMessage()]);
    }
    exit();
}

if ($action === 'me') {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = '';

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
    }

    if (empty($token)) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE auth_token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid or expired session"]);
            exit();
        }

        echo json_encode([
            "success" => true,
            "user" => [
                "id" => (int)$user['id'],
                "name" => $user['name'] ?? 'Admin',
                "email" => $user['email']
            ]
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Session check failed: " . $e->getMessage()]);
    }
    exit();
}

if ($action === 'logout') {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $stmt = $pdo->prepare("UPDATE users SET auth_token = NULL WHERE auth_token = ?");
        $stmt->execute([$token]);
    }
    echo json_encode(["success" => true, "message" => "Logged out successfully"]);
    exit();
}

http_response_code(400);
echo json_encode(["error" => "Invalid auth action"]);
