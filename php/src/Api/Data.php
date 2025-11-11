<?php

/**
 * Mock Generic Data API Endpoint
 *
 * GET /api/data?delay=200&count=500
 *
 * Returns large dataset for CPU-intensive processing
 */

$delay = (int)($query['delay'] ?? getenv('API_DELAY_MS') ?? 200);
$count = (int)($query['count'] ?? 500);

// Simulate API delay
usleep($delay * 1000);

$categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Toys', 'Sports'];

$data = [];
for ($i = 0; $i < $count; $i++) {
    $data[] = [
        'id' => $i + 1,
        'value' => mt_rand(0, 10000) / 100.0, // Random 0-100 with decimals
        'label' => "Item " . ($i + 1),
        'category' => $categories[array_rand($categories)],
        'timestamp' => gmdate('Y-m-d\TH:i:s.v\Z', time() - mt_rand(0, 86400)),
        'metadata' => [
            'popularity' => mt_rand(0, 1000),
            'rating' => number_format(mt_rand(0, 500) / 100.0, 1),
            'inStock' => mt_rand(0, 10) > 2,
        ],
    ];
}

return $data;