<?php
/**
 * Mock LLM APIs for the test suite (never deployed: deploy.sh excludes tests/).
 * Routes by PATH_INFO:
 *   /anthropic/v1/messages          Anthropic Messages API
 *   /openai/v1/chat/completions     OpenAI Chat Completions
 *   /vllm/v1/models, /vllm/v1/chat/completions   OpenAI-compatible server (vLLM)
 * Special API keys: "ratelimit" → 429 with Retry-After: 120, "overloaded" → 529, "refuse" → a
 * Claude refusal. The last request (headers + body) is saved for assertions.
 */
header('Content-Type: application/json');
$path = $_SERVER['PATH_INFO'] ?? '';
$body = json_decode(file_get_contents('php://input'), true) ?: [];
$headers = array_change_key_case(getallheaders(), CASE_LOWER);
$key = $headers['x-api-key'] ?? preg_replace('/^Bearer\s+/i', '', $headers['authorization'] ?? '');
file_put_contents(sys_get_temp_dir() . '/mock_llm_last.json', json_encode(['path' => $path, 'headers' => $headers, 'body' => $body]));

function userText(array $body): string {
    foreach (array_reverse($body['messages'] ?? []) as $m) {
        if (($m['role'] ?? '') === 'user') return is_string($m['content']) ? $m['content'] : json_encode($m['content']);
    }
    return '';
}

if ($key === 'ratelimit') {
    http_response_code(429);
    header('Retry-After: 120');
    echo json_encode(['error' => ['type' => 'rate_limit_error', 'message' => 'Rate limited']]);
    exit();
}
if ($key === 'overloaded') {
    http_response_code(529);
    echo json_encode(['type' => 'error', 'error' => ['type' => 'overloaded_error', 'message' => 'Overloaded']]);
    exit();
}

if ($path === '/anthropic/v1/messages') {
    if ($key === '' || ($headers['anthropic-version'] ?? '') === '') {
        http_response_code(401);
        echo json_encode(['type' => 'error', 'error' => ['type' => 'authentication_error', 'message' => 'invalid x-api-key']]);
        exit();
    }
    if ($key === 'refuse') {
        echo json_encode(['model' => $body['model'], 'content' => [], 'stop_reason' => 'refusal', 'stop_details' => ['type' => 'refusal', 'category' => 'cyber']]);
        exit();
    }
    echo json_encode([
        'model' => $body['model'],
        'content' => [['type' => 'thinking', 'thinking' => ''], ['type' => 'text', 'text' => 'Claude mock briefing. ' . userText($body)]],
        'stop_reason' => 'end_turn'
    ]);
    exit();
}

if ($path === '/vllm/v1/models') {
    echo json_encode(['object' => 'list', 'data' => [['id' => 'mock-served-model', 'object' => 'model']]]);
    exit();
}

if ($path === '/openai/v1/chat/completions' || $path === '/vllm/v1/chat/completions') {
    if ($path === '/openai/v1/chat/completions' && $key === '') {
        http_response_code(401);
        echo json_encode(['error' => ['message' => 'Incorrect API key provided']]);
        exit();
    }
    $content = ($path === '/vllm/v1/chat/completions' ? '<think>internal reasoning</think>' : '') . 'Chat mock briefing. ' . userText($body);
    echo json_encode(['model' => $body['model'], 'choices' => [['message' => ['role' => 'assistant', 'content' => $content], 'finish_reason' => 'stop']]]);
    exit();
}

http_response_code(404);
echo json_encode(['error' => ['message' => "No mock route for $path"]]);
