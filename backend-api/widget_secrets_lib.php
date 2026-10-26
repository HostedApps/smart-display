<?php
/**
 * Widget secrets: API keys, tokens and auth headers kept out of widgets.config_json.
 *
 * Two kinds:
 * - 'server': only the server uses it (e.g. the Gemini key for ai_briefing.php). Never sent to a browser.
 * - 'device': the screen itself must use it, because it talks to something on the home network the
 *   server can't reach (Home Assistant, a local REST endpoint). Sent only to an authorized screen
 *   (get_display.php?for=kiosk), and the screen never writes it to its offline cache.
 *
 * Values are encrypted (AES-256-GCM) with a key from SECRETS_KEY in .env, or a key file created
 * outside the web root on first use. Back that key up with the database: without it the stored
 * secrets can't be decrypted and users must re-enter them.
 *
 * Config protocol between the editor and save_display.php:
 * - config.<field> = "new value" → stored (encrypted) and removed from config
 * - config.<field> = "" or absent → existing secret kept
 * - config._clearSecrets = ["field"] → secret deleted
 * - get_display.php returns config._secretsSet = ["field", …] so the editor can show "saved", and
 *   config._widgetId so a widget can ask an endpoint to use its stored secret.
 *
 * If migration_widget_secrets.sql hasn't run, every function here is a no-op and secrets stay in
 * config exactly as before, so nothing is lost.
 */

const WIDGET_SECRET_FIELDS = [
    'ai_briefing'   => ['apiKey' => 'server'],
    'weather'       => ['apiKey' => 'server'],
    'homeassistant' => ['token' => 'device'],
    'rest_fetch'    => ['authHeader' => 'device'],
];

function widgetSecretFields(string $type): array {
    return WIDGET_SECRET_FIELDS[$type] ?? [];
}

function widgetSecretsAvailable(PDO $pdo): bool {
    static $available = null;
    if ($available === null) {
        try {
            $available = (bool)$pdo->query("SHOW TABLES LIKE 'widget_secrets'")->fetchColumn();
        } catch (\Exception $e) {
            $available = false;
        }
    }
    return $available;
}

function widgetSecretsKey(): string {
    static $key = null;
    if ($key !== null) return $key;

    $fromEnv = getEnvValue('SECRETS_KEY');
    if ($fromEnv !== '') {
        $decoded = base64_decode($fromEnv, true);
        if ($decoded === false || strlen($decoded) !== 32) {
            throw new \RuntimeException('SECRETS_KEY must be 32 bytes, base64-encoded');
        }
        return $key = $decoded;
    }

    // Outside the web root: public_html/api → the site directory
    $file = getEnvValue('SECRETS_KEY_FILE', dirname(__DIR__, 2) . '/.sd_secrets_key');
    if (!is_file($file)) {
        $fh = @fopen($file, 'x'); // create only if it doesn't exist (no race with a parallel request)
        if ($fh) {
            fwrite($fh, base64_encode(random_bytes(32)));
            fclose($fh);
            @chmod($file, 0600);
        }
    }
    $decoded = base64_decode(trim((string)@file_get_contents($file)), true);
    if ($decoded === false || strlen($decoded) !== 32) {
        throw new \RuntimeException("Widget secrets key file is missing or invalid: $file");
    }
    return $key = $decoded;
}

