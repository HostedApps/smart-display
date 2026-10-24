<?php
if (!headers_sent()) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Content-Type: application/json; charset=UTF-8");
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

/**
 * Validates Google reCAPTCHA v2 / v3 token against Google's official siteverify endpoint.
 * Secret key is loaded dynamically from RECAPTCHA_SECRET_KEY environment variable.
 */
function verifyGoogleRecaptcha($recaptchaToken) {
    if (empty($recaptchaToken)) {
        return false;
    }

    // Test environments only (ALLOW_TEST_CAPTCHA=1 in .env, set by CI): accept the test runner's
    // token and skip verification when no secret is configured. Production fails closed.
    $allowTest = getEnvValue('ALLOW_TEST_CAPTCHA') === '1';
    if ($allowTest && $recaptchaToken === 'test_recaptcha_bypass_token') {
        return true;
    }

    $secret = getEnvValue('RECAPTCHA_SECRET_KEY');
    if (empty($secret)) {
        return $allowTest;
    }

    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $postData = [
        'secret' => $secret,
        'response' => $recaptchaToken,
        'remoteip' => getClientIp()
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $response = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr || !$response) {
        return false;
    }

    $json = json_decode($response, true);
    return !empty($json['success']);
}

function verifyCaptchaChallenge($pdo, $token, $userAnswer) {
    if (empty($token) || $userAnswer === null || $userAnswer === '') {
        return false;
    }

    $cleanToken = trim($token);
    $cleanAnswer = trim(strtolower((string)$userAnswer));
    $now = time();

    try {
        $stmt = $pdo->prepare("SELECT answer_hash, expires_at FROM captcha_challenges WHERE challenge_token = ?");
        $stmt->execute([$cleanToken]);
        $row = $stmt->fetch();

        if (!$row) {
            return false;
        }

        // Check expiration
        if ((int)$row['expires_at'] < $now) {
            $del = $pdo->prepare("DELETE FROM captcha_challenges WHERE challenge_token = ?");
            $del->execute([$cleanToken]);
            return false;
        }

        // Compare answer hash using HMAC with server-side CAPTCHA_SECRET
        $captchaSecret = getEnvValue('CAPTCHA_SECRET', 'kiosk_captcha_default_salt_2026');
        $expectedHash = $row['answer_hash'];
        $computedHash = hash_hmac('sha256', $cleanAnswer, $captchaSecret);

        // Delete token immediately so it cannot be reused (single-use nonce)
        $del = $pdo->prepare("DELETE FROM captcha_challenges WHERE challenge_token = ?");
        $del->execute([$cleanToken]);

        return hash_equals($expectedHash, $computedHash);
    } catch (\Exception $e) {
        return false;
    }
}

// If invoked directly via GET, generate a fresh challenge
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    checkRateLimit($pdo, 'captcha', 60, 60);

    // Housekeeping: delete expired challenges older than 15 minutes
    try {
        $cleanStmt = $pdo->prepare("DELETE FROM captcha_challenges WHERE expires_at < ?");
        $cleanStmt->execute([time() - 900]);
    } catch (\Exception $e) {}

    // Generate math challenge
    $operations = ['+', '-', '*'];
    $selectedOp = $operations[rand(0, 1)]; // Prefer + and - for quick human solve

    if ($selectedOp === '+') {
        $num1 = rand(3, 25);
        $num2 = rand(2, 19);
        $answer = $num1 + $num2;
        $question = "What is {$num1} + {$num2}?";
    } elseif ($selectedOp === '-') {
        $num1 = rand(10, 30);
        $num2 = rand(2, $num1 - 1);
        $answer = $num1 - $num2;
        $question = "What is {$num1} - {$num2}?";
    } else {
        $num1 = rand(2, 9);
        $num2 = rand(2, 9);
        $answer = $num1 * $num2;
        $question = "What is {$num1} × {$num2}?";
    }

    $token = bin2hex(random_bytes(24));
    $expiresAt = time() + 300; // 5 minute TTL
    $captchaSecret = getEnvValue('CAPTCHA_SECRET', 'kiosk_captcha_default_salt_2026');
    $answerHash = hash_hmac('sha256', (string)$answer, $captchaSecret);

    try {
        $ins = $pdo->prepare("INSERT INTO captcha_challenges (challenge_token, answer_hash, expires_at) VALUES (?, ?, ?)");
        $ins->execute([$token, $answerHash, $expiresAt]);

        echo json_encode([
            "success" => true,
            "captchaToken" => $token,
            "question" => $question,
            "num1" => $num1,
            "op" => $selectedOp,
            "num2" => $num2,
            "expiresInSeconds" => 300
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Failed to generate security challenge: " . $e->getMessage()
        ]);
    }
    exit();
}
