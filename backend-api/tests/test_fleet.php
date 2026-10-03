<?php
// Fleet hub tests: display_heartbeat.php, display_commands.php (+ delivery via emergency.php),
// displays.php presence / thumbnail / copy_layout / duplicate, pairing.php list_devices.
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

function fl_http($method, $path, $authToken = null, $body = null, array $extraHeaders = []) {
    $base = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
    $ch = curl_init($base . '/' . ltrim($path, '/'));
    $headers = array_merge(['Content-Type: application/json'], $extraHeaders);
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
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body));
    }
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'json' => is_string($res) ? json_decode($res, true) : null];
}

function fl_find_display(array $list, int $id) {
    foreach (($list['json']['displays'] ?? []) as $d) {
        if (($d['id'] ?? 0) === $id) return $d;
    }
    return null;
}

echo "Running Fleet Hub Tests...\n";

$flMigrated = (bool)$pdo->query("SHOW TABLES LIKE 'display_commands'")->fetchColumn()
    && (bool)$pdo->query("SHOW COLUMNS FROM displays LIKE 'last_seen_at'")->fetchColumn();
$flProbe = fl_http('GET', 'displays.php');
if (!$flMigrated || $flProbe['code'] === 0) {
    echo "  (skipped: " . (!$flMigrated ? "fleet telemetry schema missing - apply migration_fleet_telemetry.sql" : "API server not reachable") . ")\n\n";
    return;
}

$sfx = bin2hex(random_bytes(4));
$ownerToken = 'fltest_owner_' . $sfx;
$otherToken = 'fltest_other_' . $sfx;
$deviceToken = 'fltest_device_' . $sfx;
$tokA = "fltest-a-$sfx";
$tokB = "fltest-b-$sfx";
$tokC = "fltest-c-$sfx";
$tokX = "fltest-x-$sfx";
$userIds = [];
$createdDisplayIds = [];
$renamedCommands = false;

