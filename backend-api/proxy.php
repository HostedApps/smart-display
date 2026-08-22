<?php
require_once 'db.php';

$action = $_GET['action'] ?? '';
$feedUrl = $_GET['url'] ?? '';

if (in_array($action, ['fetch_ical', 'fetch_rss', 'fetch_json', 'fetch_crypto'])) {
    // If fetching crypto directly without URL param, use CoinGecko API
    if ($action === 'fetch_crypto' && empty($feedUrl)) {
        $coins = $_GET['coins'] ?? 'bitcoin,ethereum,solana';
        $currencies = $_GET['currencies'] ?? 'usd';
        $feedUrl = "https://api.coingecko.com/api/v3/simple/price?ids=" . urlencode($coins) . "&vs_currencies=" . urlencode($currencies) . "&include_24hr_change=true";
    }

    if (!filter_var($feedUrl, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid URL"]);
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
