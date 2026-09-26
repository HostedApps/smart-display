<?php
/**
 * Simple Database Migration Runner
 * Usage via CLI: php migrate.php
 */
require_once __DIR__ . '/../backend-api/db.php';

echo "Smart Display DB Migration Runner\n";
echo "=================================\n";

// 1. Ensure migrations table exists
$pdo->exec("
    CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

// 2. Fetch executed migrations
$stmt = $pdo->query("SELECT migration_name FROM migrations");
$executed = $stmt->fetchAll(PDO::FETCH_COLUMN);

// 3. Find migration files
$files = glob(__DIR__ . '/migrations/*.sql');
sort($files); // Ensure chronological order

$runCount = 0;
foreach ($files as $file) {
    $filename = basename($file);
    if (!in_array($filename, $executed)) {
        echo "Running migration: {$filename}... ";
        
        $sql = file_get_contents($file);
        
        try {
            $pdo->beginTransaction();
            $pdo->exec($sql);
            
            $log = $pdo->prepare("INSERT INTO migrations (migration_name) VALUES (?)");
            $log->execute([$filename]);
            
            $pdo->commit();
            echo "OK\n";
            $runCount++;
        } catch (Exception $e) {
            $pdo->rollBack();
            echo "FAILED\n";
            echo "Error: " . $e->getMessage() . "\n";
            exit(1);
        }
    }
}

if ($runCount === 0) {
    echo "Database is up to date. No new migrations found.\n";
} else {
    echo "Successfully executed {$runCount} migrations.\n";
}
