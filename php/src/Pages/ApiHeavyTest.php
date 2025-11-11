<?php

namespace App\Pages;

use App\Lib\HttpClient;

/**
 * API-Heavy SSR Test Page
 *
 * Purpose: Simulate database/external API dependencies
 * Expected render time: 150-450ms
 */
class ApiHeavyTest extends BasePage
{
    public function render(): string
    {
        $baseUrl = HttpClient::getBaseUrl();

        // Fetch from mock APIs in parallel
        $responses = HttpClient::getMultiple([
            'user' => "{$baseUrl}/api/user?delay=100",
            'posts' => "{$baseUrl}/api/posts?delay=150&count=10",
            'comments' => "{$baseUrl}/api/comments?delay=200&count=20",
        ]);

        $user = $responses['user'];
        $posts = $responses['posts'];
        $comments = $responses['comments'];

        $renderTime = $this->getElapsedTime();
        $timestamp = gmdate('Y-m-d\TH:i:s.v\Z');

        // Calculate counts
        $postsCount = count($posts);
        $commentsCount = count($comments);

        // Render posts
        $postsHTML = '';
        foreach ($posts as $post) {
            $postsHTML .= <<<HTML
            <article class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 class="mb-2 text-lg font-semibold text-gray-800">{$post['title']}</h3>
                <p class="text-gray-600">{$post['body']}</p>
            </article>
HTML;
        }

        // Render first 10 comments
        $commentsHTML = '';
        foreach (array_slice($comments, 0, 10) as $comment) {
            $commentsHTML .= <<<HTML
            <div class="rounded border-l-4 border-purple-500 bg-gray-50 p-3">
                <strong class="text-gray-800">{$comment['name']}</strong>
                <p class="mt-1 text-gray-600">{$comment['body']}</p>
            </div>
HTML;
        }

        $content = <<<HTML
<div class="min-h-screen bg-gray-50">
    <!-- Header Component -->
    <header class="bg-white shadow-md">
        <div class="container mx-auto px-4 py-6">
            <h1 class="text-3xl font-bold text-gray-800">API-Heavy SSR Test</h1>
            <p class="mt-2 text-gray-600">Multiple sequential API calls</p>
            <nav class="mt-4 flex flex-wrap gap-4">
                <a href="/test/simple" class="text-blue-600 hover:text-blue-800 font-medium">Simple</a>
                <a href="/test/api-heavy" class="text-blue-600 hover:text-blue-800 font-medium">API Heavy</a>
                <a href="/test/cpu-intensive" class="text-blue-600 hover:text-blue-800 font-medium">CPU Intensive</a>
                <a href="/test/mixed" class="text-blue-600 hover:text-blue-800 font-medium">Mixed</a>
                <a href="/" class="text-blue-600 hover:text-blue-800 font-medium">Home</a>
            </nav>
        </div>
    </header>

    <main class="container mx-auto max-w-6xl px-4 py-8">
        <div class="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h2 class="mb-4 text-2xl font-bold text-gray-800">Test Information</h2>
            <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div class="rounded bg-blue-50 p-4">
                    <p class="text-sm text-gray-600">Test Type</p>
                    <p class="text-lg font-semibold text-blue-700">API-Heavy</p>
                </div>
                <div class="rounded bg-green-50 p-4">
                    <p class="text-sm text-gray-600">Complexity</p>
                    <p class="text-lg font-semibold text-green-700">I/O Bound</p>
                </div>
                <div class="rounded bg-purple-50 p-4">
                    <p class="text-sm text-gray-600">API Calls</p>
                    <p class="text-lg font-semibold text-purple-700">3</p>
                </div>
                <div class="rounded bg-orange-50 p-4">
                    <p class="text-sm text-gray-600">Render Time</p>
                    <p class="text-lg font-semibold text-orange-700">{$renderTime}ms</p>
                </div>
            </div>
        </div>

        <!-- DataDisplay Component Equivalent -->
        <div class="rounded-lg bg-white p-6 shadow-lg">
            <div class="w-full">
                <section class="mb-6">
                    <h2 class="mb-4 text-2xl font-bold text-gray-800">User Information</h2>
                    <div class="rounded-lg bg-blue-50 p-4">
                        <h3 class="text-xl font-semibold text-blue-900">{$user['name']}</h3>
                        <p class="text-blue-700">Email: {$user['email']}</p>
                        <p class="text-blue-700">ID: {$user['id']}</p>
                    </div>
                </section>

                <section class="mb-6">
                    <h2 class="mb-4 text-2xl font-bold text-gray-800">Posts ({$postsCount})</h2>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {$postsHTML}
                    </div>
                </section>

                <section class="mb-6">
                    <h2 class="mb-4 text-2xl font-bold text-gray-800">Comments ({$commentsCount})</h2>
                    <div class="space-y-3">
                        {$commentsHTML}
                    </div>
                </section>
            </div>
        </div>

        <div class="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Total server render time: {$renderTime}ms</p>
            <p>Expected: ~450ms (100ms + 150ms + 200ms for parallel fetches)</p>
            <p>Rendered at: {$timestamp}</p>
        </div>
    </main>
</div>
HTML;

        return $this->layout($content, 'API-Heavy SSR Test - PHP');
    }
}