try {
    $insUser = $pdo->prepare("INSERT INTO users (name, email, password_hash, auth_token) VALUES (?, ?, 'x', ?)");
    $insUser->execute(['FL Owner', "fl_owner_{$sfx}@test.local", $ownerToken]);
    $ownerId = (int)$pdo->lastInsertId();
    $userIds[] = $ownerId;
    $insUser->execute(['FL Other', "fl_other_{$sfx}@test.local", $otherToken]);
    $otherId = (int)$pdo->lastInsertId();
    $userIds[] = $otherId;

    $insDisplay = $pdo->prepare("INSERT INTO displays (user_id, token, name, theme, orientation, background_json, pages_json, sleep_schedule_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $insDisplay->execute([$ownerId, $tokA, 'Lobby', 'paper', 'portrait_1080p', '{"type":"color","value":"#123456"}', '[{"id":"default","name":"Main"},{"id":"p2","name":"Two"}]', '{"enabled":true,"start":"22:00","end":"06:00"}']);
    $idA = (int)$pdo->lastInsertId();
    $insDisplay->execute([$ownerId, $tokB, 'Kitchen', 'dark', 'landscape_720p', null, null, null]);
    $idB = (int)$pdo->lastInsertId();
    $insDisplay->execute([$ownerId, $tokC, 'Office', 'glass', 'landscape_720p', null, null, null]);
    $idC = (int)$pdo->lastInsertId();
    $insDisplay->execute([$otherId, $tokX, 'Not yours', 'dark', 'landscape_720p', null, null, null]);
    $idX = (int)$pdo->lastInsertId();
    $createdDisplayIds = [$idA, $idB, $idC, $idX];

    $insW = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, style_json, config_json) VALUES (?, ?, ?, ?, ?, ?)");
    $insW->execute([$idA, 'default', 'clock', '{"x":1,"y":2,"width":300,"height":200}', '{"opacity":1}', '{"is24Hour":true}']);
    $wA1 = (int)$pdo->lastInsertId();
    $insW->execute([$idA, 'p2', 'note', '{"x":5,"y":6,"width":100,"height":100}', json_encode(['opacity' => 0.5, '_meta' => ['linkedWidgetId' => $wA1, 'customName' => 'Linked note']]), '{"text":"héllo"}']);
    $insW->execute([$idA, 'default', 'weather', '{"x":9,"y":9,"width":100,"height":100}', '{}', '{}']);
    $insW->execute([$idB, 'default', 'calendar', '{"x":0,"y":0,"width":100,"height":100}', null, '{}']);

    $pdo->prepare("INSERT INTO devices (display_id, device_token, device_name) VALUES (?, ?, 'FL Kiosk')")->execute([$idA, $deviceToken]);
    $deviceId = (int)$pdo->lastInsertId();

    $client = ['app_version' => '4.0.0', 'screen_w' => 1920, 'screen_h' => 1080, 'viewport_w' => '1920', 'viewport_h' => 99999,
        'dpr' => 1.5, 'user_agent' => str_repeat('U', 500), 'platform' => '<b>Linux</b>', 'uptime_s' => 42, 'perf_mode' => true,
        'heap_mb' => 123.456, 'online' => true, 'page_index' => 1, 'sleeping' => false, 'injected' => 'nope'];
    $backdate = function ($id, $seconds) use ($pdo) {
        $pdo->prepare("UPDATE displays SET last_seen_at = NOW() - INTERVAL ? SECOND, thumbnail_at = IF(thumbnail_at IS NULL, NULL, NOW() - INTERVAL ? SECOND), updated_at = updated_at WHERE id = ?")->execute([$seconds, $seconds, $id]);
    };
    $configVersion = function ($tok) {
        return fl_http('GET', "emergency.php?token=$tok")['json']['config_version'] ?? null;
    };

    // ---- 1. Heartbeat auth ----
    $cvBefore = $configVersion($tokA);
    $none = fl_http('POST', 'display_heartbeat.php', null, ['token' => $tokA, 'client' => $client]);
    assertTrue($none['code'] === 401, "Heartbeat without auth returns 401");
    $wrongDev = fl_http('POST', 'display_heartbeat.php', null, ['token' => $tokA], ['X-Device-Token: not-a-device']);
    assertTrue($wrongDev['code'] === 401, "Heartbeat with unknown device token returns 401");
    $foreign = fl_http('POST', 'display_heartbeat.php', $otherToken, ['token' => $tokA]);
    assertTrue($foreign['code'] === 401, "Heartbeat with another user's Bearer returns 401");
    $unknown = fl_http('POST', 'display_heartbeat.php', $ownerToken, ['token' => "fltest-nope-$sfx"]);
    assertTrue($unknown['code'] === 404, "Heartbeat for unknown display returns 404");
    $get = fl_http('GET', 'display_heartbeat.php', $ownerToken);
    assertTrue($get['code'] === 405, "Heartbeat GET returns 405");

    $dev = fl_http('POST', 'display_heartbeat.php', null, ['token' => $tokA, 'client' => $client], ["X-Device-Token: $deviceToken"]);
    assertTrue($dev['code'] === 200 && ($dev['json']['success'] ?? false) === true
        && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $dev['json']['server_time'] ?? ''), "Device heartbeat succeeds with ISO server_time");
    $row = $pdo->query("SELECT last_seen_at, client_info_json FROM displays WHERE id = $idA")->fetch();
    $devRow = $pdo->query("SELECT last_seen_at, client_info_json, last_ping FROM devices WHERE id = $deviceId")->fetch();
    $stored = json_decode($row['client_info_json'] ?? 'null', true);
    assertTrue($row['last_seen_at'] !== null && $devRow['last_seen_at'] !== null && $devRow['client_info_json'] !== null, "Device heartbeat stamps display + device last_seen_at and client info");
    assertTrue(is_array($stored) && strlen($stored['user_agent']) === 300 && $stored['platform'] === 'Linux'
        && $stored['viewport_w'] === 1920 && $stored['viewport_h'] === 20000 && $stored['heap_mb'] === 123.5
        && $stored['perf_mode'] === true && !isset($stored['injected']), "Client info is whitelisted, clamped and truncated");
    assertTrue($configVersion($tokA) === $cvBefore, "Heartbeat does not change the layout config_version");

    $throttled = fl_http('POST', 'display_heartbeat.php', $ownerToken, ['token' => $tokA, 'client' => ['app_version' => 'changed']]);
    $after = json_decode($pdo->query("SELECT client_info_json FROM displays WHERE id = $idA")->fetchColumn(), true);
    assertTrue($throttled['code'] === 200 && ($throttled['json']['throttled'] ?? false) === true && ($after['app_version'] ?? '') === '4.0.0', "Heartbeat within 10 s is accepted but not written");
    $backdate($idA, 20);
    $owner = fl_http('POST', 'display_heartbeat.php', $ownerToken, ['token' => $tokA, 'client' => ['app_version' => 'changed']]);
    $after = json_decode($pdo->query("SELECT client_info_json FROM displays WHERE id = $idA")->fetchColumn(), true);
    assertTrue($owner['code'] === 200 && !isset($owner['json']['throttled']) && ($after['app_version'] ?? '') === 'changed', "Owner Bearer heartbeat succeeds and writes after 10 s");

    // ---- 2. Thumbnails ----
    $png = 'data:image/png;base64,' . base64_encode(random_bytes(64));
    $backdate($idA, 20);
    $th = fl_http('POST', 'display_heartbeat.php', null, ['token' => $tokA, 'thumbnail' => $png], ["X-Device-Token: $deviceToken"]);
    assertTrue($th['code'] === 200 && ($th['json']['thumbnail'] ?? '') === 'stored', "Valid PNG thumbnail is stored");
    $backdate($idA, 20);
    $badMime = fl_http('POST', 'display_heartbeat.php', $ownerToken, ['token' => $tokA, 'thumbnail' => 'data:text/html;base64,PHNjcmlwdD4=']);
    assertTrue($badMime['code'] === 200 && ($badMime['json']['success'] ?? false) === true && ($badMime['json']['thumbnail'] ?? '') === 'rejected', "Non-image thumbnail is rejected without failing the heartbeat");
    $backdate($idA, 20);
    $big = fl_http('POST', 'display_heartbeat.php', $ownerToken, ['token' => $tokA, 'thumbnail' => 'data:image/jpeg;base64,' . str_repeat('A', 410000)]);
    assertTrue($big['code'] === 200 && ($big['json']['thumbnail'] ?? '') === 'rejected', "Oversized (>400 KB) thumbnail is rejected without failing the heartbeat");
    $thStored = $pdo->query("SELECT thumbnail_data FROM displays WHERE id = $idA")->fetchColumn();
    assertTrue($thStored === $png, "Rejected thumbnails do not overwrite the stored one");

    $fetch = fl_http('GET', "displays.php?action=thumbnail&id=$idA", $ownerToken);
    assertTrue($fetch['code'] === 200 && ($fetch['json']['data_url'] ?? '') === $png && !empty($fetch['json']['thumbnail_at']), "Owner fetches thumbnail data_url + thumbnail_at");
    $fetchOther = fl_http('GET', "displays.php?action=thumbnail&id=$idA", $otherToken);
    $fetchNone = fl_http('GET', "displays.php?action=thumbnail&id=$idB", $ownerToken);
    assertTrue($fetchOther['code'] === 404 && $fetchNone['code'] === 404, "Thumbnail of a foreign display / display without thumbnail returns 404");

    // ---- 3. Fleet list status ----
    $list = fl_http('GET', 'displays.php', $ownerToken);
    $dA = fl_find_display($list, $idA);
    $dB = fl_find_display($list, $idB);
    assertTrue($list['code'] === 200 && !empty($list['json']['server_time']) && $dA !== null, "Fleet list returns server_time and displays");
    assertTrue(($dA['has_thumbnail'] ?? null) === true && !array_key_exists('thumbnail_data', $dA ?? []) && !empty($dA['thumbnail_at'])
        && ($dA['client']['app_version'] ?? '') === 'changed', "List has has_thumbnail/thumbnail_at/client but never thumbnail_data");
    assertTrue(($dB['status'] ?? '') === 'never' && $dB['last_seen_at'] === null && $dB['client'] === null && $dB['has_thumbnail'] === false, "Never-seen display has status 'never'");
    $statusAt = function ($seconds) use ($pdo, $idA, $ownerToken) {
        $pdo->prepare("UPDATE displays SET last_seen_at = NOW() - INTERVAL ? SECOND, updated_at = updated_at WHERE id = ?")->execute([$seconds, $idA]);
        return fl_find_display(fl_http('GET', 'displays.php', $ownerToken), $idA)['status'] ?? null;
    };
    assertTrue($statusAt(60) === 'online' && $statusAt(600) === 'stale' && $statusAt(3600) === 'offline', "Status transitions online (≤3 min) → stale (≤30 min) → offline");

    $devList = fl_http('GET', "pairing.php?action=list_devices&display_id=$idA", $ownerToken);
    $d0 = $devList['json']['devices'][0] ?? [];
    assertTrue($devList['code'] === 200 && count($devList['json']['devices'] ?? []) === 1 && ($d0['status'] ?? '') === 'online'
        && !empty($d0['last_seen_at']) && ($d0['client']['app_version'] ?? '') === '4.0.0', "Devices list includes last_seen_at, status and client");

    // ---- 4. Commands ----
    $noAuth = fl_http('POST', 'display_commands.php', null, ['tokens' => [$tokA], 'command' => 'reload']);
    $badCmd = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [$tokA], 'command' => 'rm -rf']);
    $badPage = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [$tokA], 'command' => 'goto_page', 'payload' => ['page_index' => -1]]);
    $empty = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [], 'command' => 'reload']);
    $tooMany = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => array_fill(0, 51, $tokA), 'command' => 'reload']);
    $cmdGet = fl_http('GET', 'display_commands.php', $ownerToken);
    assertTrue($noAuth['code'] === 401 && $cmdGet['code'] === 405, "Commands: no auth 401, GET 405");
    assertTrue($badCmd['code'] === 400 && $badPage['code'] === 400 && $empty['code'] === 400 && $tooMany['code'] === 400, "Commands: invalid command / page_index / token count return 400");
    $forbidden = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [$tokA, $tokX], 'command' => 'reload']);
    $cmdCount = (int)$pdo->query("SELECT COUNT(*) FROM display_commands WHERE display_id IN ($idA, $idX)")->fetchColumn();
    assertTrue($forbidden['code'] === 403 && $cmdCount === 0, "Commands: any foreign display → 403 and nothing queued");

    $boot = fl_http('GET', "emergency.php?token=$tokA");
    assertTrue(($boot['json']['commands'] ?? null) === [] && ($boot['json']['latest_command_id'] ?? null) === 0 && array_key_exists('config_version', $boot['json'] ?? []), "Poll without commands: commands [] and latest_command_id 0");

    $q1 = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [$tokA, $tokB, $tokA], 'command' => 'identify', 'payload' => ['ignored' => 1]]);
    assertTrue($q1['code'] === 200 && ($q1['json']['queued'] ?? 0) === 2, "Commands: queued once per (deduplicated) display");
    $q2 = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [$tokA], 'command' => 'goto_page', 'payload' => ['page_index' => 1]]);
    assertTrue($q2['code'] === 200 && ($q2['json']['queued'] ?? 0) === 1, "Commands: goto_page with page_index queues");

    $poll = fl_http('GET', "emergency.php?token=$tokA&since=0");
    $cmds = $poll['json']['commands'] ?? [];
    assertTrue(count($cmds) === 2 && $cmds[0]['command'] === 'identify' && $cmds[0]['payload'] === null
        && $cmds[1]['command'] === 'goto_page' && $cmds[1]['payload'] === ['page_index' => 1] && $cmds[0]['id'] < $cmds[1]['id'], "Poll delivers commands ordered by id with decoded payload");
    $latest = (int)($poll['json']['latest_command_id'] ?? 0);
    assertTrue($latest === $cmds[1]['id'], "latest_command_id is the newest command id");
    $pollSince = fl_http('GET', "emergency.php?token=$tokA&since=" . $cmds[0]['id']);
    $pollDone = fl_http('GET', "emergency.php?token=$tokA&since=$latest");
    assertTrue(count($pollSince['json']['commands'] ?? []) === 1 && ($pollDone['json']['commands'] ?? null) === [] && ($pollDone['json']['latest_command_id'] ?? 0) === $latest, "since filters out already-executed commands");

    $pdo->exec("UPDATE display_commands SET expires_at = NOW() - INTERVAL 1 SECOND WHERE display_id = $idA");
    $pollExpired = fl_http('GET', "emergency.php?token=$tokA&since=0");
    assertTrue(($pollExpired['json']['commands'] ?? null) === [] && ($pollExpired['json']['latest_command_id'] ?? 0) === $latest, "Expired commands are not delivered (latest_command_id unchanged)");

    $pdo->exec("UPDATE display_commands SET expires_at = NOW() - INTERVAL 2 DAY WHERE display_id = $idA");
    fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [$tokB], 'command' => 'reload']);
    $leftA = (int)$pdo->query("SELECT COUNT(*) FROM display_commands WHERE display_id = $idA")->fetchColumn();
    assertTrue($leftA === 0, "Commands expired for more than a day are cleaned up on POST");

    // Broadcast shape also carries commands
    $pdo->prepare("INSERT INTO emergency_broadcasts (user_id, display_id, severity, title, message, play_sound, is_active) VALUES (?, ?, 'info', 't', 'm', 0, 1)")->execute([$ownerId, $idB]);
    $pollB = fl_http('GET', "emergency.php?token=$tokB");
    assertTrue(($pollB['json']['active'] ?? false) === true && count($pollB['json']['commands'] ?? []) === 2 && ($pollB['json']['latest_command_id'] ?? 0) > 0, "Active-broadcast poll shape also includes commands");

    // ---- 5. copy_layout ----
    $cpForeign = fl_http('POST', 'displays.php', $ownerToken, ['action' => 'copy_layout', 'source_id' => $idA, 'target_ids' => [$idB, $idX]]);
    $cpSelf = fl_http('POST', 'displays.php', $ownerToken, ['action' => 'copy_layout', 'source_id' => $idA, 'target_ids' => [$idA]]);
    $cpBad = fl_http('POST', 'displays.php', $ownerToken, ['action' => 'copy_layout', 'source_id' => $idA, 'target_ids' => []]);
    $cpOther = fl_http('POST', 'displays.php', $otherToken, ['action' => 'copy_layout', 'source_id' => $idA, 'target_ids' => [$idX]]);
    $bWidgets = (int)$pdo->query("SELECT COUNT(*) FROM widgets WHERE display_id = $idB")->fetchColumn();
    assertTrue($cpForeign['code'] === 403 && $cpOther['code'] === 403 && $bWidgets === 1, "copy_layout: foreign target or source → 403, nothing copied");
    assertTrue($cpSelf['code'] === 400 && $cpBad['code'] === 400, "copy_layout: source as target / empty targets → 400");

    $cp = fl_http('POST', 'displays.php', $ownerToken, ['action' => 'copy_layout', 'source_id' => $idA, 'target_ids' => [$idB, $idC]]);
    assertTrue($cp['code'] === 200 && ($cp['json']['copied'] ?? 0) === 2, "copy_layout copies to 2 targets");
    $src = $pdo->query("SELECT theme, orientation, background_json, pages_json, sleep_schedule_json FROM displays WHERE id = $idA")->fetch();
    $tgt = $pdo->query("SELECT name, token, theme, orientation, background_json, pages_json, sleep_schedule_json FROM displays WHERE id = $idB")->fetch();
    assertTrue($tgt['theme'] === 'paper' && $tgt['orientation'] === 'portrait_1080p' && $tgt['background_json'] === $src['background_json']
        && $tgt['pages_json'] === $src['pages_json'] && $tgt['sleep_schedule_json'] === $src['sleep_schedule_json'], "copy_layout copies theme/orientation/background/pages/sleep schedule");
    assertTrue($tgt['name'] === 'Kitchen' && $tgt['token'] === $tokB, "copy_layout keeps target name and token");
    $devStill = (int)$pdo->query("SELECT COUNT(*) FROM devices WHERE display_id = $idA")->fetchColumn();
    $wSrc = $pdo->query("SELECT id, page_id, type, position_json, config_json, style_json FROM widgets WHERE display_id = $idA ORDER BY id")->fetchAll();
    $wTgt = $pdo->query("SELECT id, page_id, type, position_json, config_json, style_json FROM widgets WHERE display_id = $idB ORDER BY id")->fetchAll();
    $strip = function ($rows) { return array_map(function ($r) { return [$r['page_id'], $r['type'], $r['position_json'], $r['config_json']]; }, $rows); };
    assertTrue(count($wTgt) === 3 && $strip($wTgt) === $strip($wSrc) && $devStill === 1, "copy_layout replaces all target widgets with copies (content equal)");
    $tgtIds = array_map('intval', array_column($wTgt, 'id'));
    $linkStyle = json_decode($wTgt[1]['style_json'], true);
    assertTrue(($linkStyle['_meta']['linkedWidgetId'] ?? 0) === $tgtIds[0] && ($linkStyle['_meta']['customName'] ?? '') === 'Linked note' && $wTgt[2]['style_json'] === '{}', "copy_layout remaps linkedWidgetId to the new widget id");
    $cCount = (int)$pdo->query("SELECT COUNT(*) FROM widgets WHERE display_id = $idC")->fetchColumn();
    assertTrue($cCount === 3, "copy_layout fills every target");

    // ---- 6. duplicate ----
    $dupForeign = fl_http('POST', 'displays.php', $otherToken, ['action' => 'duplicate', 'id' => $idA]);
    assertTrue($dupForeign['code'] === 403, "duplicate of a foreign display → 403");
    $dup = fl_http('POST', 'displays.php', $ownerToken, ['action' => 'duplicate', 'id' => $idA]);
    $newId = (int)($dup['json']['display']['id'] ?? 0);
    if ($newId) $createdDisplayIds[] = $newId;
    assertTrue($dup['code'] === 200 && $newId > 0 && ($dup['json']['display']['name'] ?? '') === 'Lobby (copy)'
        && preg_match('/^lobby-+copy-[0-9a-f]{6}$/', $dup['json']['display']['token'] ?? ''), "duplicate creates '<name> (copy)' with a fresh token");
    $nd = $pdo->query("SELECT user_id, theme, pages_json, last_seen_at, thumbnail_data FROM displays WHERE id = $newId")->fetch();
    $nw = $pdo->query("SELECT id, style_json FROM widgets WHERE display_id = $newId ORDER BY id")->fetchAll();
    $nLink = json_decode($nw[1]['style_json'] ?? '{}', true);
    assertTrue((int)$nd['user_id'] === $ownerId && $nd['theme'] === 'paper' && $nd['pages_json'] === $src['pages_json'] && $nd['last_seen_at'] === null && $nd['thumbnail_data'] === null, "duplicate copies settings but not telemetry");
    assertTrue(count($nw) === 3 && ($nLink['_meta']['linkedWidgetId'] ?? 0) === (int)$nw[0]['id'], "duplicate copies widgets with remapped links");
    $dup2 = fl_http('POST', 'displays.php', $ownerToken, ['action' => 'duplicate', 'id' => $idA, 'name' => '<i>Annex</i>']);
    if (!empty($dup2['json']['display']['id'])) $createdDisplayIds[] = (int)$dup2['json']['display']['id'];
    assertTrue($dup2['code'] === 200 && ($dup2['json']['display']['name'] ?? '') === 'Annex', "duplicate accepts a (sanitized) custom name");
    $badAction = fl_http('POST', 'displays.php', $ownerToken, ['action' => 'explode']);
    assertTrue($badAction['code'] === 400, "Unknown displays.php POST action → 400");

    // ---- 7. Migration-missing tolerance (display_commands table temporarily renamed) ----
    $pdo->exec("RENAME TABLE display_commands TO display_commands_fltest_bak");
    $renamedCommands = true;
    $pollNoTable = fl_http('GET', "emergency.php?token=$tokA");
    $queueNoTable = fl_http('POST', 'display_commands.php', $ownerToken, ['tokens' => [$tokA], 'command' => 'reload']);
    $pdo->exec("RENAME TABLE display_commands_fltest_bak TO display_commands");
    $renamedCommands = false;
    assertTrue($pollNoTable['code'] === 200 && ($pollNoTable['json']['commands'] ?? null) === [] && ($pollNoTable['json']['latest_command_id'] ?? null) === 0
        && array_key_exists('config_version', $pollNoTable['json'] ?? []), "Without display_commands table the poll still works (commands [], latest 0)");
    assertTrue($queueNoTable['code'] === 503, "Without display_commands table queuing returns 503");
} finally {
    if ($renamedCommands) {
        $pdo->exec("RENAME TABLE display_commands_fltest_bak TO display_commands");
    }
    // Displays cascade to widgets, devices and display_commands
    if (!empty($createdDisplayIds)) {
        $pdo->exec("DELETE FROM displays WHERE id IN (" . implode(',', array_map('intval', $createdDisplayIds)) . ")");
    }
    if (!empty($userIds)) {
        $ids = implode(',', array_map('intval', $userIds));
        $pdo->exec("DELETE FROM emergency_broadcasts WHERE user_id IN ($ids)");
        $pdo->exec("DELETE FROM displays WHERE user_id IN ($ids)");
        $pdo->exec("DELETE FROM users WHERE id IN ($ids)");
    }
}
echo "\n";
