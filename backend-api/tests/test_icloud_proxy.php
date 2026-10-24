<?php
// iCloud shared album proxy: link validation and error messages. These cases are answered before
// any request to Apple, so the suite stays offline. (The Apple round trip is verified by hand:
// album listing ~30 s cold, cached 6 h; image links resolved per 25 photos and redirected.)
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

function ic_get(string $query): array {
    $base = rtrim(getenv('SD_API_BASE') ?: 'http://localhost:8000/api', '/');
    $ch = curl_init($base . '/proxy.php?' . $query);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_FOLLOWLOCATION => false]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'json' => is_string($res) ? json_decode($res, true) : null];
}

echo "Running iCloud Proxy Tests...\n";

if (ic_get('action=none')['code'] === 0) {
    echo "  (skipped: API server not reachable)\n\n";
    return;
}

$missing = ic_get('action=fetch_icloud_photos');
assertTrue($missing['code'] === 400 && ($missing['json']['success'] ?? null) === false, "Missing album link → 400 with success=false");

$photoLink = ic_get('action=fetch_icloud_photos&album_url=' . rawurlencode('https://share.icloud.com/photos/0aBcDeFgHiJkLmNoPq'));
assertTrue($photoLink['code'] === 422 && stripos($photoLink['json']['error'] ?? '', 'Shared Album') !== false,
    "share.icloud.com photo links are rejected with a how-to-fix message");

$garbage = ic_get('action=fetch_icloud_photos&album_url=' . rawurlencode('https://www.icloud.com/sharedalbum/'));
assertTrue($garbage['code'] === 400 && stripos($garbage['json']['error'] ?? '', 'sharedalbum') !== false,
    "A link without a token explains the expected format");

$badImage = ic_get('action=icloud_image&album=x&photo=-1');
assertTrue($badImage['code'] === 400, "icloud_image rejects a malformed album or photo index");

$injected = ic_get('action=icloud_image&album=' . rawurlencode('../../etc/passwd') . '&photo=0');
assertTrue($injected['code'] === 400, "icloud_image rejects tokens with path characters");

echo "\n";
