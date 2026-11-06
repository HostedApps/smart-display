<?php
// Widget secrets: API keys and tokens are stored encrypted outside widgets.config_json, never
// returned to the editor, given to a paired screen only when the screen itself needs them, and
// kept out of version history. Exercises the real endpoints over HTTP against the dev API server
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

function ws_http($method, $path, array $headers = [], $body = null) {
    $base = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
    $ch = curl_init($base . '/' . ltrim($path, '/'));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'raw' => (string)$res, 'json' => is_string($res) ? json_decode($res, true) : null];
}

function ws_widget(array $widgets, string $type): ?array {
    foreach ($widgets as $w) if (($w['type'] ?? '') === $type) return $w;
    return null;
}

echo "Running Widget Secrets Tests...\n";

$hasTable = (bool)$pdo->query("SHOW TABLES LIKE 'widget_secrets'")->fetchColumn();
if (!$hasTable || ws_http('GET', 'get_display.php')['code'] === 0) {
    echo "  (skipped: " . (!$hasTable ? "apply migration_widget_secrets.sql" : "API server not reachable") . ")\n\n";
    return;
}

$sfx = bin2hex(random_bytes(4));
$ownerToken = 'wstest_owner_' . $sfx;
$otherToken = 'wstest_other_' . $sfx;
$deviceToken = 'wstest_device_' . $sfx;
$displayToken = "wstest-$sfx";
$userIds = [];
$displayIds = [];
$haToken = 'ha-token-' . bin2hex(random_bytes(8));
$geminiKey = 'gemini-key-' . bin2hex(random_bytes(8));

