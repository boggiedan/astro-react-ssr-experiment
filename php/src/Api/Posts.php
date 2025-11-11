<?php

/**
 * Mock Posts API Endpoint
 *
 * GET /api/posts?delay=100&count=10
 *
 * Simulates fetching multiple posts with configurable delay
 */

$delay = (int)($query['delay'] ?? getenv('API_DELAY_MS') ?? 100);
$count = (int)($query['count'] ?? 10);

// Simulate API delay
usleep($delay * 1000);

$posts = [];
for ($i = 0; $i < $count; $i++) {
    $posts[] = [
        'id' => $i + 1,
        'userId' => 1,
        'title' => "Test Post " . ($i + 1),
        'body' => "This is the content of test post " . ($i + 1) . ". It contains some sample text to simulate a real blog post or article. The content can be of varying lengths to test different rendering scenarios.",
    ];
}

return $posts;