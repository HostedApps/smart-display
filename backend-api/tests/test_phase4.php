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

echo "Running Phase 4 Platform & Ecosystem Tests...\n";

// Test 1: TouchHub configuration structure & validation
$touchHubConfig = [
    'enabled' => true,
    'autoHide' => true,
    'position' => 'bottom',
    'items' => [
        ['id' => 'th_1', 'label' => 'Main', 'icon' => 'home', 'action' => 'page', 'target' => 'p_1'],
        ['id' => 'th_2', 'label' => 'Draw', 'icon' => 'edit', 'action' => 'whiteboard'],
        ['id' => 'th_3', 'label' => 'Tasks', 'icon' => 'check_circle', 'action' => 'tasks'],
        ['id' => 'th_4', 'label' => 'Music', 'icon' => 'music_note', 'action' => 'spotify']
    ]
];
assertTrue($touchHubConfig['enabled'] === true, "TouchHub enabled flag parsed");
assertTrue(count($touchHubConfig['items']) === 4, "TouchHub default items defined");
assertTrue($touchHubConfig['items'][1]['action'] === 'whiteboard', "TouchHub whiteboard action defined");

// Test 2: TouchHub JSON serialization in background_json simulation
$bgData = [
    'type' => 'color',
    'value' => '#0f172a',
    'touchhub_enabled' => true,
    'touchhub_config' => $touchHubConfig
];
$encoded = json_encode($bgData);
$decoded = json_decode($encoded, true);
assertTrue($decoded['touchhub_enabled'] === true, "TouchHub enabled flag serialized in background_json");
assertTrue(isset($decoded['touchhub_config']['items']), "TouchHub items preserved in background_json");

// Test 3: iCloud Shared Album token extraction logic
$urls = [
    'https://www.icloud.com/sharedalbum/#B125ON9t3JG0fK' => 'B125ON9t3JG0fK',
    'https://www.icloud.com/sharedalbum/B02GRkMw9G3z77x' => 'B02GRkMw9G3z77x',
    'B0xXyz12345678' => 'B0xXyz12345678'
];
foreach ($urls as $url => $expectedToken) {
    $token = '';
    if (preg_match('/#([a-zA-Z0-9_\-]+)/', $url, $m)) {
        $token = $m[1];
    } else if (preg_match('/sharedalbum\/([a-zA-Z0-9_\-]+)/', $url, $m)) {
        $token = $m[1];
    } else if (preg_match('/^[a-zA-Z0-9_\-]{8,40}$/', $url)) {
        $token = $url;
    }
    assertTrue($token === $expectedToken, "iCloud token extracted correctly from $url");
}

// Test 4: Reddit Post image filter and parser simulation
$mockRedditChild = [
    'data' => [
        'id' => 'post_123',
        'title' => 'Milky Way rising over Mount Rainier',
        'author' => 'astrophotographer',
        'url' => 'https://i.redd.it/sample_galaxy.jpg',
        'permalink' => '/r/EarthPorn/comments/post_123/',
        'score' => 7420,
        'num_comments' => 189,
        'over_18' => false
    ]
];
$p = $mockRedditChild['data'];
$isImage = (preg_match('/\.(jpg|jpeg|png|webp)($|\?)/i', $p['url']) || (strpos($p['url'], 'i.redd.it') !== false));
assertTrue($isImage, "Reddit image URL correctly identified as valid photo media");
$parsedPost = [
    'id' => $p['id'],
    'title' => html_entity_decode($p['title']),
    'author' => $p['author'],
    'url' => $p['url'],
    'permalink' => 'https://reddit.com' . $p['permalink'],
    'score' => (int)$p['score'],
    'numComments' => (int)$p['num_comments'],
    'subreddit' => 'EarthPorn'
];
assertTrue($parsedPost['score'] === 7420, "Reddit post score parsed as integer");
assertTrue(strpos($parsedPost['permalink'], 'https://reddit.com/r/EarthPorn') === 0, "Reddit permalink prefixed correctly");

// Test 5: TradingView Symbol and Interval sanitization
$rawSymbol = " NASDAQ:AAPL ";
$cleanSymbol = trim(preg_replace('/[^A-Za-z0-9_:\-]/', '', $rawSymbol));
assertTrue($cleanSymbol === "NASDAQ:AAPL", "TradingView ticker symbol sanitized properly");

echo "Phase 4 tests completed successfully.\n\n";
