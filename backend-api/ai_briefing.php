<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_GET;
$apiKey = trim($input['apiKey'] ?? '');
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

// 1. If Gemini API Key provided, call Google Gemini 1.5 Flash
if (!empty($apiKey)) {
    try {
        $prompt = "You are an ambient luxury smart wall display assistant. Generate a concise, natural, warm 2-sentence $timeOfDay briefing for $userName. "
            . "Tone: $tone. Weather: $weatherDesc. Schedule: $calendarSummary. Pending tasks: $tasksSummary. "
            . "Do not use bullet points or hashtags. Keep it under 45 words. Output ONLY the summary text.";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . urlencode($apiKey);
        $payload = [
            "contents" => [
                ["parts" => [["text" => $prompt]]]
            ],
            "generationConfig" => [
                "temperature" => 0.7,
                "maxOutputTokens" => 80
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $res) {
            $data = json_decode($res, true);
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            if (!empty($text)) {
                echo json_encode([
                    "success" => true,
                    "briefing" => trim($text),
                    "timeOfDay" => $timeOfDay,
                    "provider" => "gemini"
                ]);
                exit();
            }
        }
    } catch (\Exception $e) {
        // Fall back to contextual engine
    }
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
    "provider" => "ambient_engine"
]);
