<?php
/**
 * Activity Log Pruner
 * Usage via CLI: php prune_logs.php
 * Or set up as a daily cron job.
 */
require_once __DIR__ . '/../backend-api/db.php';

$retentionDays = getEnvValue('LOG_RETENTION_DAYS', 30);

echo "Pruning user_activity_logs older than {$retentionDays} days...\n";

try {
    $stmt = $pdo->prepare("DELETE FROM user_activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute([$retentionDays]);
    $deleted = $stmt->rowCount();
    echo "Successfully deleted {$deleted} old log entries.\n";
} catch (\PDOException $e) {
    echo "Error pruning logs: " . $e->getMessage() . "\n";
    exit(1);
}
