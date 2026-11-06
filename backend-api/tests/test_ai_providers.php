<?php
// AI briefing providers (llm_providers_lib.php): Anthropic, OpenAI and a self-hosted vLLM server,
// exercised end to end against tests/mock_llm.php. Needs the API server's .env to point
// ANTHROPIC_BASE_URL / OPENAI_BASE_URL at the mock and ALLOW_PRIVATE_LLM_URLS=1 (CI sets these).
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
require_once __DIR__ . '/../llm_providers_lib.php';

function ap_http(string $path, array $body, array $headers = []): array {
    $base = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
    $ch = curl_init($base . '/' . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_TIMEOUT => 60,
    ]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'json' => is_string($res) ? json_decode($res, true) : null];
}

/** The last request the mock received: ['path', 'headers', 'body'] */
function ap_last(): array {
    return json_decode((string)@file_get_contents(sys_get_temp_dir() . '/mock_llm_last.json'), true) ?: [];
}

echo "Running AI Provider Tests...\n";

$apiBase = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
$mockOn = str_contains(getEnvValue('ANTHROPIC_BASE_URL'), 'mock_llm.php') && getEnvValue('ALLOW_PRIVATE_LLM_URLS') === '1';
if (!$mockOn || ap_http('ai_briefing.php', [])['code'] === 0) {
    echo "  (skipped: " . (!$mockOn ? "point ANTHROPIC_BASE_URL / OPENAI_BASE_URL at tests/mock_llm.php and set ALLOW_PRIVATE_LLM_URLS=1" : "API server not reachable") . ")\n\n";
    return;
}

// ---- Private-address guard for self-hosted servers (in-process) ----
putenv('ALLOW_PRIVATE_LLM_URLS=0');
assertTrue(vllmBaseUrl('http://127.0.0.1:8000/v1') === '' && vllmBaseUrl('http://192.168.1.20') === '',
    "Self-hosted server URLs on private networks are refused unless ALLOW_PRIVATE_LLM_URLS=1");
assertTrue(vllmBaseUrl('ftp://llm.example.com') === '', "Only http(s) server URLs are accepted");
putenv('ALLOW_PRIVATE_LLM_URLS=1');
assertTrue(vllmBaseUrl('http://127.0.0.1:8000/') === 'http://127.0.0.1:8000/v1', "Server URLs get /v1 appended when missing");

$sfx = bin2hex(random_bytes(4));
$userToken = 'aptest_user_' . $sfx;
$userId = null;
$displayIds = [];
$cooldownFiles = [];

