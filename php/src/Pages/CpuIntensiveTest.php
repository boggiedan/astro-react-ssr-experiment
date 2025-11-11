<?php

namespace App\Pages;

use App\Lib\DataProcessing;

/**
 * CPU-Intensive SSR Test Page
 *
 * Purpose: Heavy computation during SSR (realistic analytics/dashboard scenario)
 * Expected render time: 200-500ms
 */
class CpuIntensiveTest extends BasePage
{
    public function render(): string
    {
        // Generate realistic large dataset (like an analytics dashboard)
        $dataset = [];
        $categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Toys'];

        for ($i = 0; $i < 2500; $i++) {
            $dataset[] = [
                'id' => $i + 1,
                'value' => mt_rand(0, 10000) / 100.0,
                'label' => "Item " . ($i + 1),
                'category' => $categories[array_rand($categories)],
            ];
        }

        // Perform realistic CPU-intensive calculations
        $processed = DataProcessing::processData($dataset);
        $chartData = DataProcessing::generateChartData($processed);
        $statistics = DataProcessing::performComplexCalculations($dataset);

        // Simulate heavy computation (trend calculations)
        $heavyCompResult = DataProcessing::simulateHeavyComputation(750000);

        $renderTime = $this->getElapsedTime();
        $timestamp = gmdate('Y-m-d\TH:i:s.v\Z');

        // Generate chart statistics for ComplexChart component
        $sum = array_sum(array_column($chartData, 'y'));
        $mean = $sum / count($chartData);
        $values = array_column($chartData, 'y');
        $variance = array_sum(array_map(fn($y) => pow($y - $mean, 2), $values)) / count($values);
        $stdDev = sqrt($variance);
        $minY = min($values);
        $maxY = max($values);

        // Generate SVG chart
        $width = 800;
        $height = 400;
        $range = $maxY - $minY;
        $pathData = '';
        $circles = '';
        foreach ($chartData as $index => $point) {
            $x = ($index / (count($chartData) - 1)) * $width;
            $y = $height - (($point['y'] - $minY) / $range) * $height;
            $pathData .= ($index === 0 ? "M " : "L ") . "{$x} {$y} ";
            $circles .= "<circle cx=\"{$x}\" cy=\"{$y}\" r=\"3\" fill=\"#2196F3\" />\n";
        }

        // Grid lines for chart
        $gridLines = '';
        for ($i = 0; $i < 10; $i++) {
            $yPos = ($i / 10) * $height;
            $gridLines .= "<line x1=\"0\" y1=\"{$yPos}\" x2=\"{$width}\" y2=\"{$yPos}\" stroke=\"#e0e0e0\" stroke-width=\"1\" />\n";
        }

        // Generate category stats table for DataProcessor component
        $grouped = [];
        foreach ($processed as $item) {
            $cat = $item['category'];
            if (!isset($grouped[$cat])) {
                $grouped[$cat] = [];
            }
            $grouped[$cat][] = $item;
        }

        $categoryStatsHTML = '';
        $categoryBarsHTML = '';
        foreach ($grouped as $category => $items) {
            $sum = array_sum(array_column($items, 'value'));
            $avg = $sum / count($items);
            $max = max(array_column($items, 'value'));
            $min = min(array_column($items, 'value'));

            // Pre-calculate formatted values
            $itemCount = count($items);
            $avgFormatted = number_format($avg, 2);
            $minFormatted = number_format($min, 2);
            $maxFormatted = number_format($max, 2);
            $sumFormatted = number_format($sum, 2);

            $categoryStatsHTML .= <<<HTML
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{$category}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{$itemCount}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{$avgFormatted}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{$minFormatted}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{$maxFormatted}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{$sumFormatted}</td>
            </tr>
HTML;
        }

        // Top 20 items
        $topItemsHTML = '';
        foreach (array_slice($processed, 0, 20) as $item) {
            $rank = $item['rank'];
            $label = $item['label'];
            $value = number_format($item['value'], 2);
            $category = $item['category'];
            $topItemsHTML .= <<<HTML
            <div class="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-3 text-center">
                <div class="text-xs font-bold text-gray-500">#{$rank}</div>
                <div class="my-1 text-sm font-semibold text-gray-800">{$label}</div>
                <div class="text-lg font-bold text-blue-600">{$value}</div>
                <div class="text-xs text-gray-500">{$category}</div>
            </div>
HTML;
        }

        // Pre-calculate all display values for heredoc
        $statCount = $statistics['count'];
        $statMean = number_format($statistics['mean'], 2);
        $statStdDev = number_format($statistics['stdDev'], 2);
        $statMin = number_format($statistics['min'], 2);
        $statMax = number_format($statistics['max'], 2);
        $statMedian = number_format($statistics['median'], 2);
        $statOutliers = $statistics['outliers'];
        $datasetCount = count($dataset);
        $processedCount = count($processed);
        $chartDataCount = count($chartData);
        $meanFormatted = number_format($mean, 2);
        $stdDevFormatted = number_format($stdDev, 2);
        $minYFormatted = number_format($minY, 2);
        $maxYFormatted = number_format($maxY, 2);

        $content = <<<HTML
<div class="min-h-screen bg-gray-50">
    <!-- Header Component -->
    <header class="bg-white shadow-md">
        <div class="container mx-auto px-4 py-6">
            <h1 class="text-3xl font-bold text-gray-800">CPU-Intensive SSR Test</h1>
            <p class="mt-2 text-gray-600">Heavy computation and data processing</p>
            <nav class="mt-4 flex flex-wrap gap-4">
                <a href="/test/simple" class="text-blue-600 hover:text-blue-800 font-medium">Simple</a>
                <a href="/test/api-heavy" class="text-blue-600 hover:text-blue-800 font-medium">API Heavy</a>
                <a href="/test/cpu-intensive" class="text-blue-600 hover:text-blue-800 font-medium">CPU Intensive</a>
                <a href="/test/mixed" class="text-blue-600 hover:text-blue-800 font-medium">Mixed</a>
                <a href="/" class="text-blue-600 hover:text-blue-800 font-medium">Home</a>
            </nav>
        </div>
    </header>

    <main class="container mx-auto max-w-7xl px-4 py-8">
        <div class="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h1 class="mb-2 text-3xl font-bold text-gray-800">CPU-Intensive SSR Test</h1>
            <p class="text-gray-600">Heavy computation and data processing</p>
        </div>

        <div class="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h2 class="mb-4 text-2xl font-bold text-gray-800">Test Information</h2>
            <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div class="rounded bg-blue-50 p-4">
                    <p class="text-sm text-gray-600">Test Type</p>
                    <p class="text-lg font-semibold text-blue-700">CPU-Intensive</p>
                </div>
                <div class="rounded bg-green-50 p-4">
                    <p class="text-sm text-gray-600">Complexity</p>
                    <p class="text-lg font-semibold text-green-700">High</p>
                </div>
                <div class="rounded bg-purple-50 p-4">
                    <p class="text-sm text-gray-600">Data Points</p>
                    <p class="text-lg font-semibold text-purple-700">2,500</p>
                </div>
                <div class="rounded bg-orange-50 p-4">
                    <p class="text-sm text-gray-600">Render Time</p>
                    <p class="text-lg font-semibold text-orange-700">{$renderTime}ms</p>
                </div>
                <div class="rounded bg-red-50 p-4">
                    <p class="text-sm text-gray-600">CPU Usage</p>
                    <p class="text-lg font-semibold text-red-700">High</p>
                </div>
            </div>
        </div>

        <div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div class="rounded-lg bg-white p-6 shadow-lg">
                <h3 class="mb-4 text-xl font-bold">Statistical Analysis</h3>
                <div class="space-y-2">
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-600">Count:</span>
                        <span class="font-semibold">{$statCount}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-600">Mean:</span>
                        <span class="font-semibold">{$statMean}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-600">Std Dev:</span>
                        <span class="font-semibold">{$statStdDev}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-600">Range:</span>
                        <span class="font-semibold">{$statMin} - {$statMax}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-600">Median:</span>
                        <span class="font-semibold">{$statMedian}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Outliers:</span>
                        <span class="font-semibold text-red-600">{$statOutliers}</span>
                    </div>
                </div>
            </div>

            <div class="rounded-lg bg-white p-6 shadow-lg">
                <h3 class="mb-4 text-xl font-bold">Processing Summary</h3>
                <div class="space-y-3">
                    <div class="rounded bg-blue-50 p-3">
                        <p class="text-sm text-gray-600">Original Dataset</p>
                        <p class="text-2xl font-bold text-blue-700">{$datasetCount}</p>
                    </div>
                    <div class="rounded bg-green-50 p-3">
                        <p class="text-sm text-gray-600">Processed Items</p>
                        <p class="text-2xl font-bold text-green-700">{$processedCount}</p>
                    </div>
                    <div class="rounded bg-purple-50 p-3">
                        <p class="text-sm text-gray-600">Chart Points</p>
                        <p class="text-2xl font-bold text-purple-700">{$chartDataCount}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ComplexChart Component Equivalent -->
        <div class="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <div class="w-full">
                <h3 class="mb-4 text-2xl font-bold text-gray-800">Data Visualization ({$chartDataCount} points)</h3>

                <div class="mb-4 flex gap-4">
                    <div class="rounded bg-gray-100 px-4 py-2">
                        <span class="text-gray-600">Mean:</span> <strong class="text-gray-800">{$meanFormatted}</strong>
                    </div>
                    <div class="rounded bg-gray-100 px-4 py-2">
                        <span class="text-gray-600">Std Dev:</span> <strong class="text-gray-800">{$stdDevFormatted}</strong>
                    </div>
                    <div class="rounded bg-gray-100 px-4 py-2">
                        <span class="text-gray-600">Range:</span>
                        <strong class="text-gray-800">{$minYFormatted} - {$maxYFormatted}</strong>
                    </div>
                </div>

                <svg width="{$width}" height="{$height}" class="w-full rounded border border-gray-300">
                    {$gridLines}
                    <path d="{$pathData}" fill="none" stroke="#2196F3" stroke-width="2" />
                    {$circles}
                </svg>

                <div class="mt-4 flex gap-6 text-sm text-gray-700">
                    <div><span style="color: #2196F3;">●</span> Data Points</div>
                </div>
            </div>
        </div>

        <!-- DataProcessor Component Equivalent -->
        <div class="rounded-lg bg-white p-6 shadow-lg">
            <div class="w-full">
                <h3 class="mb-6 text-2xl font-bold text-gray-800">Processed Data Analysis</h3>

                <section class="mb-8">
                    <h4 class="mb-4 text-xl font-semibold text-gray-700">Category Statistics</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full rounded-lg border border-gray-200 bg-white">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Count</th>
                                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Average</th>
                                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Min</th>
                                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Max</th>
                                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sum</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                {$categoryStatsHTML}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="mb-8">
                    <h4 class="mb-4 text-xl font-semibold text-gray-700">Top 20 Items by Value</h4>
                    <div class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                        {$topItemsHTML}
                    </div>
                </section>
            </div>
        </div>

        <div class="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Total server render time: {$renderTime}ms</p>
            <p>Data processing + chart generation + statistics calculation</p>
            <p>Rendered at: {$timestamp}</p>
        </div>
    </main>
</div>
HTML;

        return $this->layout($content, 'CPU-Intensive SSR Test - PHP');
    }
}