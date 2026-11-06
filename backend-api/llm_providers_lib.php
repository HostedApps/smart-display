<?php
/**
 * Text generation through one of several LLM providers, for short outputs (the AI briefing).
 *
 *   gemini     Google Gemini (model auto-resolved per key unless one is given)
 *   anthropic  Anthropic Messages API
 *   openai     OpenAI Chat Completions
 *   vllm       A self-hosted OpenAI-compatible server (vLLM, or anything speaking /v1/chat/completions)
 *
 * Every provider returns the same shape:
 *   ['text' => ?string, 'status' => int, 'error' => ?string, 'retryAfter' => ?int, 'model' => string]
 * status 0 means no HTTP response (timeout, DNS, refused connection).
 *
 * Raw HTTP via curl on purpose: the backend has no Composer and calls every other API this way.
 * ANTHROPIC_BASE_URL / OPENAI_BASE_URL override the endpoints (a proxy, or the test suite's mock).
 */

const LLM_PROVIDERS = [
    'gemini'    => ['label' => 'Google Gemini',  'secretField' => 'apiKey',       'env' => 'GEMINI_API_KEY'],
    'anthropic' => ['label' => 'Anthropic Claude', 'secretField' => 'anthropicKey', 'env' => 'ANTHROPIC_API_KEY'],
    'openai'    => ['label' => 'OpenAI',         'secretField' => 'openaiKey',    'env' => 'OPENAI_API_KEY'],
    'vllm'      => ['label' => 'Self-hosted (vLLM)', 'secretField' => 'vllmKey',  'env' => 'VLLM_API_KEY'],
];

const LLM_TIMEOUT_SECONDS = 20;
// Fast and inexpensive; a briefing is a few sentences. Override per widget (e.g. claude-opus-5-5).
const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-5-5';
const ANTHROPIC_API_VERSION = '2026-10-21';
const OPENAI_DEFAULT_MODEL = 'gpt-5-mini';

function llmProviderLabel(string $provider): string {
    return LLM_PROVIDERS[$provider]['label'] ?? $provider;
}

/** POST JSON. Returns [status, decodedBody|null, headers (lower-case name => value)]. */
function llmPostJson(string $url, array $headers, array $body, int $timeout = LLM_TIMEOUT_SECONDS): array {
    $responseHeaders = [];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$responseHeaders) {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
            return strlen($line);
        },
    ]);
    $res = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = is_string($res) ? json_decode($res, true) : null;
    return [$status, is_array($data) ? $data : null, $responseHeaders];
}

function llmGet(string $url, array $headers, int $timeout = 8): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => $timeout]);
    $res = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = is_string($res) ? json_decode($res, true) : null;
    return [$status, is_array($data) ? $data : null];
}

function llmRetryAfter(array $headers): ?int {
    $v = $headers['retry-after'] ?? null;
    return ($v !== null && is_numeric($v)) ? max(1, (int)ceil((float)$v)) : null;
}

