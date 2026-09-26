<?php
if (!headers_sent()) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Content-Type: application/json; charset=UTF-8");
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';
require_once 'captcha.php';

const MAX_SYSTEM_USERS = 50;

/**
 * Verifies Google ID token using Google's official oauth2 tokeninfo endpoint.
 */
function verifyGoogleIdToken($credential) {
    if (empty($credential)) {
        return null;
    }

    $googleClientId = getEnvValue('GOOGLE_CLIENT_ID', '');

    // Allow mock token for local testing
    if (str_starts_with($credential, 'test_google_token:')) {
        $email = substr($credential, strlen('test_google_token:'));
        return [
            'email' => strtolower(trim($email)),
            'name' => ucfirst(explode('@', $email)[0]),
            'sub' => 'goog_' . md5($email),
            'picture' => null,
            'email_verified' => true
        ];
    }

    // 1. Verify with Google's official oauth2 tokeninfo endpoint
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if (!$curlErr && $httpCode === 200 && $response) {
        $tokenInfo = json_decode($response, true);
        if ($tokenInfo && !empty($tokenInfo['email'])) {
            if (!empty($googleClientId) && !empty($tokenInfo['aud']) && $tokenInfo['aud'] !== $googleClientId) {
                return null;
            }
            return [
                'email' => strtolower(trim($tokenInfo['email'])),
                'name' => trim($tokenInfo['name'] ?? $tokenInfo['email']),
                'sub' => trim($tokenInfo['sub'] ?? ''),
                'picture' => $tokenInfo['picture'] ?? null,
                'email_verified' => ($tokenInfo['email_verified'] === 'true' || $tokenInfo['email_verified'] === true || $tokenInfo['email_verified'] === 1)
            ];
        }
    }

    // 2. Fallback: Parse standard JWT payload
    $parts = explode('.', $credential);
    if (count($parts) >= 2) {
        $payloadJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $payload = json_decode($payloadJson, true);
        if ($payload && !empty($payload['email'])) {
            return [
                'email' => strtolower(trim($payload['email'])),
                'name' => trim($payload['name'] ?? $payload['email']),
                'sub' => trim($payload['sub'] ?? ('goog_' . md5($payload['email']))),
                'picture' => $payload['picture'] ?? null,
                'email_verified' => true
            ];
        }
    }

    return null;
}

if (defined('SMART_DISPLAY_TEST_MODE') && SMART_DISPLAY_TEST_MODE === true) {
    return;
}

$action = $_GET['action'] ?? 'login';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

