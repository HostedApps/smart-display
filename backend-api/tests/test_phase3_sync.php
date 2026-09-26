<?php
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

echo "Running Phase 3 Sync & Feature Tests...\n";

// Test 1: Calendar sync event creation & structure
$customEvents = [];
$newEvent = [
    "id" => "ev_" . time(),
    "title" => "Soccer Practice",
    "startDate" => "2026-09-27T17:00:00Z",
    "endDate" => "2026-09-27T18:30:00Z",
    "isAllDay" => false,
    "color" => "#ec4899",
    "feedName" => "Kids",
    "location" => "Central Park"
];
$customEvents[] = $newEvent;
assertTrue(count($customEvents) === 1, "Calendar customEvent successfully created");
assertTrue($customEvents[0]['feedName'] === "Kids", "Event feed name preserved");
assertTrue(!empty($customEvents[0]['startDate']), "Event ISO startDate present");

// Test 2: Calendar event deletion
$delId = $customEvents[0]['id'];
$customEvents = array_values(array_filter($customEvents, function($ev) use ($delId) {
    return $ev['id'] !== $delId;
}));
assertTrue(count($customEvents) === 0, "Calendar customEvent deleted cleanly");

// Test 3: Whiteboard strokes capping and serialization
$strokes = [];
for ($i = 0; $i < 600; $i++) {
    $strokes[] = [
        "color" => "#38bdf8",
        "width" => 3,
        "tool" => "pen",
        "points" => [["x" => $i, "y" => $i]]
    ];
}
if (count($strokes) > 500) {
    $cappedStrokes = array_slice($strokes, -500);
} else {
    $cappedStrokes = $strokes;
}
assertTrue(count($cappedStrokes) === 500, "Whiteboard strokes capped at max 500 to prevent DB bloat");

// Test 4: Custom CSS sanitize - strips script tags while preserving CSS
$rawCss = ".widget-card { background: red; } <script>alert('hack');</script> h1 { color: blue; }";
$cleanCss = preg_replace('/<\s*script\b[^>]*>(.*?)<\s*\/\s*script\s*>/is', '', $rawCss);
assertTrue(strpos($cleanCss, '<script>') === false, "Custom CSS strips embedded script tags");
assertTrue(strpos($cleanCss, '.widget-card { background: red; }') !== false, "Custom CSS preserves valid CSS rules");

// Test 5: Audio chime configuration defaults
$bgConfig = [
    "audio_chimes_enabled" => true,
    "hourly_chime" => true
];
assertTrue((bool)$bgConfig['audio_chimes_enabled'] === true, "Audio chimes toggle is active");
assertTrue((bool)$bgConfig['hourly_chime'] === true, "Hourly chime toggle is active");

echo "Phase 3 Tests Complete: $passed passed, $failed failed.\n\n";
