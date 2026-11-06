<?php
// Multi-page displays: independent widgets (several of the same type, each syncing its own data),
// "show on every page", copies keeping their secrets, and page rotation settings.
// Exercises the real endpoints over HTTP against the dev API server
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

function pg_http(string $method, string $path, array $headers = [], $body = null): array {
    $base = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
    $ch = curl_init($base . '/' . $path);
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
    return ['code' => $code, 'json' => is_string($res) ? json_decode($res, true) : null];
}

echo "Running Multi-Page Tests...\n";

if (pg_http('GET', 'get_display.php')['code'] === 0) {
    echo "  (skipped: API server not reachable)\n\n";
    return;
}

$sfx = bin2hex(random_bytes(4));
$userToken = 'pgtest_user_' . $sfx;
$displayToken = "pgtest-$sfx";
$userId = null;
$displayId = null;

try {
    $pdo->prepare("INSERT INTO users (name, email, password_hash, auth_token) VALUES ('PG User', ?, 'x', ?)")->execute(["pg_user_{$sfx}@test.local", $userToken]);
    $userId = (int)$pdo->lastInsertId();
    $auth = ['Authorization: Bearer ' . $userToken];
    $pos = ['x' => 0, 'y' => 0, 'width' => 300, 'height' => 200];

    // Two pages, two to-do lists, two calendars, one clock on every page, one Home Assistant with a token
    $save = pg_http('POST', 'save_display.php', $auth, [
        'token' => $displayToken, 'name' => 'Pages',
        'pages' => [['id' => 'default', 'name' => 'Main', 'duration_seconds' => 20], ['id' => 'page_2', 'name' => 'Kitchen', 'duration_seconds' => 40]],
        'page_rotation' => ['enabled' => false, 'pause_on_touch_seconds' => 90],
        'widgets' => [
            ['id' => 0, 'type' => 'todo', 'page_id' => 'default', 'position' => $pos, 'config' => ['title' => 'Main list', 'items' => []]],
            ['id' => 0, 'type' => 'todo', 'page_id' => 'page_2', 'position' => $pos, 'config' => ['title' => 'Kitchen list', 'items' => []]],
            ['id' => 0, 'type' => 'calendar', 'page_id' => 'default', 'position' => $pos, 'config' => ['title' => 'Family']],
            ['id' => 0, 'type' => 'calendar', 'page_id' => 'page_2', 'position' => $pos, 'config' => ['title' => 'Kitchen']],
            ['id' => 0, 'type' => 'clock', 'page_id' => 'default', 'allPages' => true, 'position' => $pos, 'config' => []],
            ['id' => 0, 'type' => 'homeassistant', 'page_id' => 'default', 'position' => $pos, 'config' => ['haUrl' => 'http://ha.local:8123', 'token' => 'ha-secret-' . $sfx]],
        ],
    ]);
    assertTrue($save['code'] === 200, "A display with two pages and duplicate widget types saves");
    $displayId = (int)$pdo->query("SELECT id FROM displays WHERE token = " . $pdo->quote($displayToken))->fetchColumn();

    $load = pg_http('GET', "get_display.php?token=$displayToken", $auth);
    $widgets = $load['json']['widgets'] ?? [];
    $byTitle = [];
    foreach ($widgets as $w) $byTitle[$w['config']['title'] ?? $w['type']] = $w;
    $ids = array_map(fn($w) => $w['config']['_widgetId'] ?? 0, $widgets);
    assertTrue(count($widgets) === 6 && !in_array(0, $ids, true) && count(array_unique($ids)) === 6 && $ids === array_column($widgets, 'id'),
        "Every widget's config carries its own _widgetId");
    assertTrue(($byTitle['clock']['allPages'] ?? false) === true && !isset($byTitle['Main list']['allPages']), "\"Show on every page\" is saved per widget");
    assertTrue(($load['json']['display']['page_rotation'] ?? null) === ['enabled' => false, 'pause_on_touch_seconds' => 90], "Page rotation settings round-trip");
    $storedCfg = (string)$pdo->query("SELECT config_json FROM widgets WHERE id = " . (int)$byTitle['Main list']['id'])->fetchColumn();
    assertTrue(strpos($storedCfg, '_widgetId') === false, "_widgetId is never stored in config_json");

    // ---- Each to-do list and calendar syncs its own data ----
    $kitchenList = (int)$byTitle['Kitchen list']['id'];
    $add = pg_http('POST', 'tasks_sync.php', [], ['token' => $displayToken, 'action' => 'add', 'text' => 'Buy milk', 'widget_id' => $kitchenList]);
    $itemsOf = function (int $id) use ($pdo) {
        return json_decode((string)$pdo->query("SELECT config_json FROM widgets WHERE id = $id")->fetchColumn(), true)['items'] ?? [];
    };
    assertTrue($add['code'] === 200 && count($itemsOf($kitchenList)) === 1 && count($itemsOf((int)$byTitle['Main list']['id'])) === 0,
        "A task added on the second to-do list goes to that list, not the first");
    $legacy = pg_http('POST', 'tasks_sync.php', [], ['token' => $displayToken, 'action' => 'add', 'text' => 'Old screen']);
    assertTrue($legacy['code'] === 200 && count($itemsOf((int)$byTitle['Main list']['id'])) === 1, "Screens that send no widget id still reach the first list");

    $kitchenCal = (int)$byTitle['Kitchen']['id'];
    pg_http('POST', 'calendar_sync.php', [], ['token' => $displayToken, 'action' => 'add', 'title' => 'Bake', 'widget_id' => $kitchenCal]);
    $eventsOf = function (int $id) use ($pdo) {
        return json_decode((string)$pdo->query("SELECT config_json FROM widgets WHERE id = $id")->fetchColumn(), true)['customEvents'] ?? [];
    };
    assertTrue(count($eventsOf($kitchenCal)) === 1 && count($eventsOf((int)$byTitle['Family']['id'])) === 0, "An event added on the second calendar goes to that calendar");

    $wrong = pg_http('POST', 'tasks_sync.php', [], ['token' => $displayToken, 'action' => 'add', 'text' => 'x', 'widget_id' => $kitchenCal]);
    assertTrue($wrong['code'] === 404, "A widget id of the wrong type is refused");

    // ---- A copy made in the editor keeps the original's saved secrets ----
    $ha = $byTitle['homeassistant'];
    $copyConfig = ['haUrl' => 'http://ha.local:8123', '_secretsSet' => ['token'], '_copySecretsFrom' => (int)$ha['id']];
    $resave = $load['json']['widgets'];
    $resave[] = ['id' => 999999001, 'type' => 'homeassistant', 'page_id' => 'page_2', 'position' => $pos, 'config' => $copyConfig];
    pg_http('POST', 'save_display.php', $auth, ['token' => $displayToken, 'name' => 'Pages', 'pages' => $load['json']['display']['pages'], 'widgets' => $resave]);
    $copyId = (int)$pdo->query("SELECT id FROM widgets WHERE display_id = $displayId AND type = 'homeassistant' AND page_id = 'page_2'")->fetchColumn();
    $copySecrets = $copyId ? (int)$pdo->query("SELECT COUNT(*) FROM widget_secrets WHERE widget_id = $copyId")->fetchColumn() : -1;
    assertTrue($copyId > 0 && $copySecrets === 1, "A copied Home Assistant widget keeps the original's token");
    $copyCfg = (string)$pdo->query("SELECT config_json FROM widgets WHERE id = $copyId")->fetchColumn();
    assertTrue(strpos($copyCfg, '_copySecretsFrom') === false, "_copySecretsFrom is not stored");

    // Another user's widget can't be used as a copy source
    $pdo->prepare("INSERT INTO users (name, email, password_hash, auth_token) VALUES ('PG Other', ?, 'x', ?)")->execute(["pg_other_{$sfx}@test.local", 'pgtest_other_' . $sfx]);
    $otherId = (int)$pdo->lastInsertId();
    $theirToken = "pgtest-theirs-$sfx";
    pg_http('POST', 'save_display.php', ['Authorization: Bearer pgtest_other_' . $sfx], ['token' => $theirToken, 'name' => 'Theirs', 'widgets' => [
        ['id' => 0, 'type' => 'homeassistant', 'page_id' => 'default', 'position' => $pos, 'config' => ['_copySecretsFrom' => (int)$ha['id']]],
    ]]);
    $theirWidget = (int)$pdo->query("SELECT w.id FROM widgets w JOIN displays d ON d.id = w.display_id WHERE d.token = " . $pdo->quote($theirToken))->fetchColumn();
    $stolen = $theirWidget ? (int)$pdo->query("SELECT COUNT(*) FROM widget_secrets WHERE widget_id = $theirWidget")->fetchColumn() : 0;
    assertTrue($theirWidget > 0 && $stolen === 0, "Another user can't copy secrets from your widget");
    $pdo->exec("DELETE FROM displays WHERE user_id = $otherId");
    $pdo->exec("DELETE FROM users WHERE id = $otherId");
} finally {
    if ($displayId) $pdo->exec("DELETE FROM displays WHERE id = " . (int)$displayId);
    if ($userId) {
        $pdo->exec("DELETE FROM displays WHERE user_id = $userId");
        $pdo->exec("DELETE FROM users WHERE id = $userId");
    }
}
echo "\n";
