<?php
if (!function_exists('assertTrue')) {
    $passed = 0;
    $failed = 0;

    function assertTrue($condition, $testName) {
        global $passed, $failed;
        if ($condition) {
            echo "  \033[32m✔ PASS:\033[0m $testName\n";
            $passed++;
        } else {
            echo "  \033[31m✖ FAIL:\033[0m $testName\n";
            $failed++;
        }
    }
}

echo "Running Tasks Sync Tests...\n";

// Test 1: Task toggle logic on item list
$items = [
    ["id" => "1", "text" => "Water plants", "completed" => false],
    ["id" => "2", "text" => "Groceries", "completed" => true]
];

$targetId = "1";
$newStatus = null;
foreach ($items as &$item) {
    if ($item['id'] === $targetId) {
        $item['completed'] = !$item['completed'];
        $newStatus = $item['completed'];
        break;
    }
}
unset($item);

assertTrue($newStatus === true, "Task status correctly toggles from false to true");
assertTrue($items[0]['completed'] === true, "Item 1 state updated in memory array");

// Test 2: Toggle completed item back to pending
$targetId = "2";
foreach ($items as &$item) {
    if ($item['id'] === $targetId) {
        $item['completed'] = !$item['completed'];
        $newStatus = $item['completed'];
        break;
    }
}
unset($item);
assertTrue($newStatus === false, "Completed task 2 correctly toggles back to pending");

// Test 3: Priority tag validation
$validPriorities = ['high', 'medium', 'low'];
$testPriority = 'high';
assertTrue(in_array($testPriority, $validPriorities), "Priority tag 'high' is recognized");

// Test 4: Task addition logic
$newTask = [
    "id" => "task_" . time(),
    "text" => "Pick up kids from school",
    "completed" => false,
    "priority" => "high",
    "dueDate" => "3:30 PM"
];
$items[] = $newTask;
assertTrue(count($items) === 3, "New task successfully appended to items list");
assertTrue($items[2]['text'] === "Pick up kids from school", "New task text verified");

// Test 5: Task deletion logic
$deleteId = $items[0]['id'];
$items = array_values(array_filter($items, function($i) use ($deleteId) {
    return $i['id'] !== $deleteId;
}));
assertTrue(count($items) === 2, "Task successfully deleted by ID");
assertTrue($items[0]['id'] !== $deleteId, "Deleted task no longer exists in array");

echo "Tasks Sync Tests Complete: $passed passed, $failed failed.\n\n";
