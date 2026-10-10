<?php
/**
 * AI Ambient Briefing.
 *
 * The widget sends the real context it knows (location, weather, next event, the display's
 * local hour and date). Nothing is invented here: facts the widget didn't send are left out.
 *
 * Gemini calls are cached per context, so carousel page changes, several kiosks and editor
 * previews share one generation. If Gemini fails (rate limit, overload, timeout), the last good
 * Gemini briefing for the same person, place and part of the day is served before falling back
 * to the local template engine.
 */
require_once 'db.php';

const BRIEFING_MIN_FRESH_SECONDS = 110 * 60;  // reuse a generated briefing at least this long (widget refresh is ≥ 2 h)
const BRIEFING_REFRESH_MIN_SECONDS = 10 * 60;  // the manual refresh button can't bypass the cache faster than this
const GEMINI_TIMEOUT_SECONDS = 15;
const GEMINI_RATE_LIMIT_COOLDOWN = 30 * 60;    // after a 429, don't call Gemini with that key for this long (unless Google says sooner)

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_GET;

/** Trimmed, tag-free, length-capped text from the request (prompt input, never HTML output). */
function briefingField(array $input, string $key, int $maxLen = 300): string {
    $val = $input[$key] ?? '';
    if (!is_string($val) && !is_numeric($val)) return '';
    $val = trim(preg_replace('/\s+/u', ' ', strip_tags((string)$val)));
    return mb_substr($val, 0, $maxLen);
}

$apiKey = briefingField($input, 'apiKey', 200);
if ($apiKey === '' && getenv('GEMINI_API_KEY')) {
    $apiKey = getenv('GEMINI_API_KEY');
}
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

/**
 * One generateContent call. Returns ['text' => string|null, 'status' => int, 'error' => string|null].
 */
function geminiGenerate(string $apiVersion, string $model, string $apiKey, array $payload): array {
    $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key=" . urlencode($apiKey);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, GEMINI_TIMEOUT_SECONDS);
    $res = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = is_string($res) ? json_decode($res, true) : null;
    if ($status !== 200) {
        // 429s carry a RetryInfo detail such as {"retryDelay": "37s"}
        $retryAfter = null;
        foreach ($data['error']['details'] ?? [] as $detail) {
            if (isset($detail['retryDelay']) && preg_match('/^(\d+(?:\.\d+)?)s$/', $detail['retryDelay'], $m)) {
                $retryAfter = (int)ceil((float)$m[1]);
            }
        }
        return ['text' => null, 'status' => $status, 'error' => $data['error']['message'] ?? null, 'retryAfter' => $retryAfter];
    }

    $candidate = $data['candidates'][0] ?? [];
    $text = '';
    foreach ($candidate['content']['parts'] ?? [] as $part) {
        if (!empty($part['thought'])) continue;
        if (!empty($part['text'])) $text .= $part['text'];
    }
    $text = trim($text);
    if ($text === '') {
        $reason = $candidate['finishReason'] ?? ($data['promptFeedback']['blockReason'] ?? 'no text');
        return ['text' => null, 'status' => 200, 'error' => "Gemini returned no briefing text ({$reason})"];
    }
    return ['text' => $text, 'status' => 200, 'error' => null];
}

/** A short, human explanation of a failed Gemini call for the widget's tooltip. */
function geminiErrorMessage(array $result): string {
    $status = $result['status'];
    if ($status === 0) return 'Gemini did not respond in time.';
    if ($status === 429) return 'Gemini rate limit reached (HTTP 429). Pausing Gemini calls; the next try is automatic.';
    if ($status >= 500) return "Gemini is temporarily unavailable (HTTP {$status}).";
    return $result['error'] ?: "Gemini returned HTTP {$status}.";
}

/**
 * Generate text with the key's best available model, retrying once on transient failures
 * (timeout, 429, 5xx) and switching model if Google says the resolved one is gone.
 */
