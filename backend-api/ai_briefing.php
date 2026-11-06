<?php
/**
 * AI Ambient Briefing.
 *
 * The widget sends the real context it knows (location, weather, next event, the display's
 * local hour and date). Nothing is invented here: facts the widget didn't send are left out.
 *
 * The briefing is written by the widget's chosen provider (llm_providers_lib.php): Google Gemini,
 * Anthropic, OpenAI or a self-hosted OpenAI-compatible server (vLLM). Without a key (or server URL)
 * the local template engine writes it.
 *
 * Generated briefings are cached per context, so carousel page changes, several kiosks and editor
 * previews share one generation. If the provider fails (rate limit, overload, timeout), the last
 * good AI briefing for the same person, place and part of the day is served before falling back
 * to the template engine.
 */
require_once 'db.php';
require_once 'widget_secrets_lib.php';
require_once 'llm_providers_lib.php';

const BRIEFING_MIN_FRESH_SECONDS = 110 * 60;  // reuse a generated briefing at least this long (widget refresh is ≥ 2 h)
const BRIEFING_REFRESH_MIN_SECONDS = 10 * 60;  // the manual refresh button can't bypass the cache faster than this
const RATE_LIMIT_COOLDOWN = 30 * 60;           // after a 429, don't call that provider with that key for this long (unless it says sooner)

// Only signed-in users (editor previews, Test Key) and paired kiosks may call this endpoint:
// it spends the server's AI provider quota and makes outbound requests.
$caller = getAuthenticatedUser($pdo);
if (!$caller) {
    $headers = getallheaders();
    $deviceToken = $headers['X-Device-Token'] ?? $headers['x-device-token'] ?? '';
    if ($deviceToken !== '') {
        $stmt = $pdo->prepare("SELECT id FROM devices WHERE device_token = ?");
        $stmt->execute([$deviceToken]);
        $caller = $stmt->fetch() ?: null;
    }
}
if (!$caller) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Sign in or pair this display to use the AI briefing."]);
    exit();
}
// Generous per-IP ceiling (several kiosks can share a home IP); the cache keeps normal use far below it
checkRateLimit($pdo, 'ai_briefing', 120, 3600);

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_GET;

/** Trimmed, tag-free, length-capped text from the request (prompt input, never HTML output). */
function briefingField(array $input, string $key, int $maxLen = 300): string {
    $val = $input[$key] ?? '';
    if (!is_string($val) && !is_numeric($val)) return '';
    $val = trim(preg_replace('/\s+/u', ' ', strip_tags((string)$val)));
    return mb_substr($val, 0, $maxLen);
}

// Provider (widgets saved before providers existed have none: they used Gemini)
$provider = is_string($input['provider'] ?? null) && isset(LLM_PROVIDERS[$input['provider']]) ? $input['provider'] : 'gemini';
$model = preg_replace('/[^A-Za-z0-9._:\/\-]/', '', briefingField($input, 'model', 120));
$vllmUrl = briefingField($input, 'vllmUrl', 300) ?: getEnvValue('VLLM_BASE_URL');

// A key typed in the editor (not saved yet) arrives as apiKey. Saved widgets don't send their key:
// it's stored server-side (widget_secrets, one field per provider) and looked up by widget id.
$apiKey = briefingField($input, 'apiKey', 300);
$widgetId = (int)($input['widgetId'] ?? 0);
if ($apiKey === '' && $widgetId > 0) {
    $widget = authorizeWidgetCaller($pdo, $widgetId);
    if ($widget && $widget['type'] === 'ai_briefing') {
        $apiKey = getWidgetSecret($pdo, $widgetId, LLM_PROVIDERS[$provider]['secretField']) ?? '';
    }
}
if ($apiKey === '') {
    $apiKey = getEnvValue(LLM_PROVIDERS[$provider]['env']);
}
// A self-hosted server may need no key; every other provider does
$aiConfigured = $provider === 'vllm' ? $vllmUrl !== '' : $apiKey !== '';
$providerName = llmProviderLabel($provider);
$isTest = !empty($input['test']);
$forceRefresh = !empty($input['refresh']);

