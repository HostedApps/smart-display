<?php
// Display version history tests (save_display.php snapshots + display_versions.php).
// Exercises the real endpoints over HTTP against the running dev API server
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

function dv_http($method, $path, $authToken = null, $body = null) {
    $base = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
    $ch = curl_init($base . '/' . ltrim($path, '/'));
    $headers = ['Content-Type: application/json'];
    if ($authToken !== null) {
        $headers[] = 'Authorization: Bearer ' . $authToken;
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 10,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'json' => is_string($res) ? json_decode($res, true) : null];
}

echo "Running Display Version History Tests...\n";

$dvTableExists = (bool)$pdo->query("SHOW TABLES LIKE 'display_versions'")->fetchColumn();
$dvProbe = dv_http('GET', 'display_versions.php');
if (!$dvTableExists || $dvProbe['code'] === 0) {
    echo "  (skipped: " . (!$dvTableExists ? "display_versions table missing - apply migration_display_versions.sql" : "API server not reachable") . ")\n\n";
    return;
}

$suffix = bin2hex(random_bytes(4));
$ownerToken = 'dvtest_owner_' . $suffix;
$otherToken = 'dvtest_other_' . $suffix;
$myDisplay = 'dvtest-mine-' . $suffix;
$theirDisplay = 'dvtest-theirs-' . $suffix;
$userIds = [];