function geminiGenerateWithRetry(string $apiKey, array $payload): array {
    $modelInfo = resolveGeminiModel($apiKey);
    $apiVersion = $modelInfo['apiVersion'];
    $model = $modelInfo['model'];

    $started = microtime(true);
    $result = geminiGenerate($apiVersion, $model, $apiKey, $payload);

    // Model retired or renamed: use the model Google suggests, else a current default
    if ($result['text'] === null && in_array($result['status'], [400, 404], true)
        && $result['error'] && (stripos($result['error'], 'no longer available') !== false || stripos($result['error'], 'not found') !== false)) {
        $retryModel = 'gemini-3.6-flash';
        if (preg_match('/models\/(gemini-[a-zA-Z0-9\.\-]+)/i', $result['error'], $m) && $m[1] !== $model) {
            $retryModel = $m[1];
        }
        $model = $retryModel;
        $result = geminiGenerate($apiVersion, $model, $apiKey, $payload);
        if ($result['text'] !== null) {
            $cacheFile = sys_get_temp_dir() . '/gemini_model_' . md5($apiKey) . '.json';
            @file_put_contents($cacheFile, json_encode(['apiVersion' => $apiVersion, 'model' => $model]));
        }
    }

    // Thinking used up the output budget: try once more with room to spare
    if ($result['text'] === null && $result['status'] === 200 && stripos((string)$result['error'], 'MAX_TOKENS') !== false) {
        $payload['generationConfig']['maxOutputTokens'] = 4096;
        $result = geminiGenerate($apiVersion, $model, $apiKey, $payload);
    }

    // Transient failure: one retry, if the first attempt left time for it. Never on 429: retrying
    // straight away only spends more of the quota.
    $transient = $result['status'] === 0 || $result['status'] >= 500;
    if ($result['text'] === null && $transient && (microtime(true) - $started) < 8) {
        sleep(2);
        $result = geminiGenerate($apiVersion, $model, $apiKey, $payload);
    }

    $result['model'] = $model;
    $result['apiVersion'] = $apiVersion;
    return $result;
}

