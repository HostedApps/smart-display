<?php
require_once 'db.php';

// Verify Authentication Token
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$authToken = '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $authToken = $matches[1];
}

if (empty($authToken)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized. Please log in to edit and save displays."]);
    exit();
}

try {
    // Validate User Token
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE auth_token = ?");
    $userStmt->execute([$authToken]);
    $user = $userStmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Session expired or invalid. Please log in again."]);
        exit();
    }

    $userId = (int)$user['id'];

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['token'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid payload"]);
        exit();
    }

    $token = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['token']);
    $name = sanitizeText($input['name'] ?? 'Main Display');
    $theme = in_array($input['theme'] ?? '', ['glass', 'paper', 'solid', 'mirror', 'ambient', 'contrast', 'dark', 'light', 'minimal', 'oled'], true) ? $input['theme'] : 'glass';
    $orientation = $input['orientation'] ?? 'landscape_720p';
    $refreshInterval = max(10, (int)($input['refresh_interval'] ?? 60));
    $backgroundArr = isset($input['background']) && is_array($input['background']) ? $input['background'] : [];
    if (isset($input['font_family'])) {
        $backgroundArr['font_family'] = sanitizeText($input['font_family']);
    }
    if (isset($input['accent_color'])) {
        $accent = trim((string)$input['accent_color']);
        if (preg_match('/^#[0-9a-fA-F]{6}$/', $accent)) {
            $backgroundArr['accent_color'] = $accent;
        } else {
            unset($backgroundArr['accent_color']);
        }
    }
    // Screen & performance settings (validated; stored in background_json)
    foreach (['canvas_width', 'canvas_height'] as $dimKey) {
        if (isset($input[$dimKey])) {
            $backgroundArr[$dimKey] = max(200, min(7680, (int)$input[$dimKey]));
        }
    }
    if (isset($input['scale_mode'])) {
        $backgroundArr['scale_mode'] = in_array($input['scale_mode'], ['fit', 'fill', 'stretch', 'none'], true) ? $input['scale_mode'] : 'fit';
    }
    if (isset($input['safe_area'])) {
        $backgroundArr['safe_area'] = round(max(0, min(0.1, (float)$input['safe_area'])), 3);
    }
    if (isset($input['page_transition'])) {
        $backgroundArr['page_transition'] = in_array($input['page_transition'], ['none', 'fade', 'slide', 'zoom'], true) ? $input['page_transition'] : 'fade';
    }
    if (isset($input['performance_mode'])) {
        $backgroundArr['performance_mode'] = in_array($input['performance_mode'], ['auto', 'on', 'off'], true) ? $input['performance_mode'] : 'auto';
    }
    if (isset($input['burn_in_shift'])) {
        $backgroundArr['burn_in_shift'] = (bool)$input['burn_in_shift'];
    }
    if (isset($input['weather_alerts_enabled'])) {
        $backgroundArr['weather_alerts_enabled'] = (bool)$input['weather_alerts_enabled'];
    }
    if (isset($input['weather_alert'])) {
        $backgroundArr['weather_alert'] = is_string($input['weather_alert']) ? sanitizeText($input['weather_alert']) : $input['weather_alert'];
    }
    if (isset($input['custom_css'])) {
        // Strip script tags for security, preserve CSS
        $cleanCss = preg_replace('/<\s*script\b[^>]*>(.*?)<\s*\/\s*script\s*>/is', '', $input['custom_css']);
        $backgroundArr['custom_css'] = $cleanCss;
    }
    if (isset($input['audio_chimes_enabled'])) {
        $backgroundArr['audio_chimes_enabled'] = (bool)$input['audio_chimes_enabled'];
    }
    if (isset($input['hourly_chime'])) {
        $backgroundArr['hourly_chime'] = (bool)$input['hourly_chime'];
    }
    if (isset($input['touchhub_enabled'])) {
        $backgroundArr['touchhub_enabled'] = (bool)$input['touchhub_enabled'];
    }
    if (isset($input['touchhub_config'])) {
        $backgroundArr['touchhub_config'] = $input['touchhub_config'];
    }
    $background = !empty($backgroundArr) ? json_encode($backgroundArr) : null;
    $sleepSchedule = isset($input['sleep_schedule']) ? json_encode($input['sleep_schedule']) : null;
    $pages = isset($input['pages']) ? json_encode($input['pages']) : null;
    $logoUrl = (!empty($input['logo_url']) && isSafeExternalUrl($input['logo_url'])) ? trim($input['logo_url']) : null;
    $showLogoKiosk = !empty($input['show_logo_kiosk']) ? 1 : 0;
    $widgets = $input['widgets'] ?? [];

    $pdo->beginTransaction();

    // 1. Fetch Display ID or create if not exists
    $stmt = $pdo->prepare("SELECT id, user_id FROM displays WHERE token = ?");
    $stmt->execute([$token]);
    $display = $stmt->fetch();

    if (!$display) {
        // Create new display owned by authenticated user
        $insertDisplay = $pdo->prepare("INSERT INTO displays (user_id, token, name, theme, orientation, refresh_interval, background_json, sleep_schedule_json, pages_json, logo_url, show_logo_kiosk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insertDisplay->execute([$userId, $token, $name, $theme, $orientation, $refreshInterval, $background, $sleepSchedule, $pages, $logoUrl, $showLogoKiosk]);
        $displayId = (int)$pdo->lastInsertId();
    } else {
        // Verify ownership
        if ((int)$display['user_id'] !== $userId) {
            $pdo->rollBack();
            http_response_code(403);
            echo json_encode(["error" => "Forbidden: You do not have permission to modify this display."]);
            exit();
        }

        $displayId = (int)$display['id'];
        $updateStmt = $pdo->prepare("UPDATE displays SET name = ?, theme = ?, orientation = ?, refresh_interval = ?, background_json = ?, sleep_schedule_json = ?, pages_json = ?, logo_url = ?, show_logo_kiosk = ? WHERE id = ?");
        $updateStmt->execute([$name, $theme, $orientation, $refreshInterval, $background, $sleepSchedule, $pages, $logoUrl, $showLogoKiosk, $displayId]);
    }

    // 2. Upsert widgets, keeping database ids stable across saves so push_widget
    //    webhooks and linked-widget references keep working.
    $existingStmt = $pdo->prepare("SELECT id FROM widgets WHERE display_id = ?");
    $existingStmt->execute([$displayId]);
    $existingIds = array_map('intval', $existingStmt->fetchAll(PDO::FETCH_COLUMN));
    $existingSet = array_flip($existingIds);

    $insertStmt = $pdo->prepare("INSERT INTO widgets (display_id, page_id, type, position_json, style_json, config_json) VALUES (?, ?, ?, ?, ?, ?)");
    $updateWidgetStmt = $pdo->prepare("UPDATE widgets SET page_id = ?, type = ?, position_json = ?, style_json = ?, config_json = ? WHERE id = ? AND display_id = ?");

    $idMap = [];      // client id => database id (only for ids that changed)
    $keptIds = [];
    $savedStyles = []; // database id => style array (for linked-widget remapping)
    foreach ($widgets as $w) {
        if (!is_array($w) || empty($w['type'])) {
            continue;
        }
        $clientId = isset($w['id']) ? (int)$w['id'] : 0;
        $pageId = $w['page_id'] ?? 'default';
        $style = isset($w['style']) && is_array($w['style']) ? $w['style'] : ['opacity' => 1, 'borderRadius' => 12, 'backdropBlur' => true];
        unset($style['_meta']);
        $meta = extractWidgetMeta($w);
        if (!empty($meta)) {
            $style['_meta'] = $meta;
        }
        // Empty arrays must stay JSON objects ({}), not lists ([])
        $config = !empty($w['config']) && is_array($w['config']) ? $w['config'] : new stdClass();
        $params = [$pageId, $w['type'], json_encode($w['position']), json_encode(empty($style) ? new stdClass() : $style), json_encode($config)];

        if ($clientId > 0 && isset($existingSet[$clientId])) {
            $updateWidgetStmt->execute(array_merge($params, [$clientId, $displayId]));
            $dbId = $clientId;
        } else {
            $insertStmt->execute(array_merge([$displayId], $params));
            $dbId = (int)$pdo->lastInsertId();
            if ($clientId !== 0) {
                $idMap[(string)$clientId] = $dbId;
            }
        }
        $keptIds[] = $dbId;
        $savedStyles[$dbId] = $style;
    }

    // Linked widgets may point at client ids of widgets created in this save
    if (!empty($idMap)) {
        $restyleStmt = $pdo->prepare("UPDATE widgets SET style_json = ? WHERE id = ?");
        foreach ($savedStyles as $dbId => $style) {
            $linked = $style['_meta']['linkedWidgetId'] ?? null;
            if ($linked !== null && isset($idMap[(string)$linked])) {
                $style['_meta']['linkedWidgetId'] = $idMap[(string)$linked];
                $restyleStmt->execute([json_encode($style), $dbId]);
            }
        }
    }

    // Remove widgets that were deleted in the editor
    $removedIds = array_diff($existingIds, $keptIds);
    if (!empty($removedIds)) {
        $placeholders = implode(',', array_fill(0, count($removedIds), '?'));
        $deleteStmt = $pdo->prepare("DELETE FROM widgets WHERE display_id = ? AND id IN ($placeholders)");
        $deleteStmt->execute(array_merge([$displayId], array_values($removedIds)));
    }

    $pdo->commit();

    $versionId = recordDisplayVersion($pdo, $displayId, $userId, $input, count($keptIds), $idMap);

    echo json_encode(["success" => true, "message" => "Display settings & layout saved securely", "id_map" => (object)$idMap, "version_id" => $versionId]);
} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["error" => "Failed to save: " . $e->getMessage()]);
}

