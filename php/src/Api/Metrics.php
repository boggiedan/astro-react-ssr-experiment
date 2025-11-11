<?php

/**
 * Metrics API Endpoint
 *
 * GET /api/metrics
 *
 * Returns simplified metrics for PHP (no worker pool like Node.js)
 */

return [
    'mode' => 'php',
    'runtime' => 'PHP',
    'message' => 'PHP uses process-based concurrency (PHP-FPM), not worker threads',
    'processInfo' => [
        'processId' => getmypid(),
        'memoryUsage' => memory_get_usage(true),
        'peakMemoryUsage' => memory_get_peak_usage(true),
    ],
    'timestamp' => gmdate('Y-m-d\TH:i:s.v\Z'),
];