try {
    $insUser = $pdo->prepare("INSERT INTO users (name, email, password_hash, auth_token) VALUES (?, ?, 'x', ?)");
    $insUser->execute(['DV Owner', "dv_owner_{$suffix}@test.local", $ownerToken]);
    $userIds[] = (int)$pdo->lastInsertId();
    $insUser->execute(['DV Other', "dv_other_{$suffix}@test.local", $otherToken]);
    $userIds[] = (int)$pdo->lastInsertId();

    $payload = function ($n, $label = null) use ($myDisplay) {
        $p = [
            'token' => $myDisplay,
            'name' => "Versioned $n",
            'theme' => 'glass',
            'pages' => [['id' => 'default', 'name' => 'Main']],
            'widgets' => [
                ['id' => 0, 'type' => 'clock', 'page_id' => 'default', 'position' => ['x' => 1, 'y' => 2, 'w' => 3, 'h' => 2], 'config' => ['format' => '24h']],
                ['id' => 0, 'type' => 'note', 'page_id' => 'default', 'position' => ['x' => 4, 'y' => 0, 'w' => 2, 'h' => 2], 'config' => ['text' => "Snapshot #$n – ünïcode"]],
            ],
        ];
        if ($label !== null) {
            $p['version_label'] = $label;
        }
        return $p;
    };

    // 1. Save creates a version
    $r1 = dv_http('POST', 'save_display.php', $ownerToken, $payload(1, '<b>First</b> draft'));
    assertTrue($r1['code'] === 200 && !empty($r1['json']['success']), "save_display.php succeeds for a new display");
    assertTrue(is_int($r1['json']['version_id'] ?? null) && $r1['json']['version_id'] > 0, "save_display.php returns an integer version_id");
    $v1 = (int)($r1['json']['version_id'] ?? 0);

    $r2 = dv_http('POST', 'save_display.php', $ownerToken, $payload(2));
    $v2 = (int)($r2['json']['version_id'] ?? 0);
    assertTrue($v2 > $v1, "Second save creates a newer version");

    // 2. List newest first
    $list = dv_http('GET', "display_versions.php?token=$myDisplay", $ownerToken);
    $versions = $list['json']['versions'] ?? [];
    assertTrue($list['code'] === 200 && count($versions) === 2, "Version list returns both saved versions");
    assertTrue(($versions[0]['id'] ?? 0) === $v2 && ($versions[1]['id'] ?? 0) === $v1, "Version list is ordered newest first");
    assertTrue(($versions[1]['label'] ?? null) === 'First draft' && array_key_exists('label', $versions[0] ?? []) && $versions[0]['label'] === null, "Label is tag-stripped; missing label is null");
    assertTrue(($versions[0]['widget_count'] ?? 0) === 2 && !isset($versions[0]['snapshot']), "List carries widget_count but no snapshot body");

    // 3. Fetch snapshot round-trips widgets
    $one = dv_http('GET', "display_versions.php?token=$myDisplay&id=$v1", $ownerToken);
    $snap = $one['json']['version']['snapshot'] ?? [];
    assertTrue($one['code'] === 200 && ($one['json']['version']['id'] ?? 0) === $v1, "Single version fetch returns the requested version");
    assertTrue(!isset($snap['token']) && ($snap['name'] ?? '') === 'Versioned 1', "Snapshot excludes token and keeps layout fields");
    $sentWidgets = $payload(1)['widgets'];
    assertTrue(($snap['widgets'] ?? null) == $sentWidgets, "Snapshot round-trips the widgets array (incl. unicode)");

    // 4. Pruning keeps only the newest 20
    for ($i = 3; $i <= 23; $i++) {
        $last = dv_http('POST', 'save_display.php', $ownerToken, $payload($i));
    }
    $displayId = (int)$pdo->query("SELECT id FROM displays WHERE token = " . $pdo->quote($myDisplay))->fetchColumn();
    $stored = (int)$pdo->query("SELECT COUNT(*) FROM display_versions WHERE display_id = $displayId")->fetchColumn();
    assertTrue($stored === 20, "History is pruned to 20 stored versions (found $stored)");
    $list = dv_http('GET', "display_versions.php?token=$myDisplay", $ownerToken);
    $versions = $list['json']['versions'] ?? [];
    assertTrue(count($versions) === 20 && ($versions[0]['id'] ?? 0) === (int)($last['json']['version_id'] ?? -1), "List shows 20 versions, newest is the latest save");
    $ids = array_column($versions, 'id');
    assertTrue(!in_array($v1, $ids, true) && !in_array($v2, $ids, true), "Oldest versions were pruned");
    $gone = dv_http('GET', "display_versions.php?token=$myDisplay&id=$v1", $ownerToken);
    assertTrue($gone['code'] === 404, "Pruned version returns 404");

    // 5. Other user's display: 403, and no cross-display version access
    $rt = dv_http('POST', 'save_display.php', $otherToken, ['token' => $theirDisplay, 'name' => 'Other', 'widgets' => []]);
    $theirVersion = (int)($rt['json']['version_id'] ?? 0);
    assertTrue($theirVersion > 0, "Second user's save creates its own version");
    $forbidden = dv_http('GET', "display_versions.php?token=$theirDisplay", $ownerToken);
    assertTrue($forbidden['code'] === 403 && !isset($forbidden['json']['versions']), "Listing another user's display history returns 403");
    $forbiddenOne = dv_http('GET', "display_versions.php?token=$theirDisplay&id=$theirVersion", $ownerToken);
    assertTrue($forbiddenOne['code'] === 403 && !isset($forbiddenOne['json']['version']), "Fetching another user's version returns 403");
    $cross = dv_http('GET', "display_versions.php?token=$myDisplay&id=$theirVersion", $ownerToken);
    assertTrue($cross['code'] === 404, "Version id from a different display returns 404");

    // 6. Unknown id / auth / bad params
    $unknown = dv_http('GET', "display_versions.php?token=$myDisplay&id=999999999", $ownerToken);
    assertTrue($unknown['code'] === 404, "Unknown version id returns 404");
    $noAuth = dv_http('GET', "display_versions.php?token=$myDisplay");
    assertTrue($noAuth['code'] === 401, "Missing auth returns 401");
    $badAuth = dv_http('GET', "display_versions.php?token=$myDisplay", 'not-a-real-token');
    assertTrue($badAuth['code'] === 401, "Invalid auth token returns 401");
    $badId = dv_http('GET', "display_versions.php?token=$myDisplay&id=abc", $ownerToken);
    $noToken = dv_http('GET', "display_versions.php", $ownerToken);
    assertTrue($badId['code'] === 400 && $noToken['code'] === 400, "Bad id / missing token return 400");
} finally {
    // Displays cascade to widgets and display_versions
    $pdo->prepare("DELETE FROM displays WHERE token IN (?, ?)")->execute([$myDisplay, $theirDisplay]);
    if (!empty($userIds)) {
        $pdo->exec("DELETE FROM users WHERE id IN (" . implode(',', array_map('intval', $userIds)) . ")");
    }
}
echo "\n";
