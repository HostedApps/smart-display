<?php
require_once 'db.php';

$action = $_GET['action'] ?? '';

// Rate limit per client IP. Photo redirects get their own budget: several slideshows on one
// home network shouldn't starve the other proxy calls.
if ($action === 'icloud_image') {
    checkRateLimit($pdo, 'proxy_image', 300, 60);
} else {
    checkRateLimit($pdo, 'proxy', 60, 60);
}
$feedUrl = $_GET['url'] ?? '';

// ACTION 1: FETCH GOOGLE PHOTOS SHARED ALBUM & GOOGLE DRIVE MEDIA
if ($action === 'fetch_google_photos') {
    $albumUrl = trim($_GET['album_url'] ?? $_GET['url'] ?? '');
    if (empty($albumUrl) || !isSafeExternalUrl($albumUrl)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid or unsafe album_url"]);
        exit();
    }

    // Direct Google Drive single file support
    if (preg_match('/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_\-]+)/i', $albumUrl, $driveMatch)) {
        $fileId = $driveMatch[1];
        $cdnUrl = "https://lh3.googleusercontent.com/d/" . $fileId;
        header("Content-Type: application/json; charset=UTF-8");
        echo json_encode([
            "success" => true,
            "count" => 1,
            "images" => [$cdnUrl]
        ]);
        exit();
    }

    // Server-side transient caching (30-minute TTL for fast boot & instant load)
    $forceRefresh = !empty($_GET['force_refresh']) || !empty($_GET['refresh']);
    $cacheFile = sys_get_temp_dir() . '/gphotos_' . md5($albumUrl) . '.json';
    if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < 1800)) {
        $cachedData = @file_get_contents($cacheFile);
        if (!empty($cachedData)) {
            header("Content-Type: application/json; charset=UTF-8");
            header("X-Cache: HIT");
            echo $cachedData;
            exit();
        }
    }

    // Helper to fetch URL with full desktop browser simulation
    $fetchUrl = function($targetUrl) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $targetUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
        curl_setopt($ch, CURLOPT_COOKIEFILE, "");
        curl_setopt($ch, CURLOPT_AUTOREFERER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 18);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        $html = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return [$html, $httpCode];
    };

    // If it's a photos.app.goo.gl link, ensure desktop link param
    $requestUrl = $albumUrl;
    if (strpos($requestUrl, 'photos.app.goo.gl') !== false && strpos($requestUrl, '_imcp=1') === false) {
        $requestUrl .= (strpos($requestUrl, '?') !== false ? '&' : '?') . '_imcp=1';
    }

    list($html, $httpCode) = $fetchUrl($requestUrl);

    // If initial response contains canonical og:url or data-desktop-link to photos.google.com/share, follow it
    if (!empty($html)) {
        if (preg_match('/<meta\s+property=["\']og:url["\']\s+content=["\'](https:\/\/photos\.google\.com\/share\/[^"\']+)["\']/i', $html, $ogMatch)) {
            list($subHtml, $subCode) = $fetchUrl($ogMatch[1]);
            if ($subCode === 200 && !empty($subHtml)) {
                $html = $subHtml;
            }
        } elseif (preg_match('/data-desktop-link=["\'](https:\/\/photos\.app\.goo\.gl\/[^"\']+)["\']/i', $html, $deskMatch)) {
            list($subHtml, $subCode) = $fetchUrl($deskMatch[1]);
            if ($subCode === 200 && !empty($subHtml)) {
                $html = $subHtml;
            }
        }
    }

    if (empty($html)) {
        http_response_code(502);
        echo json_encode(["success" => false, "error" => "Unable to fetch Google Photos album", "status" => $httpCode]);
        exit();
    }

    // Unescape JSON slashes in JavaScript payload
    $cleanHtml = str_replace('\\/', '/', $html);

    // Extract all googleusercontent photo media assets (specifically /pw/ or long media tokens, excluding /a-/ and /a/ user profile avatars)
    preg_match_all('/https:\/\/[a-z0-9]+\.googleusercontent\.com\/(?:pw\/[a-zA-Z0-9_\-]+|[a-zA-Z0-9_\-]{60,})/i', $cleanHtml, $matches);

    $rawUrls = $matches[0] ?? [];
    $seen = [];
    $photos = [];

    foreach ($rawUrls as $url) {
        // Explicitly reject user avatars, profile photos, and Google system icons
        if (strpos($url, '/a-/') !== false || strpos($url, '/a/') !== false || strpos($url, 'avatar') !== false) {
            continue;
        }

        $base = preg_replace('/=.*$/', '', $url);
        // Valid high-res photos have keys > 50 chars
        if (strlen($base) > 55 && !isset($seen[$base]) && strpos($base, 'googleusercontent.com') !== false) {
            $seen[$base] = true;
            $photos[] = $base . '=w1920-h1080-no';
        }
    }

    $responsePayload = json_encode([
        "success" => true,
        "count" => count($photos),
        "images" => $photos
    ]);

    if (!empty($photos)) {
        @file_put_contents($cacheFile, $responsePayload);
    }

    header("Content-Type: application/json; charset=UTF-8");
    header("X-Cache: MISS");
    echo $responsePayload;
    exit();
}