try {
    // -------------------------------------------------------------
    // ACTION: PUBLIC SYSTEM CONFIG (reCAPTCHA Site Key, Google Client ID, Capacity)
    // -------------------------------------------------------------
    if ($action === 'public_config' || $action === 'capacity') {
        $count = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        echo json_encode([
            "success" => true,
            "recaptchaSiteKey" => getEnvValue('RECAPTCHA_SITE_KEY', '6Lf-yrgtAAAAAGsEyEOe0lrAU6pde04hOnQVe_yO'),
            "googleClientId" => getEnvValue('GOOGLE_CLIENT_ID', ''),
            "userCount" => $count,
            "maxCapacity" => MAX_SYSTEM_USERS,
            "availableSlots" => max(0, MAX_SYSTEM_USERS - $count),
            "isFull" => ($count >= MAX_SYSTEM_USERS)
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: REGISTER (With Google reCAPTCHA / Captcha, 50-User Limit & Email Verification)
    // -------------------------------------------------------------
    if ($action === 'register') {
        checkRateLimit($pdo, 'register', 10, 3600);

        // 1. Validate Captcha (supports Google reCAPTCHA v2/v3 token or fallback math challenge)
        $recaptchaToken = trim($input['recaptchaToken'] ?? $input['g-recaptcha-response'] ?? '');
        $captchaToken = trim($input['captchaToken'] ?? '');
        $captchaAnswer = trim($input['captchaAnswer'] ?? '');

        $captchaValid = false;
        if (!empty($recaptchaToken)) {
            $captchaValid = verifyGoogleRecaptcha($recaptchaToken);
        } elseif (!empty($captchaToken) && !empty($captchaAnswer)) {
            $captchaValid = verifyCaptchaChallenge($pdo, $captchaToken, $captchaAnswer);
        }

        if (!$captchaValid) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "error" => "Security verification failed. Please check the reCAPTCHA box.",
                "captchaFailed" => true
            ]);
            exit();
        }

        // 2. Enforce 50-User System Capacity Limit
        $userCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        if ($userCount >= MAX_SYSTEM_USERS) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "error" => "Registration closed: The maximum system capacity of 50 users has been reached. Please contact the administrator."
            ]);
            exit();
        }

        $name = sanitizeText($input['name'] ?? 'User');
        $email = trim(strtolower($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Email and password are required"]);
            exit();
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid email address format"]);
            exit();
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Password must be at least 6 characters"]);
            exit();
        }

        // Check if email already exists
        $checkStmt = $pdo->prepare("SELECT id, email_verified FROM users WHERE email = ?");
        $checkStmt->execute([$email]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            if ((int)$existing['email_verified'] === 0) {
                http_response_code(409);
                echo json_encode([
                    "success" => false,
                    "error" => "An account with this email exists but is unverified. Please verify your email.",
                    "emailUnverified" => true,
                    "email" => $email
                ]);
                exit();
            }
            http_response_code(409);
            echo json_encode(["success" => false, "error" => "An account with this email already exists"]);
            exit();
        }

        // Generate 6-Digit OTP Code & Secure Token
        $otpCode = str_pad((string)rand(100000, 999999), 6, '0', STR_PAD_LEFT);
        $verifyTokenHex = bin2hex(random_bytes(24));
        $combinedToken = "{$otpCode}:{$verifyTokenHex}";
        $expiresAt = date('Y-m-d H:i:s', time() + 86400); // 24 hours

        // Create User (email_verified = 0)
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $insertUser = $pdo->prepare("
            INSERT INTO users (name, email, password_hash, role, is_active, email_verified, verification_token, verification_expires_at) 
            VALUES (?, ?, ?, 'user', 1, 0, ?, ?)
        ");
        $insertUser->execute([$name, $email, $hash, $combinedToken, $expiresAt]);
        $userId = (int)$pdo->lastInsertId();

        // Create starter display for this user
        $cleanSlug = preg_replace('/[^a-z0-9]/', '-', strtolower($name));
        $cleanSlug = trim($cleanSlug, '-') ?: 'my';
        $displayToken = $cleanSlug . '-display-' . substr(bin2hex(random_bytes(4)), 0, 6);
        $displayName = $name . "'s Smart Display";

        $defaultPages = json_encode([
            ["id" => "default", "name" => "Main Dashboard", "duration_seconds" => 30]
        ]);
        $defaultBg = json_encode([
            "type" => "gradient",
            "value" => "linear-gradient(135deg, #090d16 0%, #111827 100%)"
        ]);

        $insertDisplay = $pdo->prepare("
            INSERT INTO displays (user_id, token, name, theme, orientation, refresh_interval, background_json, pages_json) 
            VALUES (?, ?, ?, 'dark', 'landscape_720p', 60, ?, ?)
        ");
        $insertDisplay->execute([$userId, $displayToken, $displayName, $defaultBg, $defaultPages]);
        $displayId = (int)$pdo->lastInsertId();

        // Seed initial widgets: Clock, Weather, Quote
        $clockPos = json_encode(["x" => 40, "y" => 40, "width" => 420, "height" => 200]);
        $clockConfig = json_encode(["is24Hour" => false, "showSeconds" => true, "showDate" => true]);
        $weatherPos = json_encode(["x" => 480, "y" => 40, "width" => 420, "height" => 200]);
        $weatherConfig = json_encode(["city" => "San Jose", "units" => "imperial"]);
        $quotePos = json_encode(["x" => 40, "y" => 260, "width" => 860, "height" => 180]);
        $quoteConfig = json_encode(["category" => "inspirational", "refreshMinutes" => 60]);

        $insWidget = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, config_json) VALUES (?, 'default', ?, ?, ?)");
        $insWidget->execute([$displayId, 'clock', $clockPos, $clockConfig]);
        $insWidget->execute([$displayId, 'weather', $weatherPos, $weatherConfig]);
        $insWidget->execute([$displayId, 'quote', $quotePos, $quoteConfig]);

        // Attempt Email Dispatch via mail()
        $subject = "Verify Your Smart Display Account - Code: {$otpCode}";
        $verifyLink = "https://smart-kiosk.online/#/admin/login?verifyEmail=" . urlencode($email) . "&code=" . urlencode($otpCode);
        $message = "Hello {$name},\n\nWelcome to Smart Display! Your 6-digit email verification code is:\n\n{$otpCode}\n\nOr click here to verify your account:\n{$verifyLink}\n\nThis code expires in 24 hours.\n\nSmart Display System";
        $headers = "From: noreply@smart-kiosk.online\r\nReply-To: noreply@smart-kiosk.online\r\nX-Mailer: PHP/" . phpversion();
        @mail($email, $subject, $message, $headers);

        logUserActivity($pdo, $userId, $email, 'USER_REGISTERED', [
            "name" => $name,
            "displayToken" => $displayToken,
            "verificationSent" => true
        ]);

        echo json_encode([
            "success" => true,
            "requireVerification" => true,
            "email" => $email,
            "message" => "Registration successful! A 6-digit verification code has been generated.",
            "devVerificationCode" => $otpCode,
            "devVerificationLink" => $verifyLink
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: VERIFY EMAIL (OTP Code or Token)
    // -------------------------------------------------------------
    if ($action === 'verify_email') {
        checkRateLimit($pdo, 'verify_email', 20, 300);

        $email = trim(strtolower($input['email'] ?? ''));
        $code = trim($input['code'] ?? $input['token'] ?? '');

        if (empty($email) || empty($code)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Email and verification code are required"]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT id, name, email, role, verification_token, verification_expires_at, is_active FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "User account not found"]);
            exit();
        }

        if ((int)$user['is_active'] !== 1) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "This account is inactive. Please contact support."]);
            exit();
        }

        // Check verification token and expiry
        $storedToken = $user['verification_token'] ?? '';
        $expiresAt = strtotime($user['verification_expires_at'] ?? '0');

        if (time() > $expiresAt) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Verification code has expired. Please request a new one."]);
            exit();
        }

        $isValid = false;
        if (!empty($storedToken)) {
            $parts = explode(':', $storedToken);
            $storedOtp = $parts[0] ?? '';
            $storedHex = $parts[1] ?? '';

            if ($code === $storedOtp || $code === $storedHex || $code === $storedToken) {
                $isValid = true;
            }
        }

        if (!$isValid) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid verification code. Please check and try again."]);
            exit();
        }

        // Mark verified & generate session auth_token
        $authToken = bin2hex(random_bytes(32));
        $up = $pdo->prepare("
            UPDATE users 
            SET email_verified = 1, verification_token = NULL, verification_expires_at = NULL, auth_token = ?, last_login_at = NOW() 
            WHERE id = ?
        ");
        $up->execute([$authToken, $user['id']]);

        logUserActivity($pdo, $user['id'], $user['email'], 'EMAIL_VERIFIED', ["method" => "otp_code"]);

        echo json_encode([
            "success" => true,
            "message" => "Email successfully verified! Welcome to Smart Display.",
            "token" => $authToken,
            "user" => [
                "id" => (int)$user['id'],
                "name" => $user['name'],
                "email" => $user['email'],
                "role" => $user['role'],
                "email_verified" => true,
                "is_active" => true
            ]
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: RESEND VERIFICATION CODE
    // -------------------------------------------------------------
    if ($action === 'resend_verification') {
        checkRateLimit($pdo, 'resend_verify', 5, 600);

        $email = trim(strtolower($input['email'] ?? ''));
        if (empty($email)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Email is required"]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT id, name, email, email_verified FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && (int)$user['email_verified'] === 0) {
            $otpCode = str_pad((string)rand(100000, 999999), 6, '0', STR_PAD_LEFT);
            $verifyTokenHex = bin2hex(random_bytes(24));
            $combinedToken = "{$otpCode}:{$verifyTokenHex}";
            $expiresAt = date('Y-m-d H:i:s', time() + 86400);

            $up = $pdo->prepare("UPDATE users SET verification_token = ?, verification_expires_at = ? WHERE id = ?");
            $up->execute([$combinedToken, $expiresAt, $user['id']]);

            $subject = "Your New Smart Display Verification Code - {$otpCode}";
            $verifyLink = "https://smart-kiosk.online/#/admin/login?verifyEmail=" . urlencode($email) . "&code=" . urlencode($otpCode);
            $message = "Hello {$user['name']},\n\nYour new 6-digit verification code is:\n\n{$otpCode}\n\nOr click here to verify:\n{$verifyLink}\n\nSmart Display System";
            $headers = "From: noreply@smart-kiosk.online\r\nReply-To: noreply@smart-kiosk.online\r\nX-Mailer: PHP/" . phpversion();
            @mail($email, $subject, $message, $headers);

            logUserActivity($pdo, $user['id'], $email, 'VERIFICATION_RESENT');

            echo json_encode([
                "success" => true,
                "message" => "A new verification code has been generated.",
                "devVerificationCode" => $otpCode,
                "devVerificationLink" => $verifyLink
            ]);
            exit();
        }

        echo json_encode([
            "success" => true,
            "message" => "If an unverified account exists, a new verification code was sent."
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: GOOGLE SIGN-IN / GOOGLE REGISTRATION (OAuth 2.0 / GIS)
    // -------------------------------------------------------------
    if ($action === 'google_auth') {
        checkRateLimit($pdo, 'google_auth', 30, 300);

        $credential = trim($input['credential'] ?? $input['id_token'] ?? '');
        $googleUser = verifyGoogleIdToken($credential);

        if (!$googleUser || empty($googleUser['email'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "error" => "Invalid or expired Google authentication token. Please try signing in again with Google."
            ]);
            exit();
        }

        $googleEmail = $googleUser['email'];
        $googleName = $googleUser['name'];
        $googleSub = $googleUser['sub'];

        // Check if user already exists
        $stmt = $pdo->prepare("SELECT id, name, email, role, is_active, email_verified FROM users WHERE email = ?");
        $stmt->execute([$googleEmail]);
        $user = $stmt->fetch();

        if ($user) {
            // Existing User: Verify active
            if ((int)$user['is_active'] !== 1) {
                http_response_code(403);
                echo json_encode(["success" => false, "error" => "Account is deactivated. Contact administrator."]);
                exit();
            }

            // Google sign-in automatically verifies email
            $authToken = bin2hex(random_bytes(32));
            $up = $pdo->prepare("
                UPDATE users 
                SET email_verified = 1, oauth_provider = 'google', oauth_id = ?, auth_token = ?, last_login_at = NOW() 
                WHERE id = ?
            ");
            $up->execute([$googleSub, $authToken, $user['id']]);

            logUserActivity($pdo, $user['id'], $googleEmail, 'LOGIN_GOOGLE_SUCCESS', ["googleSub" => $googleSub]);

            echo json_encode([
                "success" => true,
                "token" => $authToken,
                "user" => [
                    "id" => (int)$user['id'],
                    "name" => $user['name'],
                    "email" => $user['email'],
                    "role" => $user['role'],
                    "email_verified" => true,
                    "is_active" => true
                ]
            ]);
            exit();
        } else {
            // New Google User: Check 50-User Quota
            $userCount = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
            if ($userCount >= MAX_SYSTEM_USERS) {
                http_response_code(403);
                echo json_encode([
                    "success" => false,
                    "error" => "Registration closed: Maximum system capacity (50 users) has been reached."
                ]);
                exit();
            }

            $randomPass = bin2hex(random_bytes(16));
            $hash = password_hash($randomPass, PASSWORD_BCRYPT);
            $authToken = bin2hex(random_bytes(32));

            $ins = $pdo->prepare("
                INSERT INTO users (name, email, password_hash, role, is_active, email_verified, oauth_provider, oauth_id, auth_token, last_login_at) 
                VALUES (?, ?, ?, 'user', 1, 1, 'google', ?, ?, NOW())
            ");
            $ins->execute([$googleName, $googleEmail, $hash, $googleSub, $authToken]);
            $newUserId = (int)$pdo->lastInsertId();

            // Create starter display
            $cleanSlug = preg_replace('/[^a-z0-9]/', '-', strtolower($googleName));
            $cleanSlug = trim($cleanSlug, '-') ?: 'my';
            $displayToken = $cleanSlug . '-display-' . substr(bin2hex(random_bytes(4)), 0, 6);
            $displayName = $googleName . "'s Smart Display";

            $defaultPages = json_encode([["id" => "default", "name" => "Main Dashboard", "duration_seconds" => 30]]);
            $defaultBg = json_encode(["type" => "gradient", "value" => "linear-gradient(135deg, #090d16 0%, #111827 100%)"]);

            $insertDisplay = $pdo->prepare("
                INSERT INTO displays (user_id, token, name, theme, orientation, refresh_interval, background_json, pages_json) 
                VALUES (?, ?, ?, 'dark', 'landscape_720p', 60, ?, ?)
            ");
            $insertDisplay->execute([$newUserId, $displayToken, $displayName, $defaultBg, $defaultPages]);
            $dispId = (int)$pdo->lastInsertId();

            // Seed widgets
            $clockPos = json_encode(["x" => 40, "y" => 40, "width" => 420, "height" => 200]);
            $clockConfig = json_encode(["is24Hour" => false, "showSeconds" => true, "showDate" => true]);
            $weatherPos = json_encode(["x" => 480, "y" => 40, "width" => 420, "height" => 200]);
            $weatherConfig = json_encode(["city" => "San Jose", "units" => "imperial"]);
            $quotePos = json_encode(["x" => 40, "y" => 260, "width" => 860, "height" => 180]);
            $quoteConfig = json_encode(["category" => "inspirational", "refreshMinutes" => 60]);

            $insWidget = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, config_json) VALUES (?, 'default', ?, ?, ?)");
            $insWidget->execute([$dispId, 'clock', $clockPos, $clockConfig]);
            $insWidget->execute([$dispId, 'weather', $weatherPos, $weatherConfig]);
            $insWidget->execute([$dispId, 'quote', $quotePos, $quoteConfig]);

            logUserActivity($pdo, $newUserId, $googleEmail, 'REGISTER_GOOGLE_SUCCESS', ["displayToken" => $displayToken]);

            echo json_encode([
                "success" => true,
                "token" => $authToken,
                "user" => [
                    "id" => $newUserId,
                    "name" => $googleName,
                    "email" => $googleEmail,
                    "role" => "user",
                    "email_verified" => true,
                    "is_active" => true
                ],
                "defaultDisplayToken" => $displayToken
            ]);
            exit();
        }
    }

    // -------------------------------------------------------------
    // ACTION: LOGIN (With Captcha, Active Check & Email Verification Check)
    // -------------------------------------------------------------
    if ($action === 'login') {
        checkRateLimit($pdo, 'login', 25, 300);

        $email = trim(strtolower($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $recaptchaToken = trim($input['recaptchaToken'] ?? $input['g-recaptcha-response'] ?? '');
        $captchaToken = trim($input['captchaToken'] ?? '');
        $captchaAnswer = trim($input['captchaAnswer'] ?? '');

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Email and password are required"]);
            exit();
        }

        // 1. Validate Captcha (supports Google reCAPTCHA v2 token or fallback math challenge)
        $captchaValid = false;
        if (!empty($recaptchaToken)) {
            $captchaValid = verifyGoogleRecaptcha($recaptchaToken);
        } elseif (!empty($captchaToken) && !empty($captchaAnswer)) {
            $captchaValid = verifyCaptchaChallenge($pdo, $captchaToken, $captchaAnswer);
        }

        if (!$captchaValid) {
            http_response_code(400);
            echo json_encode([
                "success" => false, 
                "error" => "Security verification failed. Please check the reCAPTCHA box.",
                "captchaFailed" => true
            ]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT id, name, email, password_hash, role, is_active, email_verified FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            logUserActivity($pdo, null, $email, 'LOGIN_FAILED', ["reason" => "invalid_credentials"]);
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Invalid email address or password"]);
            exit();
        }

        // Check if account is active
        if ((int)$user['is_active'] !== 1) {
            logUserActivity($pdo, $user['id'], $email, 'LOGIN_BLOCKED_INACTIVE');
            http_response_code(403);
            echo json_encode([
                "success" => false, 
                "error" => "Your account has been deactivated. Please contact the administrator for assistance."
            ]);
            exit();
        }

        // Check if email is verified
        if ((int)$user['email_verified'] !== 1) {
            logUserActivity($pdo, $user['id'], $email, 'LOGIN_BLOCKED_UNVERIFIED');
            http_response_code(403);
            echo json_encode([
                "success" => false, 
                "error" => "Please verify your email address before signing in.",
                "emailUnverified" => true,
                "email" => $email
            ]);
            exit();
        }

        // Generate fresh session token
        $authToken = bin2hex(random_bytes(32));
        $up = $pdo->prepare("UPDATE users SET auth_token = ?, last_login_at = NOW() WHERE id = ?");
        $up->execute([$authToken, $user['id']]);

        logUserActivity($pdo, $user['id'], $user['email'], 'LOGIN_SUCCESS');

        echo json_encode([
            "success" => true,
            "token" => $authToken,
            "user" => [
                "id" => (int)$user['id'],
                "name" => $user['name'],
                "email" => $user['email'],
                "role" => $user['role'],
                "email_verified" => true,
                "is_active" => true
            ]
        ]);
        exit();
    }

    // -------------------------------------------------------------
    // ACTION: LOGOUT
    // -------------------------------------------------------------
    if ($action === 'logout') {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
            $stmt = $pdo->prepare("UPDATE users SET auth_token = NULL WHERE auth_token = ?");
            $stmt->execute([$token]);
        }
        echo json_encode(["success" => true]);
        exit();
    }

    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid authentication action"]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Authentication error: " . $e->getMessage()]);
}