$userName = briefingField($input, 'userName', 60);
$tone = in_array($input['tone'] ?? '', ['warm', 'executive', 'motivational', 'concise'], true) ? $input['tone'] : 'warm';
$location = briefingField($input, 'location', 120);
$weather = briefingField($input, 'weather');
$events = briefingField($input, 'events');
$tasks = briefingField($input, 'tasks');
$localDate = briefingField($input, 'localDate', 60);
// Match the widget's refresh interval so each display generates at most one briefing per interval
$refreshHours = is_numeric($input['refreshHours'] ?? null) ? (float)$input['refreshHours'] : 3;
$freshSeconds = max(BRIEFING_MIN_FRESH_SECONDS, (int)($refreshHours * 3600) - 10 * 60);

// Part of the day comes from the display's clock; the server may be in another time zone.
$hour = isset($input['localHour']) && is_numeric($input['localHour']) ? (int)$input['localHour'] : (int)date('G');
if ($hour < 0 || $hour > 23) $hour = (int)date('G');
$timeOfDay = $hour < 12 ? 'morning' : ($hour < 17 ? 'afternoon' : 'evening');

// ---------------------------------------------------------------------------
// "Test connection" button in the editor
// ---------------------------------------------------------------------------
if ($isTest) {
    if (!$aiConfigured) {
        $missing = $provider === 'vllm' ? 'server URL' : 'API key';
        echo json_encode(["success" => false, "error" => "No {$missing} provided to test. Please enter one first."]);
        exit();
    }
    try {
        $result = llmComplete($provider, $apiKey, $model, $vllmUrl, 'You are a connection test.', 'Reply with exactly: OK');
        if ($result['text'] !== null) {
            echo json_encode([
                "success" => true,
                "provider" => $provider,
                "model" => $result['model'],
                "message" => "Connected to {$providerName}, using {$result['model']}."
            ]);
        } else {
            echo json_encode(["success" => false, "error" => llmErrorMessage($provider, $result)]);
        }
    } catch (\Exception $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    exit();
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
$cacheDir = sys_get_temp_dir() . '/sd_briefings';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0700, true);
// Briefings and rate-limit pauses are per provider, key, model and server
$keyId = $aiConfigured ? md5(json_encode([$provider, $apiKey, $model, $provider === 'vllm' ? $vllmUrl : ''])) : 'nokey';
// Same facts → same briefing. Exact weather is left out: temperatures drift every few minutes and would force a new call each time
$freshFile = $cacheDir . '/fresh_' . md5(json_encode([$keyId, $userName, $tone, $location, $events, $tasks, $timeOfDay, $localDate])) . '.json';
// Last good AI briefing for this person, place and part of the day (used when the provider fails)
$lastGoodFile = $cacheDir . '/good_' . md5(json_encode([$keyId, $userName, $tone, $location, $timeOfDay, $localDate])) . '.json';

function readBriefingCache(string $file): ?array {
    if (!is_file($file)) return null;
    $data = json_decode((string)@file_get_contents($file), true);
    return is_array($data) && !empty($data['briefing']) ? $data : null;
}

function respondBriefing(array $entry, string $timeOfDay, bool $cached, bool $stale = false, ?string $aiError = null, ?int $retryAfter = null): void {
    echo json_encode([
        "success" => true,
        "briefing" => $entry['briefing'],
        "provider" => $entry['provider'],
        "model" => $entry['model'] ?? null,
        "generatedAt" => gmdate('Y-m-d\TH:i:s\Z', (int)$entry['generatedAt']),
        "timeOfDay" => $timeOfDay,
        "cached" => $cached,
        "stale" => $stale,
        "providerName" => isset(LLM_PROVIDERS[$entry['provider']]) ? llmProviderLabel($entry['provider']) : null,
        "aiError" => $aiError,
        // Older widgets read this name
        "geminiError" => $aiError,
        // Seconds the widget should wait before asking again (set after a rate limit)
        "retryAfter" => $retryAfter
    ]);
    exit();
}

$fresh = readBriefingCache($freshFile);
if ($fresh && isset(LLM_PROVIDERS[$fresh['provider']])) {
    $age = time() - (int)$fresh['generatedAt'];
    if ($age < $freshSeconds && (!$forceRefresh || $age < BRIEFING_REFRESH_MIN_SECONDS)) {
        respondBriefing($fresh, $timeOfDay, true);
    }
}

// Rate-limit cooldown, shared by every display using this key
$cooldownFile = $cacheDir . '/cooldown_' . $keyId;
$cooldownUntil = is_file($cooldownFile) ? (int)@file_get_contents($cooldownFile) : 0;
$retryAfterSeconds = null;

// ---------------------------------------------------------------------------
// AI provider
// ---------------------------------------------------------------------------
$aiError = null;
if ($aiConfigured && $cooldownUntil > time()) {
    $retryAfterSeconds = $cooldownUntil - time();
    $aiError = "{$providerName} rate limit reached (HTTP 429). Paused; next try in about " . max(1, (int)ceil($retryAfterSeconds / 60)) . ' min.';
} elseif ($aiConfigured) {
    $facts = [];
    if ($localDate !== '') $facts[] = "Today is {$localDate}.";
    if ($location !== '') $facts[] = "Location: {$location}.";
    if ($weather !== '') $facts[] = "Current weather there: {$weather}.";
    if ($events !== '') $facts[] = "Calendar: {$events}.";
    if ($tasks !== '') $facts[] = "Tasks: {$tasks}.";
    $factsText = $facts ? implode(' ', $facts) : 'No calendar, weather or location details are available.';
    $who = $userName !== '' ? "for {$userName}" : 'for the household';

    $system = "You are the voice of a smart wall display. You write short spoken briefings. "
        . "Use only the facts you are given. Never invent or guess weather, temperatures, places, events or tasks; if a fact is missing, don't mention that topic. "
        . "Write 2 to 3 complete sentences, 40 to 80 words, ending with a short uplifting thought. "
        . "Plain text only: no markdown, emoji, hashtags or bullet points. Output only the briefing.";
    $user = "Write a {$timeOfDay} briefing {$who}. Tone: {$tone}. Facts: {$factsText}";

    try {
        $result = llmComplete($provider, $apiKey, $model, $vllmUrl, $system, $user);
        if ($result['text'] !== null) {
            $entry = [
                'briefing' => $result['text'],
                'provider' => $provider,
                'model' => $result['model'],
                'generatedAt' => time()
            ];
            @file_put_contents($freshFile, json_encode($entry), LOCK_EX);
            @file_put_contents($lastGoodFile, json_encode($entry), LOCK_EX);
            respondBriefing($entry, $timeOfDay, false);
        }
        $aiError = llmErrorMessage($provider, $result);
        if ($result['status'] === 429) {
            $wait = max(RATE_LIMIT_COOLDOWN, (int)($result['retryAfter'] ?? 0));
            @file_put_contents($cooldownFile, (string)(time() + $wait), LOCK_EX);
            $retryAfterSeconds = $wait;
        }
    } catch (\Exception $e) {
        $aiError = $e->getMessage();
    }
}

// The provider failed or is cooling down: an earlier AI briefing from this part of today beats the template engine
if ($aiConfigured && $aiError !== null) {
    $lastGood = readBriefingCache($lastGoodFile);
    if ($lastGood) {
        respondBriefing($lastGood, $timeOfDay, true, true, $aiError, $retryAfterSeconds);
    }
}

// ---------------------------------------------------------------------------
// Local template engine (no AI configured, or the provider unavailable). Uses only the facts sent.
// ---------------------------------------------------------------------------
$name = $userName !== '' ? ", {$userName}" : '';
$openers = [
    'morning' => ["Good morning{$name}!", "Rise and shine{$name}!"],
    'afternoon' => ["Good afternoon{$name}!", "Afternoon check-in{$name}."],
    'evening' => ["Good evening{$name}!", "Time to wind down{$name}."],
];
$closers = [
    'morning' => ["Have a great day.", "Make it a good one."],
    'afternoon' => ["Keep up the good work.", "You're doing great."],
    'evening' => ["Rest well tonight.", "Enjoy your evening."],
];
$sentences = [$openers[$timeOfDay][array_rand($openers[$timeOfDay])]];
if ($weather !== '') {
    $sentences[] = $location !== '' ? "In {$location} it's {$weather}." : "Outside it's {$weather}.";
}
if ($events !== '') $sentences[] = "Coming up: {$events}.";
if ($tasks !== '') $sentences[] = "On your list: {$tasks}.";
$sentences[] = $closers[$timeOfDay][array_rand($closers[$timeOfDay])];

respondBriefing([
    'briefing' => implode(' ', $sentences),
    'provider' => 'ambient_engine',
    'generatedAt' => time()
], $timeOfDay, false, false, $aiConfigured ? $aiError : null, $retryAfterSeconds);
