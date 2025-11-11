<?php

namespace App\Pages;

/**
 * Home Page
 *
 * Lists all test scenarios and provides links to them
 */
class Home extends BasePage
{
    public function render(): string
    {
        $testScenarios = [
            [
                'name' => 'Simple SSR',
                'path' => '/test/simple',
                'description' => 'Baseline rendering with minimal complexity',
                'complexity' => 'Low',
                'apiCalls' => 0,
                'expectedTime' => '10-20ms',
                'color' => 'blue',
            ],
            [
                'name' => 'API-Heavy',
                'path' => '/test/api-heavy',
                'description' => 'Multiple API calls simulating I/O-bound scenarios',
                'complexity' => 'I/O Bound',
                'apiCalls' => 3,
                'expectedTime' => '150-450ms',
                'color' => 'green',
            ],
            [
                'name' => 'CPU-Intensive',
                'path' => '/test/cpu-intensive',
                'description' => 'Heavy analytics dashboard (2500 items, statistics, trend calculations)',
                'complexity' => 'High',
                'apiCalls' => 0,
                'expectedTime' => '200-500ms',
                'color' => 'purple',
            ],
            [
                'name' => 'Mixed Scenario',
                'path' => '/test/mixed',
                'description' => 'Real-world combination of API calls (30%) and CPU work (70%)',
                'complexity' => 'Mixed',
                'apiCalls' => 1,
                'expectedTime' => '150-400ms',
                'color' => 'red',
            ],
        ];

        $scenarioCards = '';
        foreach ($testScenarios as $scenario) {
            $scenarioCards .= <<<HTML
            <a href="{$scenario['path']}" class="group overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div class="h-2 bg-{$scenario['color']}-500"></div>
                <div class="p-6">
                    <h3 class="mb-2 text-2xl font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                        {$scenario['name']}
                    </h3>
                    <p class="mb-4 text-sm text-gray-600">{$scenario['description']}</p>

                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">Complexity:</span>
                            <span class="text-sm font-semibold text-{$scenario['color']}-600">{$scenario['complexity']}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">API Calls:</span>
                            <span class="text-sm font-semibold">{$scenario['apiCalls']}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">Expected Time:</span>
                            <span class="text-sm font-semibold text-gray-700">{$scenario['expectedTime']}</span>
                        </div>
                    </div>

                    <div class="mt-4 border-t border-gray-100 pt-4">
                        <span class="text-sm font-medium text-blue-600 group-hover:text-blue-700">Run Test →</span>
                    </div>
                </div>
            </a>
HTML;
        }

        $phpVersion = PHP_VERSION;

        $content = <<<HTML
<div class="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
    <div class="container mx-auto max-w-6xl px-4 py-12">
        <!-- Header -->
        <header class="mb-12 text-center">
            <h1 class="mb-4 text-5xl font-bold text-gray-900">
                PHP SSR <span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Performance Test</span>
            </h1>
            <p class="mb-6 text-xl text-gray-600">
                Performance testing framework for comparing PHP with Astro SSR
            </p>
            <div class="flex justify-center gap-4">
                <div class="rounded-lg bg-white px-4 py-2 shadow">
                    <span class="text-sm text-gray-600">Scenarios:</span>
                    <span class="ml-2 text-lg font-bold text-blue-600">4</span>
                </div>
                <div class="rounded-lg bg-white px-4 py-2 shadow">
                    <span class="text-sm text-gray-600">Runtime:</span>
                    <span class="ml-2 text-lg font-bold text-purple-600">PHP {$phpVersion}</span>
                </div>
            </div>
        </header>

        <!-- Test Scenarios Grid -->
        <div class="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {$scenarioCards}
        </div>

        <!-- Project Information -->
        <div class="mb-8 rounded-xl bg-white p-8 shadow-lg">
            <h2 class="mb-4 text-2xl font-bold text-gray-900">About This Test</h2>
            <div class="prose prose-blue max-w-none">
                <p class="text-gray-700">
                    This PHP application replicates the Astro+React SSR test scenarios to enable
                    direct performance comparison between PHP and Node.js-based server-side rendering.
                </p>

                <div class="mt-6 grid gap-4 md:grid-cols-3">
                    <div class="rounded-lg bg-blue-50 p-4">
                        <h4 class="mb-2 font-bold text-blue-900">PHP Traditional</h4>
                        <p class="text-sm text-blue-800">Classic PHP request-response model with PHP-FPM</p>
                    </div>
                    <div class="rounded-lg bg-purple-50 p-4">
                        <h4 class="mb-2 font-bold text-purple-900">Astro Worker Mode</h4>
                        <p class="text-sm text-purple-800">Multi-threaded SSR with worker pool</p>
                    </div>
                    <div class="rounded-lg bg-green-50 p-4">
                        <h4 class="mb-2 font-bold text-green-900">Fair Comparison</h4>
                        <p class="text-sm text-green-800">Same logic, same APIs, same Docker setup</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Benchmark Info -->
        <div class="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 p-8 text-white shadow-lg">
            <h2 class="mb-4 text-2xl font-bold">📊 Benchmark Results</h2>
            <p class="mb-4 opacity-90">
                Run benchmarks using: <code class="rounded bg-white/20 px-2 py-1 font-mono text-sm">npm run benchmark -- --url http://localhost:8080</code>
            </p>
            <p class="text-sm opacity-75">
                Results will be saved to /benchmark/results/ and can be viewed in the Astro benchmark viewer
            </p>
        </div>
    </div>
</div>
HTML;

        return $this->layout($content, 'PHP SSR Performance Test');
    }
}