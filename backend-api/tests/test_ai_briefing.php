<?php
// AI briefing tests: access control, no invented facts, display-local time of day, and the
// Gemini rate-limit cooldown (served from the cache without calling Google).
// Exercises the real endpoint over HTTP against the running dev API server
// (override with SD_API_BASE, default http://localhost:8000/api).
if (!function_exists('assertTrue')) {
    $passed = 0;
    $failed = 0;

    function assertTrue($condition, $testName) {
        global $passed, $failed;
        if ($condition) {
            echo "  \033[32m✔ PASS:\033[0m $testName\n";
            $passed++;
        } else {
            echo "  \033[31m✖ FAIL:\033[0m $testName\n";
            $failed++;
        }
    }
}

require_once __DIR__ . '/../db.php';

function ab_http($body, array $headers = []) {
    $base = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
    $ch = curl_init($base . '/ai_briefing.php');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_TIMEOUT => 20,
    ]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'json' => is_string($res) ? json_decode($res, true) : null];
}

echo "Running AI Briefing Tests...\n";

if (ab_http([])['code'] === 0) {
    echo "  (skipped: API server not reachable)\n\n";
    return;
}
if (getenv('GEMINI_API_KEY')) {
    echo "  (note: GEMINI_API_KEY is set for this process; the API server's own environment decides which engine answers)\n";
}

$sfx = bin2hex(random_bytes(4));
$userToken = 'abtest_user_' . $sfx;
$deviceToken = 'abtest_device_' . $sfx;
$userId = null;
$displayId = null;
$cacheFiles = [];

try {
    $pdo->prepare("INSERT INTO users (name, email, password_hash, auth_token) VALUES ('AB User', ?, 'x', ?)")
        ->execute(["ab_user_{$sfx}@test.local", $userToken]);
    $userId = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO displays (user_id, token, name) VALUES (?, ?, 'AB Display')")->execute([$userId, "abtest-$sfx"]);
    $displayId = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO devices (display_id, device_token, device_name) VALUES (?, ?, 'AB Kiosk')")->execute([$displayId, $deviceToken]);

    $auth = ['Authorization: Bearer ' . $userToken];

    // ---- Access control ----
    $anon = ab_http(['localHour' => 9]);
    assertTrue($anon['code'] === 401, "Anonymous request → 401");
    $badDevice = ab_http(['localHour' => 9], ['X-Device-Token: nope-' . $sfx]);
    assertTrue($badDevice['code'] === 401, "Unknown device token → 401");
    $device = ab_http(['localHour' => 9], ['X-Device-Token: ' . $deviceToken]);
    assertTrue($device['code'] === 200 && ($device['json']['success'] ?? false) === true, "Paired kiosk (device token) → 200");

    // ---- No invented facts (template engine: no Gemini key sent) ----
    $bare = ab_http(['userName' => 'Sam', 'localHour' => 19, 'localDate' => 'Friday, October 9'], $auth);
    $text = $bare['json']['briefing'] ?? '';
    assertTrue($bare['code'] === 200 && $text !== '', "Signed-in user gets a briefing");
    assertTrue(stripos($text, 'sunny') === false && strpos($text, '°') === false, "No weather is invented when none is sent");
    assertTrue(($bare['json']['timeOfDay'] ?? '') === 'evening', "Time of day follows the display's local hour (19 → evening)");
    assertTrue(strpos($text, 'Sam') !== false, "Briefing addresses the configured name");

    $morning = ab_http(['localHour' => 7], $auth);
    assertTrue(($morning['json']['timeOfDay'] ?? '') === 'morning', "localHour 7 → morning");

    $withFacts = ab_http([
        'localHour' => 10,
        'location' => 'San Jose, California',
        'weather' => 'clear sky and 69°F',
        'events' => 'Dentist at 3:00 PM today'
    ], $auth);
    $factsText = $withFacts['json']['briefing'] ?? '';
    assertTrue(strpos($factsText, 'San Jose, California') !== false && strpos($factsText, '69°F') !== false, "Location and weather that were sent are used");
    assertTrue(strpos($factsText, 'Dentist at 3:00 PM today') !== false, "The next event that was sent is used");

    $tagged = ab_http(['localHour' => 10, 'location' => '<script>alert(1)</script>Paris'], $auth);
    assertTrue(strpos($tagged['json']['briefing'] ?? '', '<script>') === false, "HTML is stripped from context fields");

    // ---- Rate-limit cooldown: no call to Google, last good Gemini briefing served ----
    $fakeKey = 'abtest-not-a-real-key-' . $sfx;
    $keyId = md5($fakeKey);
    $cacheDir = sys_get_temp_dir() . '/sd_briefings';
    @mkdir($cacheDir, 0700, true);
    $cooldownFile = $cacheDir . '/cooldown_' . $keyId;
    $cacheFiles[] = $cooldownFile;
    file_put_contents($cooldownFile, (string)(time() + 1200));

    $cool = ab_http(['apiKey' => $fakeKey, 'localHour' => 10, 'localDate' => 'Friday, October 9'], $auth);
    assertTrue(($cool['json']['provider'] ?? '') === 'ambient_engine'
        && stripos($cool['json']['geminiError'] ?? '', 'rate limit') !== false
        && ($cool['json']['retryAfter'] ?? 0) > 1000, "During a cooldown Gemini isn't called and retryAfter is returned");

    // (key, userName, tone, location, timeOfDay, localDate) — must match ai_briefing.php
    $goodFile = $cacheDir . '/good_' . md5(json_encode([$keyId, '', 'warm', 'Lyon', 'morning', 'Friday, October 9'])) . '.json';
    $cacheFiles[] = $goodFile;
    file_put_contents($goodFile, json_encode(['briefing' => 'Earlier Gemini text', 'provider' => 'gemini', 'model' => 'test', 'generatedAt' => time() - 600]));
    $stale = ab_http(['apiKey' => $fakeKey, 'localHour' => 10, 'location' => 'Lyon', 'localDate' => 'Friday, October 9'], $auth);
    assertTrue(($stale['json']['briefing'] ?? '') === 'Earlier Gemini text' && ($stale['json']['stale'] ?? false) === true
        && ($stale['json']['provider'] ?? '') === 'gemini', "During a cooldown the last good Gemini briefing is served as stale");
} finally {
    foreach ($cacheFiles as $f) {
        @unlink($f);
    }
    if ($displayId) {
        $pdo->exec("DELETE FROM displays WHERE id = " . (int)$displayId); // cascades to devices
    }
    if ($userId) {
        $pdo->exec("DELETE FROM users WHERE id = " . (int)$userId);
    }
}
echo "\n";
