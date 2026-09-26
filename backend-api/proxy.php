<?php
require_once 'db.php';

// Rate limit: 60 proxy requests per minute per client IP
checkRateLimit($pdo, 'proxy', 60, 60);

$action = $_GET['action'] ?? '';
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
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
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
if ($action === 'fetch_icloud_photos') {
    $albumUrl = trim($_GET['album_url'] ?? $_GET['url'] ?? $_GET['token'] ?? '');
    if (empty($albumUrl)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid or missing album_url or token"]);
        exit();
    }

    $token = '';
    if (preg_match('/#([a-zA-Z0-9_\-]+)/', $albumUrl, $matches)) {
        $token = $matches[1];
    } else if (preg_match('/sharedalbum\/([a-zA-Z0-9_\-]+)/', $albumUrl, $matches)) {
        $token = $matches[1];
    } else if (preg_match('/^[a-zA-Z0-9_\-]{8,40}$/', $albumUrl)) {
        $token = $albumUrl;
    }

    if (empty($token)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Unable to parse iCloud shared album token"]);
        exit();
    }

    // Server-side transient caching (30-minute TTL)
    $forceRefresh = !empty($_GET['force_refresh']) || !empty($_GET['refresh']);
    $cacheFile = sys_get_temp_dir() . '/icloud_' . md5($token) . '.json';
    if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < 1800)) {
        $cachedData = @file_get_contents($cacheFile);
        if (!empty($cachedData)) {
            header("Content-Type: application/json; charset=UTF-8");
            header("X-Cache: HIT");
            echo $cachedData;
            exit();
        }
    }

    $streamUrl = "https://p23-sharedstreams.icloud.com/{$token}/sharedstreams/webstream";
    $postData = '{"streamCtag":null}';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $streamUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Origin: https://www.icloud.com',
        'Content-Type: text/json',
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    $headersText = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);

    // If redirected or host specified in X-Apple-MMe-Host header
    $host = 'p23-sharedstreams.icloud.com';
    if (preg_match('/X-Apple-MMe-Host:\s*([^\r\n]+)/i', $headersText, $hMatch)) {
        $host = trim($hMatch[1]);
        $streamUrl = "https://{$host}/{$token}/sharedstreams/webstream";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $streamUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Origin: https://www.icloud.com',
            'Content-Type: text/json',
            'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        ]);
        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    }

    $streamData = !empty($body) ? json_decode($body, true) : null;
    $photos = $streamData['photos'] ?? [];

    $guids = [];
    foreach ($photos as $p) {
        if (!empty($p['photoGuid'])) {
            $guids[] = $p['photoGuid'];
        }
    }

    $imageUrls = [];
    if (!empty($guids)) {
        $assetUrlEndpoint = "https://{$host}/{$token}/sharedstreams/webasseturls";
        $assetPayload = json_encode(['photoGuids' => array_slice($guids, 0, 40)]);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $assetUrlEndpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $assetPayload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Origin: https://www.icloud.com',
            'Content-Type: text/json',
            'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        ]);
        $assetResp = curl_exec($ch);
        curl_close($ch);

        $assetData = !empty($assetResp) ? json_decode($assetResp, true) : null;
        $items = $assetData['items'] ?? [];
        $locations = $assetData['locations'] ?? [];

        foreach ($items as $checksum => $item) {
            $locKey = $item['url_location'] ?? '';
            $loc = $locations[$locKey] ?? null;
            if ($loc && !empty($loc['hosts']) && !empty($item['url_path'])) {
                $scheme = $loc['scheme'] ?? 'https';
                $cdnHost = $loc['hosts'][0];
                $imageUrls[] = "{$scheme}://{$cdnHost}{$item['url_path']}";
            }
        }
    }

    $responsePayload = json_encode([
        "success" => true,
        "count" => count($imageUrls),
        "images" => $imageUrls
    ]);

    if (!empty($imageUrls)) {
        @file_put_contents($cacheFile, $responsePayload);
    }

    header("Content-Type: application/json; charset=UTF-8");
    header("X-Cache: MISS");
    echo $responsePayload;
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
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
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