// ACTION 1B: FETCH APPLE ICLOUD SHARED ALBUM
/*
 * iCloud shared albums (icloud.com/sharedalbum/#TOKEN, "Public Website" turned on).
 *
 * Apple's API has two quirks this code works around:
 * - The album listing (webstream) is slow: ~30 s for a few hundred photos. It's cached here for
 *   6 hours and fetched with a long timeout; a stale copy is used if a refresh fails.
 * - Download links (webasseturls) expire after ~20 minutes. So the widget never gets Apple's links:
 *   it gets stable links to `icloud_image` below, which resolves a fresh Apple link (25 photos per
 *   call, cached until just before they expire) and redirects to it.
 */
const ICLOUD_ALBUM_TTL = 6 * 3600;
const ICLOUD_ALBUM_TIMEOUT = 75;
const ICLOUD_MAX_PHOTOS = 500;
const ICLOUD_BATCH = 25;

/** Partition host encoded in the token (base-62); a wrong guess is corrected by Apple's 330 redirect. */
function icloudPartitionHost(string $token): string {
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $digits = $token[0] === 'A' ? substr($token, 1, 1) : substr($token, 1, 2);
    $n = 0;
    foreach (str_split($digits) as $c) {
        $i = strpos($chars, $c);
        if ($i === false) return 'p23-sharedstreams.icloud.com';
        $n = $n * 62 + $i;
    }
    return ($n >= 1 && $n <= 999) ? sprintf('p%02d-sharedstreams.icloud.com', $n) : 'p23-sharedstreams.icloud.com';
}

/** POST to an iCloud shared-streams endpoint. Returns [status, headersText, decodedBody|null]. */
function icloudPost(string $url, array $payload, int $timeout = 20): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_ENCODING => '',   // accept gzip: the album listing is ~150 KB
        CURLOPT_HTTPHEADER => [
            'Origin: https://www.icloud.com',
            'Content-Type: text/json',
            'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        ],
    ]);
    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    if (!is_string($response)) return [0, '', null];
    $body = json_decode(substr($response, $headerSize), true);
    return [$status, substr($response, 0, $headerSize), is_array($body) ? $body : null];
}

function icloudFail(int $httpStatus, string $message): void {
    http_response_code($httpStatus);
    echo json_encode(["success" => false, "error" => $message]);
    exit();
}

