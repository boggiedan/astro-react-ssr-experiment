<?php

/**
 * Mock User API Endpoint
 *
 * GET /api/user?delay=50
 *
 * Simulates database/external API call with configurable delay
 */

$delay = (int)($query['delay'] ?? getenv('API_DELAY_MS') ?? 50);

// Simulate API delay
usleep($delay * 1000); // Convert milliseconds to microseconds

return [
    'id' => 1,
    'name' => 'Test User',
    'email' => 'test@example.com',
    'username' => 'testuser',
    'address' => [
        'street' => '123 Test St',
        'city' => 'Test City',
        'zipcode' => '12345',
    ],
    'phone' => '555-1234',
    'website' => 'test.example.com',
];