function encryptWidgetSecret(string $plain): string {
    $iv = random_bytes(12);
    $tag = '';
    $ct = openssl_encrypt($plain, 'aes-256-gcm', widgetSecretsKey(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($ct === false) throw new \RuntimeException('Encryption failed');
    return 'v1:' . base64_encode($iv . $tag . $ct);
}

function decryptWidgetSecret(string $stored): ?string {
    if (!str_starts_with($stored, 'v1:')) return null;
    $raw = base64_decode(substr($stored, 3), true);
    if ($raw === false || strlen($raw) < 29) return null;
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', widgetSecretsKey(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    return $plain === false ? null : $plain;
}

/**
 * Save path: store secrets sent in $config for this widget and strip them from $config.
 * $config is modified in place (an array). Call after the widget row exists.
 */
function storeWidgetSecrets(PDO $pdo, int $widgetId, string $type, array &$config): void {
    $fields = widgetSecretFields($type);
    $clear = isset($config['_clearSecrets']) && is_array($config['_clearSecrets']) ? $config['_clearSecrets'] : [];
    unset($config['_clearSecrets'], $config['_secretsSet'], $config['_deviceSecrets'], $config['_widgetId']);
    if (!$fields || !widgetSecretsAvailable($pdo)) return;

    $upsert = $pdo->prepare("INSERT INTO widget_secrets (widget_id, field, ciphertext) VALUES (?, ?, ?)
                             ON DUPLICATE KEY UPDATE ciphertext = VALUES(ciphertext)");
    $delete = $pdo->prepare("DELETE FROM widget_secrets WHERE widget_id = ? AND field = ?");
    foreach (array_keys($fields) as $field) {
        $value = $config[$field] ?? null;
        if (is_string($value) && trim($value) !== '') {
            $upsert->execute([$widgetId, $field, encryptWidgetSecret(trim($value))]);
        } elseif (in_array($field, $clear, true)) {
            $delete->execute([$widgetId, $field]);
        }
        unset($config[$field]);
    }
}

/** widget id => [field => ciphertext] for the given widgets. */
function loadWidgetSecretRows(PDO $pdo, array $widgetIds): array {
    $widgetIds = array_values(array_filter(array_map('intval', $widgetIds)));
    if (!$widgetIds || !widgetSecretsAvailable($pdo)) return [];
    $in = implode(',', array_fill(0, count($widgetIds), '?'));
    $stmt = $pdo->prepare("SELECT widget_id, field, ciphertext FROM widget_secrets WHERE widget_id IN ($in)");
    $stmt->execute($widgetIds);
    $rows = [];
    foreach ($stmt->fetchAll() as $r) {
        $rows[(int)$r['widget_id']][$r['field']] = $r['ciphertext'];
    }
    return $rows;
}

function getWidgetSecret(PDO $pdo, int $widgetId, string $field): ?string {
    $rows = loadWidgetSecretRows($pdo, [$widgetId]);
    return isset($rows[$widgetId][$field]) ? decryptWidgetSecret($rows[$widgetId][$field]) : null;
}

/**
 * Load path for one widget row from the database (as returned by SELECT * FROM widgets):
 * moves any secret still stored in config_json into widget_secrets (one-time migration), then
 * returns the config to send: secrets removed, `_secretsSet` listing what's stored and, when
 * $forKiosk, the screen's 'device' secrets filled in plus `_deviceSecrets` naming them.
 */
function prepareWidgetConfig(PDO $pdo, array $widgetRow, array $secretRows, bool $forKiosk): array {
    $config = (!empty($widgetRow['config_json']) && is_array($c = json_decode($widgetRow['config_json'], true))) ? $c : [];
    $fields = widgetSecretFields((string)$widgetRow['type']);
    if (!$fields || !widgetSecretsAvailable($pdo)) return $config;

    $id = (int)$widgetRow['id'];
    $stored = $secretRows[$id] ?? [];

    // Secrets saved before widget_secrets existed: move them out of config_json now
    $legacy = false;
    foreach (array_keys($fields) as $field) {
        if (isset($config[$field]) && is_string($config[$field]) && trim($config[$field]) !== '') {
            $legacy = true;
        }
    }
    if ($legacy) {
        storeWidgetSecrets($pdo, $id, (string)$widgetRow['type'], $config);
        $pdo->prepare("UPDATE widgets SET config_json = ? WHERE id = ?")
            ->execute([json_encode($config ?: new stdClass(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), $id]);
        $stored = loadWidgetSecretRows($pdo, [$id])[$id] ?? [];
    }

    foreach (array_keys($fields) as $field) {
        unset($config[$field]);
    }
    $config['_secretsSet'] = array_values(array_intersect(array_keys($fields), array_keys($stored)));
    // Widgets only receive their config; this lets them ask the server to use their stored secret
    $config['_widgetId'] = $id;

    if ($forKiosk) {
        $deviceFields = [];
        foreach ($fields as $field => $kind) {
            if ($kind !== 'device' || !isset($stored[$field])) continue;
            $plain = decryptWidgetSecret($stored[$field]);
            if ($plain !== null) {
                $config[$field] = $plain;
                $deviceFields[] = $field;
            }
        }
        if ($deviceFields) $config['_deviceSecrets'] = $deviceFields;
    }
    return $config;
}

/** Copy all secrets from source widgets to their copies (duplicate display, copy layout). */
function copyWidgetSecrets(PDO $pdo, array $idMap): void {
    if (!$idMap || !widgetSecretsAvailable($pdo)) return;
    $rows = loadWidgetSecretRows($pdo, array_keys($idMap));
    $ins = $pdo->prepare("INSERT INTO widget_secrets (widget_id, field, ciphertext) VALUES (?, ?, ?)
                          ON DUPLICATE KEY UPDATE ciphertext = VALUES(ciphertext)");
    foreach ($rows as $oldId => $fields) {
        foreach ($fields as $field => $ciphertext) {
            $ins->execute([$idMap[$oldId], $field, $ciphertext]);
        }
    }
}

/**
 * The widget row if the caller may use its secrets: a signed-in owner (or superadmin) of its
 * display, or a screen paired to that display. Null otherwise.
 */
function authorizeWidgetCaller(PDO $pdo, int $widgetId): ?array {
    $stmt = $pdo->prepare("SELECT w.id, w.type, w.display_id, d.user_id FROM widgets w JOIN displays d ON d.id = w.display_id WHERE w.id = ?");
    $stmt->execute([$widgetId]);
    $widget = $stmt->fetch();
    if (!$widget) return null;

    $user = getAuthenticatedUser($pdo);
    if ($user && ((int)$user['id'] === (int)$widget['user_id'] || ($user['role'] ?? '') === 'superadmin')) {
        return $widget;
    }
    $headers = getallheaders();
    $deviceToken = $headers['X-Device-Token'] ?? $headers['x-device-token'] ?? '';
    if ($deviceToken !== '') {
        $dev = $pdo->prepare("SELECT id FROM devices WHERE display_id = ? AND device_token = ?");
        $dev->execute([$widget['display_id'], $deviceToken]);
        if ($dev->fetch()) return $widget;
    }
    return null;
}