try {
    $ins = $pdo->prepare("INSERT INTO users (name, email, password_hash, auth_token) VALUES (?, ?, 'x', ?)");
    $ins->execute(['WS Owner', "ws_owner_{$sfx}@test.local", $ownerToken]);
    $userIds[] = (int)$pdo->lastInsertId();
    $ins->execute(['WS Other', "ws_other_{$sfx}@test.local", $otherToken]);
    $userIds[] = (int)$pdo->lastInsertId();
    $owner = ['Authorization: Bearer ' . $ownerToken];

    $layout = function (array $haConfig, array $aiConfig) use ($displayToken) {
        return [
            'token' => $displayToken, 'name' => 'Secrets', 'theme' => 'glass',
            'pages' => [['id' => 'default', 'name' => 'Main']],
            'widgets' => [
                ['id' => $haConfig['_id'] ?? 0, 'type' => 'homeassistant', 'page_id' => 'default', 'position' => ['x' => 0, 'y' => 0, 'width' => 300, 'height' => 200], 'config' => array_diff_key($haConfig, ['_id' => 1])],
                ['id' => $aiConfig['_id'] ?? 0, 'type' => 'ai_briefing', 'page_id' => 'default', 'position' => ['x' => 0, 'y' => 300, 'width' => 300, 'height' => 200], 'config' => array_diff_key($aiConfig, ['_id' => 1])],
            ],
        ];
    };

    // ---- Save stores secrets encrypted, outside the config ----
    $save = ws_http('POST', 'save_display.php', $owner, $layout(['haUrl' => 'http://ha.local:8123', 'token' => $haToken], ['apiKey' => $geminiKey, 'userName' => 'Sam']));
    assertTrue($save['code'] === 200 && ($save['json']['secrets_stored'] ?? false) === true, "Save succeeds and reports secrets stored");
    $displayId = (int)$pdo->query("SELECT id FROM displays WHERE token = " . $pdo->quote($displayToken))->fetchColumn();
    $displayIds[] = $displayId;
    $rows = $pdo->query("SELECT id, type, config_json FROM widgets WHERE display_id = $displayId")->fetchAll();
    $ids = array_column($rows, 'id', 'type');
    $allConfig = implode(' ', array_column($rows, 'config_json'));
    assertTrue(strpos($allConfig, $haToken) === false && strpos($allConfig, $geminiKey) === false, "Secrets are not in widgets.config_json");
    $cipher = $pdo->query("SELECT GROUP_CONCAT(ciphertext) FROM widget_secrets WHERE widget_id IN (" . implode(',', array_map('intval', $ids)) . ")")->fetchColumn();
    assertTrue($cipher && strpos($cipher, 'v1:') === 0 && strpos($cipher, $haToken) === false, "Secrets are stored encrypted");

    // ---- Editor never gets values back ----
    $editor = ws_http('GET', "get_display.php?token=$displayToken", $owner);
    $edHa = ws_widget($editor['json']['widgets'] ?? [], 'homeassistant');
    assertTrue(strpos($editor['raw'], $haToken) === false && strpos($editor['raw'], $geminiKey) === false, "Editor load contains no secret values");
    assertTrue(($edHa['config']['_secretsSet'] ?? []) === ['token'] && ($edHa['config']['_widgetId'] ?? 0) === (int)$ids['homeassistant'], "Editor sees which secrets are saved, and the widget id");

    // ---- Screens get only the secrets they use themselves ----
    $pdo->prepare("INSERT INTO devices (display_id, device_token, device_name) VALUES (?, ?, 'WS Kiosk')")->execute([$displayId, $deviceToken]);
    $kiosk = ws_http('GET', "get_display.php?token=$displayToken&for=kiosk", ['X-Device-Token: ' . $deviceToken]);
    $kHa = ws_widget($kiosk['json']['widgets'] ?? [], 'homeassistant');
    assertTrue(($kHa['config']['token'] ?? '') === $haToken && ($kHa['config']['_deviceSecrets'] ?? []) === ['token'], "Paired screen receives the Home Assistant token (device secret)");
    assertTrue(strpos($kiosk['raw'], $geminiKey) === false, "Paired screen never receives the Gemini key (server-only secret)");
    $stranger = ws_http('GET', "get_display.php?token=$displayToken&for=kiosk", ['Authorization: Bearer ' . $otherToken]);
    assertTrue($stranger['code'] === 401 && strpos($stranger['raw'], $haToken) === false, "Another user gets nothing");

    // ---- Version history keeps secrets out ----
    $snap = (string)$pdo->query("SELECT snapshot_json FROM display_versions WHERE display_id = $displayId ORDER BY id DESC LIMIT 1")->fetchColumn();
    assertTrue($snap !== '' && strpos($snap, $haToken) === false && strpos($snap, $geminiKey) === false, "Version snapshot contains no secrets");

    // ---- Re-saving without the value keeps it; _clearSecrets deletes it ----
    $edAi = ws_widget($editor['json']['widgets'] ?? [], 'ai_briefing');
    ws_http('POST', 'save_display.php', $owner, $layout(
        ['_id' => (int)$ids['homeassistant'], 'haUrl' => 'http://ha.local:8123', 'token' => '', '_secretsSet' => ['token']],
        ['_id' => (int)$ids['ai_briefing']] + ($edAi['config'] ?? [])
    ));
    $kept = (int)$pdo->query("SELECT COUNT(*) FROM widget_secrets WHERE widget_id IN ({$ids['homeassistant']}, {$ids['ai_briefing']})")->fetchColumn();
    assertTrue($kept === 2, "Saving without re-typing keeps both secrets");

    // ---- Duplicating the display copies secrets to the copy ----
    $dup = ws_http('POST', 'displays.php', $owner, ['action' => 'duplicate', 'id' => $displayId, 'name' => 'Secrets copy']);
    $dupId = (int)($dup['json']['display']['id'] ?? 0);
    if ($dupId) $displayIds[] = $dupId;
    $dupSecrets = $dupId ? (int)$pdo->query("SELECT COUNT(*) FROM widget_secrets s JOIN widgets w ON w.id = s.widget_id WHERE w.display_id = $dupId")->fetchColumn() : 0;
    assertTrue($dupSecrets === 2, "Duplicated display keeps its widgets' secrets");

    ws_http('POST', 'save_display.php', $owner, $layout(
        ['_id' => (int)$ids['homeassistant'], 'haUrl' => 'http://ha.local:8123', '_clearSecrets' => ['token']],
        ['_id' => (int)$ids['ai_briefing'], 'userName' => 'Sam']
    ));
    $haLeft = (int)$pdo->query("SELECT COUNT(*) FROM widget_secrets WHERE widget_id = {$ids['homeassistant']}")->fetchColumn();
    assertTrue($haLeft === 0, "_clearSecrets removes a stored secret");

    // ---- Secrets saved before this feature move out of config on first load ----
    $legacyToken = 'legacy-' . $sfx;
    $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?")->execute([json_encode(['haUrl' => 'http://ha.local:8123', 'token' => $legacyToken]), $ids['homeassistant']]);
    $migrated = ws_http('GET', "get_display.php?token=$displayToken", $owner);
    $cfgNow = (string)$pdo->query("SELECT config_json FROM widgets WHERE id = {$ids['homeassistant']}")->fetchColumn();
    assertTrue(strpos($migrated['raw'], $legacyToken) === false && strpos($cfgNow, $legacyToken) === false
        && (int)$pdo->query("SELECT COUNT(*) FROM widget_secrets WHERE widget_id = {$ids['homeassistant']}")->fetchColumn() === 1,
        "A token left in config_json is moved to the secret store on load");

    // ---- Endpoints that use a stored key check who's asking ----
    $owmOther = ws_http('GET', "proxy.php?action=openweather_forecast&widget={$ids['homeassistant']}&city=London", ['Authorization: Bearer ' . $otherToken]);
    assertTrue($owmOther['code'] === 403, "OpenWeather proxy refuses another user's widget");
    $aiOther = ws_http('POST', 'ai_briefing.php', ['Authorization: Bearer ' . $otherToken], ['widgetId' => (int)$ids['ai_briefing'], 'test' => true]);
    assertTrue(stripos($aiOther['json']['error'] ?? '', 'No API key') !== false, "AI briefing won't use another user's stored Gemini key");
} finally {
    foreach ($displayIds as $id) {
        $pdo->exec("DELETE FROM displays WHERE id = " . (int)$id); // cascades to widgets, secrets, devices
    }
    if ($userIds) {
        $in = implode(',', array_map('intval', $userIds));
        $pdo->exec("DELETE FROM display_versions WHERE display_id IN (" . implode(',', array_map('intval', $displayIds ?: [0])) . ")");
        $pdo->exec("DELETE FROM displays WHERE user_id IN ($in)");
        $pdo->exec("DELETE FROM users WHERE id IN ($in)");
    }
}
echo "\n";
