<?php
require_once __DIR__ . '/db.php';

try {
    echo "Running token expiry migration...\n";
    // 1. Add column
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at DATETIME DEFAULT NULL AFTER auth_token");
    echo "Column 'token_expires_at' added or already exists.\n";
    
    // 2. Add index (wrap in try-catch as older MySQL/MariaDB might not support IF NOT EXISTS on CREATE INDEX cleanly)
    try {
        // Checking if index exists first to avoid error
        $stmt = $pdo->query("SHOW INDEX FROM users WHERE Key_name = 'idx_users_token_expires'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("CREATE INDEX idx_users_token_expires ON users (token_expires_at)");
            echo "Index 'idx_users_token_expires' created.\n";
        } else {
            echo "Index 'idx_users_token_expires' already exists.\n";
        }
    } catch (\PDOException $e) {
        echo "Note on index creation: " . $e->getMessage() . "\n";
    }

    echo "Migration completed successfully.\n";
} catch (\Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