/**
 * Store a version-history snapshot of the saved payload and prune the display's
 * history to the newest 20 entries. Versioning is best-effort:
 * any failure (e.g. migration_display_versions.sql not applied yet) is swallowed
 * so it never breaks saving. Returns the new version id, or null.
 */
function recordDisplayVersion(PDO $pdo, int $displayId, int $userId, array $input, int $widgetCount, array $idMap = []): ?int {
    $limit = 20;
    try {
        $snapshot = $input;
        unset($snapshot['token']);
        // Store database ids (not the editor's temporary ids) so restoring keeps webhook ids and links intact
        if (!empty($idMap) && isset($snapshot['widgets']) && is_array($snapshot['widgets'])) {
            foreach ($snapshot['widgets'] as &$sw) {
                if (is_array($sw) && isset($sw['id']) && isset($idMap[(string)$sw['id']])) {
                    $sw['id'] = $idMap[(string)$sw['id']];
                }
                if (is_array($sw) && isset($sw['linkedWidgetId']) && isset($idMap[(string)$sw['linkedWidgetId']])) {
                    $sw['linkedWidgetId'] = $idMap[(string)$sw['linkedWidgetId']];
                }
            }
            unset($sw);
        }
        $snapshotJson = json_encode($snapshot, JSON_UNESCAPED_UNICODE);
        if ($snapshotJson === false) {
            return null;
        }

        $label = null;
        if (isset($input['version_label']) && is_scalar($input['version_label'])) {
            $label = mb_substr(trim(strip_tags((string)$input['version_label'])), 0, 100);
            if ($label === '') {
                $label = null;
            }
        }

        $ins = $pdo->prepare("INSERT INTO display_versions (display_id, user_id, label, widget_count, snapshot_json) VALUES (?, ?, ?, ?, ?)");
        $ins->execute([$displayId, $userId, $label, $widgetCount, $snapshotJson]);
        $versionId = (int)$pdo->lastInsertId();

        // Prune: everything beyond the newest $limit versions for this display
        $oldStmt = $pdo->prepare("SELECT id FROM display_versions WHERE display_id = ? ORDER BY created_at DESC, id DESC LIMIT 18446744073709551615 OFFSET $limit");
        $oldStmt->execute([$displayId]);
        $oldIds = array_map('intval', $oldStmt->fetchAll(PDO::FETCH_COLUMN));
        if (!empty($oldIds)) {
            $placeholders = implode(',', array_fill(0, count($oldIds), '?'));
            $del = $pdo->prepare("DELETE FROM display_versions WHERE display_id = ? AND id IN ($placeholders)");
            $del->execute(array_merge([$displayId], $oldIds));
        }

        return $versionId;
    } catch (\Throwable $e) {
        return null;
    }
}

/**
 * Editor-only widget fields that have no column of their own. They are stored in
 * style_json under "_meta" and unpacked again by get_display.php.
 */
function extractWidgetMeta(array $w): array {
    $meta = [];
    if (isset($w['schedule']) && is_array($w['schedule'])) {
        $meta['schedule'] = $w['schedule'];
    }
    if (isset($w['rules']) && is_array($w['rules'])) {
        $meta['rules'] = array_values($w['rules']);
    }
    if (isset($w['linkedWidgetId']) && $w['linkedWidgetId'] !== '' && $w['linkedWidgetId'] !== null) {
        $meta['linkedWidgetId'] = (int)$w['linkedWidgetId'];
    }
    if (!empty($w['locked'])) {
        $meta['locked'] = true;
    }
    if (!empty($w['hidden'])) {
        $meta['hidden'] = true;
    }
    if (isset($w['customName']) && trim((string)$w['customName']) !== '') {
        // Plain text (the frontend escapes on render); strip markup and cap the length
        $meta['customName'] = mb_substr(strip_tags(trim((string)$w['customName'])), 0, 80);
    }
    return $meta;
}