function icloudCacheDir(): string {
    $dir = sys_get_temp_dir() . '/sd_icloud';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

function icloudReadJson(string $file): ?array {
    if (!is_file($file)) return null;
    $data = json_decode((string)@file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

/**
 * The album listing: [host, title, photos => [[guid, checksum], …]], from cache when fresh.
 * Returns [album|null, errorStatus, errorMessage].
 */
function icloudAlbum(string $token, bool $forceRefresh = false): array {
    $file = icloudCacheDir() . '/album_' . md5($token) . '.json';
    $cached = icloudReadJson($file);
    if ($cached && !$forceRefresh && time() - (int)($cached['fetchedAt'] ?? 0) < ICLOUD_ALBUM_TTL) {
        return [$cached, 0, ''];
    }

    @set_time_limit(ICLOUD_ALBUM_TIMEOUT * 2 + 30);
    $host = icloudPartitionHost($token);
    [$status, $headersText, $stream] = icloudPost("https://{$host}/{$token}/sharedstreams/webstream", ['streamCtag' => null], ICLOUD_ALBUM_TIMEOUT);
    if ($status === 330) {
        $redirectHost = $stream['X-Apple-MMe-Host'] ?? null;
        if (!$redirectHost && preg_match('/X-Apple-MMe-Host:\s*([^\r\n]+)/i', $headersText, $hm)) {
            $redirectHost = trim($hm[1]);
        }
        if (!$redirectHost || !preg_match('/^p\d{1,3}-sharedstreams\.icloud\.com$/', $redirectHost)) {
            return [$cached, 502, "iCloud redirected to an unexpected server."];
        }
        $host = $redirectHost;
        [$status, , $stream] = icloudPost("https://{$host}/{$token}/sharedstreams/webstream", ['streamCtag' => null], ICLOUD_ALBUM_TIMEOUT);
    }
    if ($status === 404) {
        return [null, 404, "Album not found. Check the link, and that Public Website is turned on in the Shared Album's settings."];
    }
    if ($status !== 200 || !$stream) {
        $why = $status === 0 ? "didn't answer in time" : "returned HTTP {$status}";
        return [$cached, 502, "iCloud {$why} while loading the album. Try again later."];
    }

    // Largest rendition of each photo; videos are skipped (the widget shows images)
    $photos = [];
    foreach ($stream['photos'] ?? [] as $photo) {
        if (($photo['mediaAssetType'] ?? '') === 'video' || empty($photo['photoGuid'])) continue;
        $best = null;
        foreach ($photo['derivatives'] ?? [] as $d) {
            if (empty($d['checksum'])) continue;
            if ($best === null || (int)($d['width'] ?? 0) > $best[1]) $best = [$d['checksum'], (int)($d['width'] ?? 0)];
        }
        if ($best) $photos[] = [$photo['photoGuid'], $best[0]];
        if (count($photos) >= ICLOUD_MAX_PHOTOS) break;
    }

    $album = ['host' => $host, 'title' => $stream['streamName'] ?? null, 'photos' => $photos, 'fetchedAt' => time()];
    @file_put_contents($file, json_encode($album), LOCK_EX);
    return [$album, 0, ''];
}

/** Parse the token from https://www.icloud.com/sharedalbum/#TOKEN, …/sharedalbum/TOKEN or a bare token. */
function icloudToken(string $input): string {
    if (preg_match('/#([A-Za-z0-9_\-]{10,})/', $input, $m)) return $m[1];
    if (preg_match('/sharedalbum\/([A-Za-z0-9_\-]{10,})/', $input, $m)) return $m[1];
    if (preg_match('/^[A-Za-z0-9_\-]{10,}$/', $input)) return $input;
    return '';
}

if ($action === 'fetch_icloud_photos') {
    $albumUrl = trim($_GET['album_url'] ?? $_GET['url'] ?? $_GET['token'] ?? '');
    if ($albumUrl === '') {
        icloudFail(400, "Missing iCloud shared album link.");
    }
    // "Copy iCloud Link" links (share.icloud.com/photos/…) point at individual photos, not a Shared Album
    if (stripos($albumUrl, 'share.icloud.com') !== false) {
        icloudFail(422, "This is an iCloud photo link, not a Shared Album. In Photos, open the Shared Album, turn on Public Website, and paste that link (icloud.com/sharedalbum/#…).");
    }
    $token = icloudToken($albumUrl);
    if ($token === '') {
        icloudFail(400, "Couldn't read the album link. It should look like https://www.icloud.com/sharedalbum/#B0aB1cD2eF3gH4.");
    }

    [$album, $errStatus, $errMessage] = icloudAlbum($token, !empty($_GET['force_refresh']) || !empty($_GET['refresh']));
    if (!$album) {
        icloudFail($errStatus ?: 502, $errMessage);
    }
    if (!$album['photos']) {
        icloudFail(404, "The album has no photos yet.");
    }

    // Stable links to icloud_image (below); they never expire, unlike Apple's
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $base = ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/proxy.php'), '/') . '/proxy.php';
    $images = [];
    foreach ($album['photos'] as $i => [$guid]) {
        $images[] = $base . '?action=icloud_image&album=' . rawurlencode($token) . '&photo=' . $i;
    }

    if ($errMessage) header("X-iCloud-Warning: stale album listing");
    echo json_encode([
        "success" => true,
        "count" => count($images),
        "title" => $album['title'],
        "images" => $images
    ], JSON_UNESCAPED_SLASHES);
    exit();
}

if ($action === 'icloud_image') {
    $token = icloudToken(trim($_GET['album'] ?? ''));
    $index = filter_var($_GET['photo'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    if ($token === '' || $index === false) {
        icloudFail(400, "Bad iCloud image link.");
    }
    [$album, , $errMessage] = icloudAlbum($token);
    if (!$album || !isset($album['photos'][$index])) {
        icloudFail(404, $errMessage ?: "Photo not found in the album.");
    }

    // Resolved Apple links for the batch this photo belongs to, cached until shortly before expiry
    $batchNo = intdiv($index, ICLOUD_BATCH);
    $linksFile = icloudCacheDir() . '/links_' . md5($token) . "_{$batchNo}.json";
    $links = icloudReadJson($linksFile);
    if (!$links || time() > (int)($links['validUntil'] ?? 0)) {
        $batch = array_slice($album['photos'], $batchNo * ICLOUD_BATCH, ICLOUD_BATCH);
        [$aStatus, , $assets] = icloudPost(
            "https://{$album['host']}/{$token}/sharedstreams/webasseturls",
            ['photoGuids' => array_column($batch, 0)]
        );
        if ($aStatus !== 200 || !$assets) {
            icloudFail(502, "iCloud didn't return a download link (HTTP {$aStatus}).");
        }
        $urls = [];
        $earliestExpiry = time() + 3600;
        foreach ($batch as $offset => [$guid, $checksum]) {
            $item = $assets['items'][$checksum] ?? null;
            $loc = $item ? ($assets['locations'][$item['url_location'] ?? ''] ?? null) : null;
            $cdnHost = $loc['hosts'][0] ?? '';
            if ($item && !empty($item['url_path']) && preg_match('/(^|\.)icloud-content\.com$/', $cdnHost)) {
                $urls[$batchNo * ICLOUD_BATCH + $offset] = ($loc['scheme'] ?? 'https') . '://' . $cdnHost . $item['url_path'];
                if (!empty($item['url_expiry'])) $earliestExpiry = min($earliestExpiry, strtotime($item['url_expiry']) ?: $earliestExpiry);
            }
        }
        $links = ['urls' => $urls, 'validUntil' => $earliestExpiry - 180];
        @file_put_contents($linksFile, json_encode($links), LOCK_EX);
    }

    $target = $links['urls'][$index] ?? $links['urls'][(string)$index] ?? null;
    if (!$target) {
        icloudFail(404, "iCloud has no download link for this photo.");
    }
    // Browsers may cache the redirect briefly, never past Apple's expiry
    header('Cache-Control: private, max-age=' . max(0, min(600, (int)$links['validUntil'] - time())));
    header('Location: ' . $target, true, 302);
    exit();
}

// ACTION 2: FETCH REAL STOCKS & EQUITIES
if ($action === 'fetch_stocks') {
    $symbolsParam = $_GET['symbols'] ?? 'AAPL,TSLA,NVDA,SPY,MSFT';
    $symbols = array_filter(array_map('trim', explode(',', strtoupper($symbolsParam))));
    $results = [];

    foreach ($symbols as $sym) {
        // Sanitize symbol to alphanumeric plus dots/hyphens (e.g. BRK.B)
        $sym = preg_replace('/[^A-Z0-9\.\-]/', '', $sym);
        if (empty($sym)) continue;

        $chartUrl = "https://query1.finance.yahoo.com/v8/finance/chart/" . urlencode($sym) . "?interval=1d&range=5d";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $chartUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $parsed = null;
        if ($httpCode === 200 && $resp) {
            $json = json_decode($resp, true);
            $result = $json['chart']['result'][0] ?? null;
            if ($result) {
                $meta = $result['meta'] ?? [];
                $price = $meta['regularMarketPrice'] ?? ($meta['chartPreviousClose'] ?? 0);
                $prevClose = $meta['chartPreviousClose'] ?? $price;
                $change24h = $prevClose > 0 ? (($price - $prevClose) / $prevClose) * 100 : 0;
                $name = $meta['shortName'] ?? $meta['symbol'] ?? $sym;
                
                $closes = $result['indicators']['quote'][0]['close'] ?? [];
                $cleanCloses = array_values(array_filter($closes, function($v) { return $v !== null && is_numeric($v); }));
                if (empty($cleanCloses)) {
                    $cleanCloses = [$prevClose, $price];
                }

                $parsed = [
                    "symbol" => $sym,
                    "name" => $name,
                    "price" => round($price, 2),
                    "change24h" => round($change24h, 2),
                    "type" => "stock",
                    "sparkline" => array_map(function($v) { return round($v, 2); }, $cleanCloses)
                ];
            }
        }

        // Fallback for symbols if Yahoo is rate-limited
        if (!$parsed) {
            $stockNames = [
                'AAPL' => 'Apple Inc.', 'TSLA' => 'Tesla Inc.', 'NVDA' => 'NVIDIA Corp.',
                'MSFT' => 'Microsoft Corp.', 'GOOGL' => 'Alphabet Inc.', 'AMZN' => 'Amazon.com Inc.',
                'SPY' => 'SPDR S&P 500 ETF', 'QQQ' => 'Invesco QQQ Trust', 'META' => 'Meta Platforms Inc.',
                'AMD' => 'Advanced Micro Devices', 'NFLX' => 'Netflix Inc.', 'DIS' => 'Walt Disney Co.',
                'PLTR' => 'Palantir Technologies', 'COIN' => 'Coinbase Global Inc.'
            ];
            $basePrices = [
                'AAPL' => 224.50, 'TSLA' => 210.30, 'NVDA' => 128.80, 'MSFT' => 418.20,
                'GOOGL' => 164.40, 'AMZN' => 175.60, 'SPY' => 560.10, 'QQQ' => 478.90,
                'META' => 510.40, 'AMD' => 148.20, 'NFLX' => 690.50, 'DIS' => 96.30,
                'PLTR' => 31.20, 'COIN' => 195.40
            ];
            $base = $basePrices[$sym] ?? (100.0 + (crc32($sym) % 200));
            $change = round(((crc32($sym . date('Ymd')) % 600) - 250) / 100, 2);
            $parsed = [
                "symbol" => $sym,
                "name" => $stockNames[$sym] ?? $sym . " Stock",
                "price" => $base,
                "change24h" => $change,
                "type" => "stock",
                "sparkline" => [$base * 0.98, $base * 0.99, $base * 1.01, $base * 1.0, $base]
            ];
        }

        $results[] = $parsed;
    }

    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(["success" => true, "stocks" => $results]);
    exit();
}

// ACTION 2B: FETCH REDDIT MEDIA FEED
if ($action === 'fetch_reddit_feed') {
    $subreddit = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['subreddit'] ?? 'EarthPorn');
    if (empty($subreddit)) {
        $subreddit = 'EarthPorn';
    }
    $sort = in_array($_GET['sort'] ?? '', ['hot', 'top', 'new']) ? $_GET['sort'] : 'hot';
    $limit = min(50, max(5, (int)($_GET['limit'] ?? 25)));

    $forceRefresh = !empty($_GET['force_refresh']) || !empty($_GET['refresh']);
    $cacheFile = sys_get_temp_dir() . '/reddit_' . md5($subreddit . '_' . $sort) . '.json';
    if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < 300)) {
        $cachedData = @file_get_contents($cacheFile);
        if (!empty($cachedData)) {
            header("Content-Type: application/json; charset=UTF-8");
            header("X-Cache: HIT");
            echo $cachedData;
            exit();
        }
    }

    $redditUrl = "https://www.reddit.com/r/{$subreddit}/{$sort}.json?limit={$limit}";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $redditUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SmartDisplay/1.0');
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $posts = [];
    if ($httpCode === 200 && $resp) {
        $data = json_decode($resp, true);
        $children = $data['data']['children'] ?? [];
        foreach ($children as $c) {
            $p = $c['data'] ?? [];
            if (!empty($p['over_18'])) continue; // Filter NSFW
            $mediaUrl = $p['url'] ?? '';
            // Check for direct image or gallery preview
            $isImage = preg_match('/\.(jpg|jpeg|png|webp)($|\?)/i', $mediaUrl) || 
                       (strpos($mediaUrl, 'i.redd.it') !== false) || 
                       (strpos($mediaUrl, 'imgur.com') !== false && !preg_match('/\/a\//', $mediaUrl));

            // If it's a gallery or preview image
            if (!$isImage && !empty($p['preview']['images'][0]['source']['url'])) {
                $mediaUrl = html_entity_decode($p['preview']['images'][0]['source']['url']);
                $isImage = true;
            }

            if ($isImage && !empty($mediaUrl)) {
                if (strpos($mediaUrl, 'imgur.com') !== false && !preg_match('/\.(jpg|jpeg|png|webp)$/i', $mediaUrl)) {
                    $mediaUrl .= '.jpg';
                }
                $posts[] = [
                    'id' => $p['id'] ?? uniqid(),
                    'title' => html_entity_decode($p['title'] ?? ''),
                    'author' => $p['author'] ?? 'anonymous',
                    'url' => $mediaUrl,
                    'permalink' => 'https://reddit.com' . ($p['permalink'] ?? ''),
                    'score' => (int)($p['score'] ?? 0),
                    'numComments' => (int)($p['num_comments'] ?? 0),
                    'subreddit' => $subreddit
                ];
            }
        }
    }

    // Fallback if rate limited or empty
    if (empty($posts)) {
        $fallbacks = [
            ['id' => 'fb1', 'title' => 'Misty alpine sunrise over lake reflections', 'author' => 'nature_explorer', 'url' => 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80', 'score' => 4520, 'numComments' => 142],
            ['id' => 'fb2', 'title' => 'Cosmic starry night over snow-capped peaks', 'author' => 'stargazer', 'url' => 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80', 'score' => 8910, 'numComments' => 312],
            ['id' => 'fb3', 'title' => 'Autumn foliage glowing along emerald river valley', 'author' => 'forest_wanderer', 'url' => 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80', 'score' => 6230, 'numComments' => 98],
            ['id' => 'fb4', 'title' => 'Dramatic golden hour on rugged coastal cliffs', 'author' => 'ocean_view', 'url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80', 'score' => 5410, 'numComments' => 120]
        ];
        foreach ($fallbacks as $fb) {
            $fb['permalink'] = 'https://reddit.com/r/' . $subreddit;
            $fb['subreddit'] = $subreddit;
            $posts[] = $fb;
        }
    }

    $responsePayload = json_encode([
        "success" => true,
        "subreddit" => $subreddit,
        "count" => count($posts),
        "posts" => $posts
    ]);

    @file_put_contents($cacheFile, $responsePayload);
    header("Content-Type: application/json; charset=UTF-8");
    header("X-Cache: MISS");
    echo $responsePayload;
    exit();
}

// ACTION 3: STANDARD FEED PROXY (iCal, RSS, JSON, Crypto)
if (in_array($action, ['fetch_ical', 'fetch_rss', 'fetch_json', 'fetch_crypto'])) {
    if ($action === 'fetch_crypto' && empty($feedUrl)) {
        $coins = $_GET['coins'] ?? 'bitcoin,ethereum,solana';
        $currencies = $_GET['currencies'] ?? 'usd';
        $feedUrl = "https://api.coingecko.com/api/v3/simple/price?ids=" . urlencode($coins) . "&vs_currencies=" . urlencode($currencies) . "&include_24hr_change=true";
    }

    if (!isSafeExternalUrl($feedUrl)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid or unsafe external URL"]);
        exit();
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $feedUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_USERAGENT, 'SmartDisplayProxy/1.0 (Mozilla/5.0)');
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $data !== false) {
        if ($action === 'fetch_ical') {
            header("Content-Type: text/calendar; charset=UTF-8");
        } else if ($action === 'fetch_rss') {
            header("Content-Type: application/xml; charset=UTF-8");
        } else {
            header("Content-Type: application/json; charset=UTF-8");
        }
        echo $data;
    } else {
        http_response_code(502);
        echo json_encode(["error" => "Unable to fetch external feed", "status" => $httpCode]);
    }
    exit();
}

http_response_code(400);
echo json_encode(["error" => "Invalid or missing action"]);