function llmResult(?string $text, int $status, ?string $error, string $model, ?int $retryAfter = null): array {
    return ['text' => $text, 'status' => $status, 'error' => $error, 'retryAfter' => $retryAfter, 'model' => $model];
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------

function geminiGenerate(string $apiVersion, string $model, string $apiKey, array $payload): array {
    [$status, $data] = llmPostJson(
        "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key=" . urlencode($apiKey),
        [],
        $payload
    );
    if ($status !== 200) {
        // 429s carry a RetryInfo detail such as {"retryDelay": "37s"}
        $retryAfter = null;
        foreach ($data['error']['details'] ?? [] as $detail) {
            if (isset($detail['retryDelay']) && preg_match('/^(\d+(?:\.\d+)?)s$/', $detail['retryDelay'], $m)) {
                $retryAfter = (int)ceil((float)$m[1]);
            }
        }
        return llmResult(null, $status, $data['error']['message'] ?? null, $model, $retryAfter);
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
        return llmResult(null, 200, "Gemini returned no text ({$reason})", $model);
    }
    return llmResult($text, 200, null, $model);
}

/** Gemini with the key's best model, model-retirement recovery and a larger budget on MAX_TOKENS. */
function geminiComplete(string $apiKey, string $model, string $system, string $user, int $maxTokens): array {
    $apiVersion = 'v1beta';
    if ($model === '') {
        $info = resolveGeminiModel($apiKey);
        $apiVersion = $info['apiVersion'];
        $model = $info['model'];
    }
    // One combined prompt: resolveGeminiModel() may pick the v1 API, where systemInstruction isn't guaranteed
    $payload = [
        'contents' => [['role' => 'user', 'parts' => [['text' => $system . "\n\n" . $user]]]],
        'generationConfig' => ['temperature' => 0.7, 'maxOutputTokens' => $maxTokens],
    ];
    $result = geminiGenerate($apiVersion, $model, $apiKey, $payload);

    // Model retired or renamed: use the model Google suggests, else a current default
    if ($result['text'] === null && in_array($result['status'], [400, 404], true) && $result['error']
        && (stripos($result['error'], 'no longer available') !== false || stripos($result['error'], 'not found') !== false)) {
        $retryModel = 'gemini-3.6-flash';
        if (preg_match('/models\/(gemini-[a-zA-Z0-9\.\-]+)/i', $result['error'], $m) && $m[1] !== $model) {
            $retryModel = $m[1];
        }
        $result = geminiGenerate($apiVersion, $retryModel, $apiKey, $payload);
        if ($result['text'] !== null) {
            @file_put_contents(sys_get_temp_dir() . '/gemini_model_' . md5($apiKey) . '.json', json_encode(['apiVersion' => $apiVersion, 'model' => $retryModel]));
        }
    }

    // Thinking used up the output budget: once more with room to spare
    if ($result['text'] === null && $result['status'] === 200 && stripos((string)$result['error'], 'MAX_TOKENS') !== false) {
        $payload['generationConfig']['maxOutputTokens'] = 4096;
        $result = geminiGenerate($apiVersion, $result['model'], $apiKey, $payload);
    }
    return $result;
}

// ---------------------------------------------------------------------------
// Anthropic (Messages API)
// ---------------------------------------------------------------------------

/** Models that take output_config.effort (Claude 5 family; Opus 4.6+ / Sonnet 4.6) */
function anthropicSupportsEffort(string $model): bool {
    return (bool)preg_match('/^claude-(opus|sonnet|haiku|fable|mythos)-5|^claude-opus-4-[678]|^claude-sonnet-4-6/', $model);
}

/** Models with server-side refusal fallback (fallbacks: "default"); Claude Haiku 5.5 has none */
function anthropicSupportsFallbacks(string $model): bool {
    return (bool)preg_match('/^claude-(fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/', $model);
}

function anthropicComplete(string $apiKey, string $model, string $system, string $user): array {
    $model = $model !== '' ? $model : ANTHROPIC_DEFAULT_MODEL;
    $headers = ['x-api-key: ' . $apiKey, 'anthropic-version: ' . ANTHROPIC_API_VERSION];
    $body = [
        'model' => $model,
        // Headroom for thinking (on by default on current models); the briefing itself is ~100 tokens
        'max_tokens' => 16000,
        'system' => $system,
        'messages' => [['role' => 'user', 'content' => $user]],
    ];
    if (anthropicSupportsEffort($model)) {
        // A short briefing needs little reasoning
        $body['output_config'] = ['effort' => 'low'];
    }
    if (anthropicSupportsFallbacks($model)) {
        // If a safety classifier declines, Anthropic retries on its recommended fallback model
        $headers[] = 'anthropic-beta: server-side-fallback-2026-07-01';
        $body['fallbacks'] = 'default';
    }

    $base = rtrim(getEnvValue('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'), '/');
    [$status, $data, $respHeaders] = llmPostJson($base . '/v1/messages', $headers, $body, 45);
    if ($status !== 200) {
        return llmResult(null, $status, $data['error']['message'] ?? null, $model, llmRetryAfter($respHeaders));
    }
    if (($data['stop_reason'] ?? '') === 'refusal') {
        $category = $data['stop_details']['category'] ?? 'unspecified';
        return llmResult(null, 200, "Claude declined to write this briefing (refusal: {$category}).", $model);
    }
    $text = '';
    foreach ($data['content'] ?? [] as $block) {
        if (($block['type'] ?? '') === 'text') $text .= $block['text'];
    }
    $text = trim($text);
    if ($text === '') {
        return llmResult(null, 200, 'Claude returned no text (' . ($data['stop_reason'] ?? 'unknown') . ').', $data['model'] ?? $model);
    }
    return llmResult($text, 200, null, $data['model'] ?? $model);
}

// ---------------------------------------------------------------------------
// OpenAI and OpenAI-compatible servers (vLLM)
// ---------------------------------------------------------------------------

/** Text of a chat completion; reasoning models served by vLLM may wrap their reasoning in <think> tags. */
function chatCompletionText(?array $data): string {
    $text = (string)($data['choices'][0]['message']['content'] ?? '');
    $text = preg_replace('/<think>.*?<\/think>/s', '', $text);
    return trim($text);
}

function openaiComplete(string $apiKey, string $model, string $system, string $user): array {
    $model = $model !== '' ? $model : OPENAI_DEFAULT_MODEL;
    $base = rtrim(getEnvValue('OPENAI_BASE_URL', 'https://api.openai.com/v1'), '/');
    [$status, $data, $respHeaders] = llmPostJson($base . '/chat/completions', ['Authorization: Bearer ' . $apiKey], [
        'model' => $model,
        'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $user]],
        // Includes any reasoning tokens on reasoning models; temperature is left at the default,
        // which is the only value some current models accept
        'max_completion_tokens' => 4000,
    ], 45);
    if ($status !== 200) {
        return llmResult(null, $status, $data['error']['message'] ?? null, $model, llmRetryAfter($respHeaders));
    }
    $text = chatCompletionText($data);
    if ($text === '') {
        return llmResult(null, 200, 'OpenAI returned no text (' . ($data['choices'][0]['finish_reason'] ?? 'unknown') . ').', $model);
    }
    return llmResult($text, 200, null, $data['model'] ?? $model);
}

/**
 * Normalised base URL of an OpenAI-compatible server ("https://host/v1"), or '' if not allowed.
 * Private and local addresses are refused unless ALLOW_PRIVATE_LLM_URLS=1 (self-hosted installs
 * on the same network as their LLM server): the hosted service must not be used to probe LANs.
 */
function vllmBaseUrl(string $url): string {
    $url = rtrim(trim($url), '/');
    if (!preg_match('#^https?://#i', $url)) return '';
    if (!preg_match('#/v1$#', $url)) $url .= '/v1';
    if (getEnvValue('ALLOW_PRIVATE_LLM_URLS') !== '1' && !isSafeExternalUrl($url)) return '';
    return $url;
}

/** The first model the server lists (vLLM serves one model unless configured otherwise), cached 1 h. */
function vllmDefaultModel(string $baseUrl, array $headers): string {
    $cache = sys_get_temp_dir() . '/vllm_models_' . md5($baseUrl) . '.json';
    if (is_file($cache) && time() - filemtime($cache) < 3600) {
        return (string)@file_get_contents($cache);
    }
    [$status, $data] = llmGet($baseUrl . '/models', $headers);
    $model = $status === 200 ? (string)($data['data'][0]['id'] ?? '') : '';
    if ($model !== '') @file_put_contents($cache, $model);
    return $model;
}

function vllmComplete(string $apiKey, string $model, string $baseUrl, string $system, string $user): array {
    $base = vllmBaseUrl($baseUrl);
    if ($base === '') {
        return llmResult(null, 400, 'Self-hosted server URL is missing, not http(s), or a private address this server may not call.', $model);
    }
    $headers = $apiKey !== '' ? ['Authorization: Bearer ' . $apiKey] : [];
    if ($model === '') {
        $model = vllmDefaultModel($base, $headers);
        if ($model === '') {
            return llmResult(null, 0, "Couldn't list models at {$base}/models. Check the URL, or enter the model name.", '');
        }
    }
    [$status, $data, $respHeaders] = llmPostJson($base . '/chat/completions', $headers, [
        'model' => $model,
        'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $user]],
        'max_tokens' => 1024,
        'temperature' => 0.7,
    ], 60);
    if ($status !== 200) {
        $error = is_array($data['error'] ?? null) ? ($data['error']['message'] ?? null) : ($data['message'] ?? ($data['detail'] ?? null));
        return llmResult(null, $status, is_string($error) ? $error : null, $model, llmRetryAfter($respHeaders));
    }
    $text = chatCompletionText($data);
    if ($text === '') {
        return llmResult(null, 200, 'The self-hosted model returned no text (' . ($data['choices'][0]['finish_reason'] ?? 'unknown') . ').', $model);
    }
    return llmResult($text, 200, null, $model);
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/**
 * Generate with the chosen provider. Retries once on a timeout or 5xx (incl. Anthropic's 529
 * "overloaded") if the first attempt left time for it; never on 429, since retrying straight away
 * only spends more of the quota (ai_briefing.php pauses that key instead).
 */
function llmComplete(string $provider, string $apiKey, string $model, string $baseUrl, string $system, string $user): array {
    $call = function () use ($provider, $apiKey, $model, $baseUrl, $system, $user): array {
        switch ($provider) {
            case 'anthropic': return anthropicComplete($apiKey, $model, $system, $user);
            case 'openai':    return openaiComplete($apiKey, $model, $system, $user);
            case 'vllm':      return vllmComplete($apiKey, $model, $baseUrl, $system, $user);
            default:          return geminiComplete($apiKey, $model, $system, $user, 2048);
        }
    };
    $started = microtime(true);
    $result = $call();
    $transient = $result['status'] === 0 || $result['status'] >= 500;
    if ($result['text'] === null && $transient && (microtime(true) - $started) < 10) {
        sleep(2);
        $result = $call();
    }
    return $result;
}

/** A short, human explanation of a failed call, for the widget's tooltip and the Test button. */
function llmErrorMessage(string $provider, array $result): string {
    $name = llmProviderLabel($provider);
    $status = $result['status'];
    if ($status === 0) return $result['error'] ?: "{$name} did not respond in time.";
    if ($status === 429) return "{$name} rate limit reached (HTTP 429). Pausing calls; the next try is automatic.";
    if ($status === 401 || $status === 403) return "{$name} rejected the API key (HTTP {$status})." . ($result['error'] ? ' ' . $result['error'] : '');
    if ($status === 529) return "{$name} is overloaded right now (HTTP 529).";
    if ($status >= 500) return "{$name} is temporarily unavailable (HTTP {$status}).";
    return $result['error'] ?: "{$name} returned HTTP {$status}.";
}
