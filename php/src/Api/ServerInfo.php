<?php

/**
 * Server Information API Endpoint
 *
 * GET /api/server-info
 *
 * Returns server configuration information including runtime (PHP),
 * deployment type, and system details for benchmark identification.
 */

// Detect Docker deployment
$isDocker = !empty(getenv('INTERNAL_API_URL'));
$replicas = getenv('REPLICAS') ? (int)getenv('REPLICAS') : 1;

return [
    'mode' => 'php',
    'runtime' => 'PHP',
    'phpVersion' => PHP_VERSION,
    'deployment' => [
        'type' => $isDocker ? 'docker' : 'standalone',
        'replicas' => $isDocker ? $replicas : 1,
        'multiInstance' => $isDocker && $replicas > 1,
    ],
    'platform' => PHP_OS,
    'cpuCores' => function_exists('shell_exec') ? (int)shell_exec('nproc') : 1,
    'timestamp' => gmdate('Y-m-d\TH:i:s.v\Z'),
];