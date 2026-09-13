<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

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

        // Compare answer hash (or lowercase alphanumeric string)
        $expectedHash = $row['answer_hash'];
        $computedHash = hash('sha256', $cleanAnswer);

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
    $answerHash = hash('sha256', (string)$answer);

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
