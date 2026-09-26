<?php
require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true) ?? $_GET;
$apiKey = trim($input['apiKey'] ?? '');

// Fallback to server-level GEMINI_API_KEY environment variable if not supplied in widget config
if (empty($apiKey) && getenv('GEMINI_API_KEY')) {
    $apiKey = getenv('GEMINI_API_KEY');
}
$userName = trim($input['userName'] ?? 'there');
$weatherDesc = trim($input['weatherDesc'] ?? 'Sunny, 74°F');
$calendarSummary = trim($input['calendarSummary'] ?? 'No urgent meetings');
$tasksSummary = trim($input['tasksSummary'] ?? 'All clear');
$tone = trim($input['tone'] ?? 'warm'); // 'warm' | 'executive' | 'motivational' | 'concise'

// Hour of day to tailor greeting
$hour = (int)date('G');
if ($hour < 12) {
    $timeOfDay = 'morning';
} else if ($hour < 17) {
    $timeOfDay = 'afternoon';
} else {
    $timeOfDay = 'evening';
}

$isTest = !empty($input['test']);
$geminiError = null;

// 1. If Gemini API Key provided, dynamically resolve and call supported model
if (!empty($apiKey)) {
    try {
        $modelInfo = resolveGeminiModel($apiKey);
        $apiVersion = $modelInfo['apiVersion'];
        $modelName = $modelInfo['model'];

        $prompt = $isTest 
            ? "Respond with exactly: 'Gemini ($modelName) is connected and working perfectly!'"
            : "You are an intelligent, articulate ambient smart wall display executive assistant. "
            . "Generate a warm, inspiring, and complete 3-sentence $timeOfDay briefing for $userName. "
            . "Tone: $tone. "
            . "Current context: Weather: $weatherDesc. Schedule: $calendarSummary. Pending tasks: $tasksSummary. "
            . "Provide a thoughtful, motivating overview of the $timeOfDay, reflecting on the current conditions, upcoming focus, and an uplifting thought. "
            . "Requirements: Every sentence must be fully completed. Write approx. 50 to 80 words. Do not truncate mid-sentence. Do not use markdown, hashtags, or bullet points. Output ONLY the spoken briefing text.";

        $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$modelName}:generateContent?key=" . urlencode($apiKey);
        $payload = [
            "contents" => [
                ["parts" => [["text" => $prompt]]]
            ],
            "generationConfig" => [
                "temperature" => 0.7,
                "maxOutputTokens" => 800
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $res) {
            $data = json_decode($res, true);
            $parts = $data['candidates'][0]['content']['parts'] ?? [];
            $text = '';
            foreach ($parts as $p) {
                if (!empty($p['thought'])) continue;
                if (!empty($p['text'])) $text .= $p['text'];
            }
            $text = trim($text);
            if (!empty($text)) {
                echo json_encode([
                    "success" => true,
                    "briefing" => $text,
                    "timeOfDay" => $timeOfDay,
                    "provider" => "gemini",
                    "model" => $modelName,
                    "message" => "Connected successfully! Using {$modelName} ({$apiVersion})"
                ]);
                exit();
            }
        } else {
            $errData = json_decode($res, true);
            $errMessage = $errData['error']['message'] ?? "Google API returned HTTP $httpCode";

            // If Google says the model is no longer available or suggests a replacement model
            if (stripos($errMessage, 'no longer available') !== false || stripos($errMessage, 'models/') !== false) {
                // Extract suggested model or fall back to gemini-3.6-flash
                $retryModel = 'gemini-3.6-flash';
                if (preg_match('/models\/(gemini-[a-zA-Z0-9\.\-]+)/i', $errMessage, $suggMatch)) {
                    if ($suggMatch[1] !== $modelName) {
                        $retryModel = $suggMatch[1];
                    }
                }

                $retryUrl = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$retryModel}:generateContent?key=" . urlencode($apiKey);
                $ch2 = curl_init($retryUrl);
                curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch2, CURLOPT_POST, true);
                curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($payload));
                curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($ch2, CURLOPT_TIMEOUT, 8);
                $res2 = curl_exec($ch2);
                $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
                curl_close($ch2);

                if ($httpCode2 === 200 && $res2) {
                    $data2 = json_decode($res2, true);
                    $parts2 = $data2['candidates'][0]['content']['parts'] ?? [];
                    $text2 = '';
                    foreach ($parts2 as $p) {
                        if (!empty($p['thought'])) continue;
                        if (!empty($p['text'])) $text2 .= $p['text'];
                    }
                    $text2 = trim($text2);
                    if (!empty($text2)) {
                        // Update cache with the working model
                        $cacheFile = sys_get_temp_dir() . '/gemini_model_' . md5($apiKey) . '.json';
                        @file_put_contents($cacheFile, json_encode(['apiVersion' => $apiVersion, 'model' => $retryModel]));

                        echo json_encode([
                            "success" => true,
                            "briefing" => $text2,
                            "timeOfDay" => $timeOfDay,
                            "provider" => "gemini",
                            "model" => $retryModel,
                            "message" => "Connected successfully! Using {$retryModel} ({$apiVersion})"
                        ]);
                        exit();
                    }
                } else {
                    $errData2 = json_decode($res2, true);
                    $geminiError = $errData2['error']['message'] ?? $errMessage;
                }
            } else {
                $geminiError = $errMessage;
            }
        }
    } catch (\Exception $e) {
        $geminiError = $e->getMessage();
    }
} elseif ($isTest) {
    echo json_encode([
        "success" => false,
        "error" => "No API key provided to test. Please enter a key first."
    ]);
    exit();
}

if ($isTest) {
    echo json_encode([
        "success" => false,
        "error" => $geminiError ?: "Failed to connect to Google Gemini API."
    ]);
    exit();
}

// 2. Intelligent Contextual Local Briefing Engine (Zero-API Key Fallback)
$greetings = [
    'morning' => [
        "Good morning, $userName! Today is looking great with $weatherDesc. Your schedule is ready: $calendarSummary.",
        "Rise and shine, $userName! It's currently $weatherDesc. Here's your focus today: $calendarSummary.",
        "Bright morning ahead! Expect $weatherDesc today. Key highlights on your radar: $calendarSummary."
    ],
    'afternoon' => [
        "Good afternoon, $userName! Staying pleasant with $weatherDesc. Remaining on your agenda: $calendarSummary.",
        "Midday update: Conditions are $weatherDesc. Keep up the momentum with $calendarSummary.",
        "Afternoon check-in! $weatherDesc outside, with $calendarSummary coming up."
    ],
    'evening' => [
        "Good evening, $userName! Wrapping up the day at $weatherDesc. Evening outlook: $calendarSummary.",
        "Winding down: It's $weatherDesc tonight. Tomorrow's preparations: $calendarSummary.",
        "Rest and recharge, $userName! Nighttime temperatures at $weatherDesc. Everything is in order for tomorrow."
    ]
];

$pool = $greetings[$timeOfDay];
$chosen = $pool[array_rand($pool)];

if (!empty($tasksSummary) && $tasksSummary !== 'All clear') {
    $chosen .= " Remember: $tasksSummary.";
}

echo json_encode([
    "success" => true,
    "briefing" => $chosen,
    "timeOfDay" => $timeOfDay,
    "provider" => "ambient_engine",
    "geminiError" => !empty($apiKey) ? $geminiError : null
]);