// ---------------------------------------------------------------------------
// "Test Key" button in the editor
// ---------------------------------------------------------------------------
if ($isTest) {
    if ($apiKey === '') {
        echo json_encode(["success" => false, "error" => "No API key provided to test. Please enter a key first."]);
        exit();
    }
    try {
        $result = geminiGenerateWithRetry($apiKey, [
            "contents" => [["parts" => [["text" => "Respond with exactly: OK"]]]],
            "generationConfig" => ["temperature" => 0, "maxOutputTokens" => 1024]
        ]);
        if ($result['text'] !== null) {
            echo json_encode([
                "success" => true,
                "model" => $result['model'],
                "message" => "Connected! Using {$result['model']} ({$result['apiVersion']})."
            ]);
        } else {
            echo json_encode(["success" => false, "error" => geminiErrorMessage($result)]);
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
$keyId = $apiKey !== '' ? md5($apiKey) : 'nokey';
// Same facts → same briefing. Exact weather is left out: temperatures drift every few minutes and would force a new call each time
$freshFile = $cacheDir . '/fresh_' . md5(json_encode([$keyId, $userName, $tone, $location, $events, $tasks, $timeOfDay, $localDate])) . '.json';
// Last good Gemini briefing for this person, place and part of the day (used when Gemini fails)
$lastGoodFile = $cacheDir . '/good_' . md5(json_encode([$keyId, $userName, $tone, $location, $timeOfDay, $localDate])) . '.json';

function readBriefingCache(string $file): ?array {
    if (!is_file($file)) return null;
    $data = json_decode((string)@file_get_contents($file), true);
    return is_array($data) && !empty($data['briefing']) ? $data : null;
}

function respondBriefing(array $entry, string $timeOfDay, bool $cached, bool $stale = false, ?string $geminiError = null, ?int $retryAfter = null): void {
    echo json_encode([
        "success" => true,
        "briefing" => $entry['briefing'],
        "provider" => $entry['provider'],
        "model" => $entry['model'] ?? null,
        "generatedAt" => gmdate('Y-m-d\TH:i:s\Z', (int)$entry['generatedAt']),
        "timeOfDay" => $timeOfDay,
        "cached" => $cached,
        "stale" => $stale,
        "geminiError" => $geminiError,
        // Seconds the widget should wait before asking again (set after a Gemini rate limit)
        "retryAfter" => $retryAfter
    ]);
    exit();
}

$fresh = readBriefingCache($freshFile);
if ($fresh && $fresh['provider'] === 'gemini') {
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
// Gemini
// ---------------------------------------------------------------------------
$geminiError = null;
if ($apiKey !== '' && $cooldownUntil > time()) {
    $retryAfterSeconds = $cooldownUntil - time();
    $geminiError = 'Gemini rate limit reached (HTTP 429). Paused; next try in about ' . max(1, (int)ceil($retryAfterSeconds / 60)) . ' min.';
} elseif ($apiKey !== '') {
    $facts = [];
    if ($localDate !== '') $facts[] = "Today is {$localDate}.";
    if ($location !== '') $facts[] = "Location: {$location}.";
    if ($weather !== '') $facts[] = "Current weather there: {$weather}.";
    if ($events !== '') $facts[] = "Calendar: {$events}.";
    if ($tasks !== '') $facts[] = "Tasks: {$tasks}.";
    $factsText = $facts ? implode(' ', $facts) : 'No calendar, weather or location details are available.';
    $who = $userName !== '' ? "for {$userName}" : 'for the household';

    $prompt = "You are the voice of a smart wall display. Write a {$timeOfDay} briefing {$who}. "
        . "Tone: {$tone}. "
        . "Facts you may use: {$factsText} "
        . "Rules: use only the facts above. Never invent or guess weather, temperatures, places, events or tasks; if a fact is missing, don't mention that topic. "
        . "Write 2 to 3 complete sentences, 40 to 80 words, ending with a short uplifting thought. "
        . "Plain text only: no markdown, emoji, hashtags or bullet points. Output only the briefing.";

    try {
        $result = geminiGenerateWithRetry($apiKey, [
            "contents" => [["parts" => [["text" => $prompt]]]],
            "generationConfig" => ["temperature" => 0.7, "maxOutputTokens" => 2048]
        ]);
        if ($result['text'] !== null) {
            $entry = [
                'briefing' => $result['text'],
                'provider' => 'gemini',
                'model' => $result['model'],
                'generatedAt' => time()
            ];
            @file_put_contents($freshFile, json_encode($entry), LOCK_EX);
            @file_put_contents($lastGoodFile, json_encode($entry), LOCK_EX);
            respondBriefing($entry, $timeOfDay, false);
        }
        $geminiError = geminiErrorMessage($result);
        if ($result['status'] === 429) {
            $wait = max(GEMINI_RATE_LIMIT_COOLDOWN, (int)($result['retryAfter'] ?? 0));
            @file_put_contents($cooldownFile, (string)(time() + $wait), LOCK_EX);
            $retryAfterSeconds = $wait;
        }
    } catch (\Exception $e) {
        $geminiError = $e->getMessage();
    }
}

// Gemini failed or is cooling down: an earlier Gemini briefing from this part of today beats the template engine
if ($apiKey !== '' && $geminiError !== null) {
    $lastGood = readBriefingCache($lastGoodFile);
    if ($lastGood) {
        respondBriefing($lastGood, $timeOfDay, true, true, $geminiError, $retryAfterSeconds);
    }
}

// ---------------------------------------------------------------------------
// Local template engine (no API key, or Gemini unavailable). Uses only the facts sent.
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
], $timeOfDay, false, false, $apiKey !== '' ? $geminiError : null, $retryAfterSeconds);
