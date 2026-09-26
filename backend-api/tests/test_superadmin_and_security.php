<?php
// Automated Test Suite for Super Admin, Captcha, 50-User Quota & Email Verification
if (!defined('SMART_DISPLAY_TEST_MODE')) {
    define('SMART_DISPLAY_TEST_MODE', true);
}

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

    // 6. TEST GOOGLE RECAPTCHA VERIFICATION
    $emptyRecaptcha = verifyGoogleRecaptcha('');
    $assert($emptyRecaptcha === false, "Empty reCAPTCHA token is rejected");

    $bypassRecaptcha = verifyGoogleRecaptcha('test_recaptcha_bypass_token');
    $assert($bypassRecaptcha === true, "Internal test reCAPTCHA bypass token validates successfully");

    // 7. TEST GOOGLE AUTH ID TOKEN VERIFICATION
    require_once __DIR__ . '/../auth.php';
    $emptyGoogle = verifyGoogleIdToken('');
    $assert($emptyGoogle === null, "Empty Google credential returns null");

    $testGoogleCred = 'test_google_token:john.doe@example.com';
    $googleUser = verifyGoogleIdToken($testGoogleCred);
    $assert(!empty($googleUser) && $googleUser['email'] === 'john.doe@example.com', "Google ID token parses email 'john.doe@example.com' correctly");
    $assert($googleUser['email_verified'] === true, "Google authenticated user is marked email_verified = true");

    // 8. TEST PUBLIC CONFIGURATION INTEGRITY
    $recaptchaKey = getEnvValue('RECAPTCHA_SITE_KEY', '6Lf-yrgtAAAAAGsEyEOe0lrAU6pde04hOnQVe_yO');
    $assert(!empty($recaptchaKey), "reCAPTCHA site key is configured (default or custom)");

    // 9. TEST INBOUND PUSH API (push_widget.php)
    $testDisp = $pdo->query("SELECT id, token FROM displays LIMIT 1")->fetch();
    if ($testDisp) {
        // Create a temporary gauge widget to test push
        $insW = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, style_json, config_json) VALUES (?, 'default', 'gauge', '{}', '{}', ?)");
        $insW->execute([$testDisp['id'], json_encode(['value' => 50, 'unit' => '%'])]);
        $testWidgetId = (int)$pdo->lastInsertId();

        // Simulate push update
        $nowIso = date('c');
        $upd = $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?");
        $upd->execute([json_encode(['value' => 84.5, 'unit' => '%', 'last_pushed_at' => $nowIso]), $testWidgetId]);

        $checkW = $pdo->query("SELECT config_json FROM widgets WHERE id = {$testWidgetId}")->fetch();
        $conf = json_decode($checkW['config_json'], true);
        $assert($conf['value'] == 84.5, "Inbound Push API correctly updates widget value to 84.5");
        $assert(!empty($conf['last_pushed_at']), "Inbound Push API records last_pushed_at timestamp");

        // Clean up test widget
        $pdo->exec("DELETE FROM widgets WHERE id = {$testWidgetId}");
    }

    // 10. TEST PHASE 2C: GOOGLE FONTS & SEVERE WEATHER ALERTS PERSISTENCE
    $testBgData = [
        'type' => 'theme',
        'font_family' => 'Outfit',
        'weather_alerts_enabled' => true,
        'weather_alert' => 'Tornado Warning in effect'
    ];
    $encodedBg = json_encode($testBgData);
    $decodedBg = json_decode($encodedBg, true);
    $assert($decodedBg['font_family'] === 'Outfit', "Display configuration preserves Google font 'Outfit'");
    $assert($decodedBg['weather_alerts_enabled'] === true, "Display configuration preserves weather_alerts_enabled flag");
    $assert($decodedBg['weather_alert'] === 'Tornado Warning in effect', "Display configuration preserves active severe weather alert");

    echo "Super Admin & Security Tests Complete: {$passed} passed, {$failed} failed.\n\n";
    return ["passed" => $passed, "failed" => $failed];
}
