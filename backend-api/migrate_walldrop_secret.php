<?php
require_once __DIR__ . '/db.php';

try {
    echo "Running walldrop secret migration...\n";
    // Add column
    $pdo->exec("ALTER TABLE displays ADD COLUMN IF NOT EXISTS walldrop_secret VARCHAR(64) DEFAULT NULL AFTER token");
    echo "Column 'walldrop_secret' added or already exists.\n";
    
    // Backfill existing displays with a random secret
    $stmt = $pdo->query("SELECT id FROM displays WHERE walldrop_secret IS NULL");
    $displays = $stmt->fetchAll();
    
    if (count($displays) > 0) {
        $up = $pdo->prepare("UPDATE displays SET walldrop_secret = ? WHERE id = ?");
        foreach ($displays as $d) {
            $secret = bin2hex(random_bytes(16)); // 32 chars
            $up->execute([$secret, $d['id']]);
        }
        echo "Backfilled " . count($displays) . " displays with walldrop_secret.\n";
    }
    
    echo "Migration completed successfully.\n";
} catch (\Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
