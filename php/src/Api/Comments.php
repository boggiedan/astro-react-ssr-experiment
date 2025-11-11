<?php

/**
 * Mock Comments API Endpoint
 *
 * GET /api/comments?delay=150&count=20
 *
 * Simulates fetching comments with configurable delay
 */

$delay = (int)($query['delay'] ?? getenv('API_DELAY_MS') ?? 150);
$count = (int)($query['count'] ?? 20);

// Simulate API delay
usleep($delay * 1000);

$comments = [];
for ($i = 0; $i < $count; $i++) {
    $comments[] = [
        'id' => $i + 1,
        'postId' => (int)floor($i / 2) + 1,
        'name' => "Commenter " . ($i + 1),
        'email' => "commenter" . ($i + 1) . "@example.com",
        'body' => "This is comment " . ($i + 1) . ". It provides feedback or additional information about the post. Comments can vary in length and complexity.",
    ];
}

return $comments;