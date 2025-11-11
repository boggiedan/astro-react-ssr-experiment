<?php

namespace App\Lib;

class HttpClient
{
    /**
     * Fetch data from a URL and return as array
     */
    public static function get(string $url): array
    {
        $context = stream_context_create([
            'http' => [
                'timeout' => 30,
                'header' => 'Accept: application/json',
            ],
        ]);

        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            throw new \Exception("Failed to fetch from: $url");
        }

        return json_decode($response, true) ?? [];
    }

    /**
     * Fetch multiple URLs in parallel (using curl_multi)
     */
    public static function getMultiple(array $urls): array
    {
        $multiHandle = curl_multi_init();
        $handles = [];
        $results = [];

        // Initialize all curl handles
        foreach ($urls as $key => $url) {
            $handles[$key] = curl_init($url);
            curl_setopt($handles[$key], CURLOPT_RETURNTRANSFER, true);
            curl_setopt($handles[$key], CURLOPT_TIMEOUT, 30);
            curl_setopt($handles[$key], CURLOPT_HTTPHEADER, ['Accept: application/json']);
            curl_multi_add_handle($multiHandle, $handles[$key]);
        }

        // Execute all queries simultaneously
        $running = null;
        do {
            curl_multi_exec($multiHandle, $running);
            curl_multi_select($multiHandle);
        } while ($running > 0);

        // Collect results
        foreach ($handles as $key => $handle) {
            $response = curl_multi_getcontent($handle);
            $results[$key] = json_decode($response, true) ?? [];
            curl_multi_remove_handle($multiHandle, $handle);
            curl_close($handle);
        }

        curl_multi_close($multiHandle);

        return $results;
    }

    /**
     * Get base URL for internal API calls
     * Uses INTERNAL_API_URL in Docker, or constructs from request in dev
     */
    public static function getBaseUrl(): string
    {
        // Check for INTERNAL_API_URL (Docker environment)
        $internalUrl = getenv('INTERNAL_API_URL');
        if ($internalUrl) {
            return $internalUrl;
        }

        // Construct from current request
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return "$protocol://$host";
    }
}