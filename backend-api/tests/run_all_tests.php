<?php
// Master Test Runner for Smart Display Backend
echo "====================================================\n";
echo " Smart Display - Automated Backend Test Suite \n";
echo "====================================================\n\n";

$startTime = microtime(true);
$passed = 0;
$failed = 0;

require_once __DIR__ . '/test_ai_flyer_scanner.php';
require_once __DIR__ . '/test_tasks_sync.php';
require_once __DIR__ . '/test_superadmin_and_security.php';

require_once __DIR__ . '/../db.php';
$secResults = run_superadmin_and_security_tests($pdo);
$passed += $secResults['passed'];
$failed += $secResults['failed'];

$duration = round((microtime(true) - $startTime) * 1000, 2);

echo "====================================================\n";
echo " All Backend Test Suites Finished in {$duration}ms \n";
echo " Total Tests Run: " . ($passed + $failed) . " | Passed: $passed | Failed: $failed\n";
echo "====================================================\n";

if ($failed > 0) {
    exit(1);
}
exit(0);
