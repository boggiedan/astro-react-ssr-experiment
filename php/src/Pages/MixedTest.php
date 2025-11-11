<?php

namespace App\Pages;

use App\Lib\HttpClient;
use App\Lib\DataProcessing;

/**
 * Mixed Scenario Test Page
 *
 * Purpose: Real-world combination of API and CPU work
 * Expected render time: 150-400ms
 */
class MixedTest extends BasePage
{
    public function render(): string
    {
        $baseUrl = HttpClient::getBaseUrl();

        // Fetch data from API (I/O bound - 30%)
        $apiData = HttpClient::get("{$baseUrl}/api/data?delay=150&count=300");
        $apiTime = $this->getElapsedTime();

        // Process the data (CPU bound - 70%)
        $processed = DataProcessing::processData($apiData);
        $chartData = DataProcessing::generateChartData($processed);

        // Group by category for display
        $byCategory = [];
        foreach ($processed as $item) {
            $cat = $item['category'];
            if (!isset($byCategory[$cat])) {
                $byCategory[$cat] = [];
            }
            $byCategory[$cat][] = $item;
        }

        // Calculate category stats
        $categoryStats = [];
        foreach ($byCategory as $category => $items) {
            $sum = array_sum(array_column($items, 'value'));
            $avg = $sum / count($items);
            $categoryStats[] = [
                'category' => $category,
                'count' => count($items),
                'avg' => $avg,
                'sum' => $sum,
            ];
        }

        usort($categoryStats, fn($a, $b) => $b['avg'] <=> $a['avg']);

        $totalTime = $this->getElapsedTime();
        $cpuTime = $totalTime - $apiTime;
        $timestamp = gmdate('Y-m-d\TH:i:s.v\Z');

        $maxAvg = max(array_column($categoryStats, 'avg'));

        $categoryCards = '';
        foreach ($categoryStats as $stat) {
            $width = ($stat['avg'] / $maxAvg) * 100;
            $category = $stat['category'];
            $count = $stat['count'];
            $avg = number_format($stat['avg'], 2);
            $sum = number_format($stat['sum'], 2);
            $categoryCards .= <<<HTML
            <div class="rounded-lg bg-white p-5 shadow-lg">
                <h3 class="mb-2 text-lg font-bold text-gray-800">{$category}</h3>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Items:</span>
                        <span class="font-semibold">{$count}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Average:</span>
                        <span class="font-semibold text-blue-600">{$avg}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Total:</span>
                        <span class="font-semibold text-purple-600">{$sum}</span>
                    </div>
                    <div class="mt-3">
                        <div class="h-2 rounded-full bg-gray-200">
                            <div class="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style="width: {$width}%"></div>
                        </div>
                    </div>
                </div>
            </div>
HTML;
        }

        $topItems = '';
        foreach (array_slice($processed, 0, 20) as $item) {
            $rank = $item['rank'];
            $label = $item['label'];
            $value = number_format($item['value'], 1);
            $category = $item['category'];
            $topItems .= <<<HTML
            <div class="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-3 text-center">
                <div class="text-xs font-bold text-gray-500">#{$rank}</div>
                <div class="my-1 text-sm font-semibold">{$label}</div>
                <div class="text-lg font-bold text-blue-600">{$value}</div>
                <div class="text-xs text-gray-500">{$category}</div>
            </div>
HTML;
        }

        $apiPercent = round(($apiTime / $totalTime) * 100);
        $cpuPercent = round(($cpuTime / $totalTime) * 100);
        $apiWidthPercent = ($apiTime / $totalTime) * 100;
        $cpuWidthPercent = ($cpuTime / $totalTime) * 100;
        $workerBenefit = round(($cpuTime / $totalTime) * 50);

        // Pre-calculate all display values for heredoc
        $roundedApiTime = round($apiTime);
        $roundedCpuTime = round($cpuTime);
        $roundedTotalTime = round($totalTime);
        $processedCount = count($processed);

        $content = <<<HTML
<div class="min-h-screen bg-gray-50">
    <!-- Header Component -->
    <header class="bg-white shadow-md">
        <div class="container mx-auto px-4 py-6">
            <h1 class="text-3xl font-bold text-gray-800">Mixed Scenario Test</h1>
            <p class="mt-2 text-gray-600">Realistic combination of API and CPU work</p>
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
            <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div class="rounded bg-blue-50 p-4">
                    <p class="text-sm text-gray-600">Test Type</p>
                    <p class="text-lg font-semibold text-blue-700">Mixed</p>
                </div>
                <div class="rounded bg-green-50 p-4">
                    <p class="text-sm text-gray-600">API Time</p>
                    <p class="text-lg font-semibold text-green-700">{$roundedApiTime}ms</p>
                </div>
                <div class="rounded bg-purple-50 p-4">
                    <p class="text-sm text-gray-600">CPU Time</p>
                    <p class="text-lg font-semibold text-purple-700">{$roundedCpuTime}ms</p>
                </div>
                <div class="rounded bg-orange-50 p-4">
                    <p class="text-sm text-gray-600">Total Time</p>
                    <p class="text-lg font-semibold text-orange-700">{$roundedTotalTime}ms</p>
                </div>
                <div class="rounded bg-red-50 p-4">
                    <p class="text-sm text-gray-600">Data Points</p>
                    <p class="text-lg font-semibold text-red-700">{$processedCount}</p>
                </div>
            </div>
        </div>

        <div class="mb-6 grid gap-6 md:grid-cols-3">
            {$categoryCards}
        </div>

        <div class="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h3 class="mb-4 text-xl font-bold text-gray-800">Performance Breakdown</h3>
            <div class="space-y-4">
                <div class="flex items-center gap-4">
                    <div class="w-32 text-sm font-medium text-gray-700">API Call:</div>
                    <div class="flex-1">
                        <div class="relative h-8 rounded-full bg-gray-200">
                            <div class="flex h-8 items-center rounded-full bg-green-500 px-3 text-sm font-semibold text-white" style="width: {$apiWidthPercent}%">
                                {$roundedApiTime}ms ({$apiPercent}%)
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="w-32 text-sm font-medium text-gray-700">CPU Processing:</div>
                    <div class="flex-1">
                        <div class="relative h-8 rounded-full bg-gray-200">
                            <div class="flex h-8 items-center rounded-full bg-purple-500 px-3 text-sm font-semibold text-white" style="width: {$cpuWidthPercent}%">
                                {$roundedCpuTime}ms ({$cpuPercent}%)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p class="text-sm text-blue-800">
                    <strong>Worker Benefit Analysis:</strong> This page has {$apiPercent}% I/O time and {$cpuPercent}% CPU time.
                    Workers will help with the CPU portion but not the I/O portion, so expect ~{$workerBenefit}% improvement at best.
                </p>
            </div>
        </div>

        <div class="rounded-lg bg-white p-6 shadow-lg">
            <h3 class="mb-4 text-xl font-bold text-gray-800">Top Items</h3>
            <div class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                {$topItems}
            </div>
        </div>

        <div class="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Total server render time: {$roundedTotalTime}ms</p>
            <p>API time: {$roundedApiTime}ms | CPU time: {$roundedCpuTime}ms</p>
            <p>Rendered at: {$timestamp}</p>
        </div>
    </main>
</div>
HTML;

        return $this->layout($content, 'Mixed Scenario Test - PHP');
    }
}