try {
    $pdo->prepare("INSERT INTO users (name, email, password_hash, auth_token) VALUES ('AP User', ?, 'x', ?)")->execute(["ap_user_{$sfx}@test.local", $userToken]);
    $userId = (int)$pdo->lastInsertId();
    $auth = ['Authorization: Bearer ' . $userToken];
    $n = 0;
    // A different location every call, so the briefing cache never answers instead of the provider
    $ask = function (array $body) use ($auth, &$n, $sfx) {
        $n++;
        return ap_http('ai_briefing.php', $body + ['localHour' => 9, 'location' => "Paris $sfx-$n", 'weather' => 'clear sky and 20°C'], $auth);
    };

    // ---- Anthropic ----
    $r = $ask(['provider' => 'anthropic', 'apiKey' => 'sk-ant-mock']);
    $last = ap_last();
    assertTrue(($r['json']['provider'] ?? '') === 'anthropic' && ($r['json']['providerName'] ?? '') === 'Anthropic Claude'
        && str_contains($r['json']['briefing'] ?? '', 'Claude mock briefing') && str_contains($r['json']['briefing'] ?? '', "Paris $sfx"),
        "Anthropic writes the briefing from the facts sent");
    assertTrue(($last['body']['model'] ?? '') === 'claude-opus-5-5' && ($last['headers']['anthropic-version'] ?? '') === '2026-10-21'
        && ($last['headers']['x-api-key'] ?? '') === 'sk-ant-mock', "Anthropic: default model, API version and key header");
    assertTrue(($last['body']['output_config']['effort'] ?? '') === 'low' && ($last['body']['fallbacks'] ?? '') === 'default'
        && str_contains($last['headers']['anthropic-beta'] ?? '', 'server-side-fallback-2026-07-01')
        && !isset($last['body']['temperature']) && !empty($last['body']['system']), "Anthropic: low effort, refusal fallback, system prompt, no temperature");

    $ask(['provider' => 'anthropic', 'apiKey' => 'sk-ant-mock', 'model' => 'claude-haiku-4-5']);
    $last = ap_last();
    assertTrue(($last['body']['model'] ?? '') === 'claude-haiku-4-5' && !isset($last['body']['output_config']) && !isset($last['body']['fallbacks']),
        "Anthropic: a model override skips options that model doesn't take");

    $r = $ask(['provider' => 'anthropic', 'apiKey' => 'refuse']);
    assertTrue(($r['json']['provider'] ?? '') === 'ambient_engine' && stripos($r['json']['aiError'] ?? '', 'declined') !== false,
        "Anthropic: a refusal falls back to the built-in engine with a clear reason");

    $r = $ask(['provider' => 'anthropic', 'apiKey' => 'overloaded']);
    assertTrue(stripos($r['json']['aiError'] ?? '', 'overloaded') !== false, "Anthropic: 529 is reported as overloaded");

    // ---- OpenAI ----
    $r = $ask(['provider' => 'openai', 'apiKey' => 'sk-openai-mock']);
    $last = ap_last();
    assertTrue(($r['json']['provider'] ?? '') === 'openai' && str_contains($r['json']['briefing'] ?? '', 'Chat mock briefing'), "OpenAI writes the briefing");
    assertTrue(($last['body']['model'] ?? '') === 'gpt-5-mini' && isset($last['body']['max_completion_tokens']) && !isset($last['body']['temperature'])
        && ($last['headers']['authorization'] ?? '') === 'Bearer sk-openai-mock', "OpenAI: default model, bearer key, max_completion_tokens, no temperature");

    // ---- Rate limit: pause that provider + key, don't call it again ----
    $cooldownFiles[] = sys_get_temp_dir() . '/sd_briefings/cooldown_' . md5(json_encode(['openai', 'ratelimit', '', '']));
    $r = $ask(['provider' => 'openai', 'apiKey' => 'ratelimit']);
    assertTrue(stripos($r['json']['aiError'] ?? '', 'rate limit') !== false && ($r['json']['retryAfter'] ?? 0) >= 1800, "429 pauses the provider for at least 30 minutes");
    @unlink(sys_get_temp_dir() . '/mock_llm_last.json');
    $r = $ask(['provider' => 'openai', 'apiKey' => 'ratelimit']);
    assertTrue(stripos($r['json']['aiError'] ?? '', 'Paused') !== false && ap_last() === [], "During the pause the provider isn't called");

    // ---- Self-hosted (vLLM) ----
    $vllmUrl = $apiBase . '/tests/mock_llm.php/vllm';
    $r = $ask(['provider' => 'vllm', 'vllmUrl' => $vllmUrl]);
    $last = ap_last();
    assertTrue(($r['json']['provider'] ?? '') === 'vllm' && ($r['json']['model'] ?? '') === 'mock-served-model'
        && str_contains($r['json']['briefing'] ?? '', 'Chat mock briefing') && !str_contains($r['json']['briefing'] ?? '', 'think'),
        "vLLM: no key needed, model detected from /v1/models, reasoning tags stripped");
    assertTrue(!isset($last['headers']['authorization']), "vLLM: no Authorization header without a key");

    $t = ap_http('ai_briefing.php', ['provider' => 'vllm', 'vllmUrl' => $vllmUrl, 'test' => true], $auth);
    assertTrue(($t['json']['success'] ?? false) === true && str_contains($t['json']['message'] ?? '', 'mock-served-model'), "Test connection reports the model in use");
    $t = ap_http('ai_briefing.php', ['provider' => 'vllm', 'test' => true], $auth);
    assertTrue(($t['json']['success'] ?? true) === false && stripos($t['json']['error'] ?? '', 'server URL') !== false, "Test connection asks for a server URL when there is none");

    // ---- A saved key for the chosen provider is used by widget id ----
    $displayToken = "aptest-$sfx";
    ap_http('save_display.php', [
        'token' => $displayToken, 'name' => 'AP', 'pages' => [['id' => 'default', 'name' => 'Main']],
        'widgets' => [['id' => 0, 'type' => 'ai_briefing', 'page_id' => 'default', 'position' => ['x' => 0, 'y' => 0, 'width' => 300, 'height' => 200],
            'config' => ['provider' => 'anthropic', 'anthropicKey' => 'sk-ant-saved', 'apiKey' => 'gemini-not-this-one']]],
    ], $auth);
    $displayIds[] = (int)$pdo->query("SELECT id FROM displays WHERE token = " . $pdo->quote($displayToken))->fetchColumn();
    $widgetId = (int)$pdo->query("SELECT id FROM widgets WHERE display_id = {$displayIds[0]}")->fetchColumn();
    $ask(['provider' => 'anthropic', 'widgetId' => $widgetId]);
    assertTrue((ap_last()['headers']['x-api-key'] ?? '') === 'sk-ant-saved', "The saved Anthropic key (not the Gemini one) is used by widget id");
} finally {
    foreach ($cooldownFiles as $f) @unlink($f);
    foreach ($displayIds as $id) if ($id) $pdo->exec("DELETE FROM displays WHERE id = " . (int)$id);
    if ($userId) {
        $pdo->exec("DELETE FROM displays WHERE user_id = $userId");
        $pdo->exec("DELETE FROM users WHERE id = $userId");
    }
}
echo "\n";
