<?php

namespace App\Pages;

/**
 * Simple SSR Test Page
 *
 * Purpose: Baseline rendering with minimal complexity
 * Expected render time: 10-20ms
 */
class SimpleTest extends BasePage
{
    public function render(): string
    {
        $renderTime = $this->getElapsedTime();
        $timestamp = gmdate('Y-m-d\TH:i:s.v\Z');

        // Generate 100 list items like SimpleReact component
        $items = '';
        for ($i = 0; $i < 100; $i++) {
            $items .= "<li>Item {$i}</li>\n";
        }

        $content = <<<HTML
<div class="min-h-screen bg-gray-50">
    <!-- Header Component -->
    <header class="bg-white shadow-md">
        <div class="container mx-auto px-4 py-6">
            <h1 class="text-3xl font-bold text-gray-800">Simple SSR Test</h1>
            <p class="mt-2 text-gray-600">Baseline React component rendering</p>
            <nav class="mt-4 flex flex-wrap gap-4">
                <a href="/test/simple" class="text-blue-600 hover:text-blue-800 font-medium">Simple</a>
                <a href="/test/api-heavy" class="text-blue-600 hover:text-blue-800 font-medium">API Heavy</a>
                <a href="/test/cpu-intensive" class="text-blue-600 hover:text-blue-800 font-medium">CPU Intensive</a>
                <a href="/test/mixed" class="text-blue-600 hover:text-blue-800 font-medium">Mixed</a>
                <a href="/" class="text-blue-600 hover:text-blue-800 font-medium">Home</a>
            </nav>
        </div>
    </header>

    <main class="container mx-auto max-w-4xl px-4 py-8">
        <div class="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h2 class="mb-4 text-2xl font-bold text-gray-800">Test Information</h2>
            <div class="grid grid-cols-2 gap-4">
                <div class="rounded bg-blue-50 p-4">
                    <p class="text-sm text-gray-600">Test Type</p>
                    <p class="text-lg font-semibold text-blue-700">Simple SSR</p>
                </div>
                <div class="rounded bg-green-50 p-4">
                    <p class="text-sm text-gray-600">Complexity</p>
                    <p class="text-lg font-semibold text-green-700">Low</p>
                </div>
                <div class="rounded bg-purple-50 p-4">
                    <p class="text-sm text-gray-600">API Calls</p>
                    <p class="text-lg font-semibold text-purple-700">0</p>
                </div>
                <div class="rounded bg-orange-50 p-4">
                    <p class="text-sm text-gray-600">Expected Time</p>
                    <p class="text-lg font-semibold text-orange-700">10-20ms</p>
                </div>
            </div>
        </div>

        <!-- SimpleReact Component Equivalent -->
        <div class="rounded-lg bg-white p-6 shadow-lg">
            <div class="w-full rounded-lg bg-white p-6 shadow-lg">
                <h2 class="mb-4 text-2xl font-bold text-gray-800">Hello from Simple SSR Test!</h2>
                <p class="mb-4 text-gray-600">This is a simple React component with 100 items.</p>
                <ul class="space-y-1 list-disc list-inside text-gray-700">
                    {$items}
                </ul>
            </div>
        </div>

        <div class="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Server render time: {$renderTime}ms</p>
            <p>Rendered at: {$timestamp}</p>
        </div>
    </main>
</div>
HTML;

        return $this->layout($content, 'Simple SSR Test - PHP');
    }
}