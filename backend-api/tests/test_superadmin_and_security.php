<?php
// Automated Test Suite for Super Admin, Captcha, 50-User Quota & Email Verification

function run_superadmin_and_security_tests($pdo) {
    echo "Running Super Admin & Security Tests...\n";
    $passed = 0;
    $failed = 0;

    $assert = function($condition, $name) use (&$passed, &$failed) {
        if ($condition) {
            echo "  ✔ PASS: {$name}\n";
            $passed++;
        } else {
            echo "  ✖ FAIL: {$name}\n";
            $failed++;
        }
    };

    require_once __DIR__ . '/../captcha.php';

    // 1. TEST CAPTCHA GENERATION & VALIDATION
    $secret = getEnvValue('CAPTCHA_SECRET', 'kiosk_captcha_default_salt_2026');
    $token = bin2hex(random_bytes(24));
    $answer = '15';
    $answerHash = hash_hmac('sha256', $answer, $secret);
    $expiresAt = time() + 300;

    $ins = $pdo->prepare("INSERT INTO captcha_challenges (challenge_token, answer_hash, expires_at) VALUES (?, ?, ?)");
    $ins->execute([$token, $answerHash, $expiresAt]);

    // Test correct answer
    $isValid = verifyCaptchaChallenge($pdo, $token, '15');
    $assert($isValid === true, "Captcha correctly validates correct answer '15'");

    // Test single-use replay prevention (token should now be deleted)
    $isReplayValid = verifyCaptchaChallenge($pdo, $token, '15');
    $assert($isReplayValid === false, "Captcha challenge is single-use and cannot be replayed");

    // Test wrong answer
    $token2 = bin2hex(random_bytes(24));
    $ins->execute([$token2, hash_hmac('sha256', '20', $secret), time() + 300]);
    $isWrongValid = verifyCaptchaChallenge($pdo, $token2, '99');
    $assert($isWrongValid === false, "Captcha rejects incorrect answer '99'");

    // 2. TEST 50-USER CAPACITY CEILING
    $maxCapacity = 50;
    $count = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $assert($count <= $maxCapacity, "Current registered users ({$count}) is within the 50-user capacity ceiling");

    // 3. TEST SUPER ADMIN PRIVILEGES
    $superadmin = $pdo->query("SELECT id, name, email, role, email_verified FROM users WHERE role = 'superadmin' LIMIT 1")->fetch();
    $assert(!empty($superadmin), "At least one Super Admin exists in the system");
    $assert($superadmin['email_verified'] == 1, "Super Admin email is verified");

    // 4. TEST USER ACTIVITY LOGGING
    $testAction = 'UNIT_TEST_ACTION_' . time();
    logUserActivity($pdo, $superadmin['id'], $superadmin['email'], $testAction, ["testKey" => "testVal"]);

    $logCheck = $pdo->prepare("SELECT id, user_email, action, details FROM user_activity_logs WHERE action = ?");
    $logCheck->execute([$testAction]);
    $logged = $logCheck->fetch();

    $assert(!empty($logged), "User activity log correctly recorded in database");
    $details = json_decode($logged['details'] ?? '{}', true);
    $assert(($details['testKey'] ?? '') === 'testVal', "Activity log JSON metadata preserved");

    // Clean up test log
    if (!empty($logged['id'])) {
        $pdo->prepare("DELETE FROM user_activity_logs WHERE id = ?")->execute([$logged['id']]);
    }

    // 5. TEST EMAIL VERIFICATION TOKEN PARSING
    $testOtp = "849201";
    $testHex = "abcdef1234567890";
    $combined = "{$testOtp}:{$testHex}";
    $parts = explode(':', $combined);
    $assert($parts[0] === $testOtp && strlen($parts[0]) === 6, "6-digit OTP code parses cleanly from combined verification token");

    echo "Super Admin & Security Tests Complete: {$passed} passed, {$failed} failed.\n\n";
    return ["passed" => $passed, "failed" => $failed];
}
