<?php

namespace App\Lib;

/**
 * Data Processing Utilities for CPU-intensive operations during SSR
 *
 * These functions replicate the exact logic from the TypeScript version
 * to ensure fair performance comparison.
 */
class DataProcessing
{
    /**
     * Heavy data processing function
     * Performs multiple transformations and calculations
     *
     * @param array $data Array of data points
     * @return array Processed items with ranks
     */
    public static function processData(array $data): array
    {
        // Sort by value (CPU work)
        usort($data, function ($a, $b) {
            return $b['value'] <=> $a['value'];
        });

        // Assign ranks
        $withRanks = [];
        foreach ($data as $index => $item) {
            $withRanks[] = array_merge($item, [
                'category' => $item['category'] ?? 'Uncategorized',
                'rank' => $index + 1,
            ]);
        }

        // Filter and transform
        $processed = [];
        foreach ($withRanks as $item) {
            if ($item['value'] > 10) {
                $processed[] = [
                    'id' => $item['id'],
                    'value' => $item['value'],
                    'label' => $item['label'],
                    'category' => $item['category'],
                    'rank' => $item['rank'],
                ];
            }
        }

        return $processed;
    }

    /**
     * Generate chart data with statistical calculations
     *
     * @param array $data Processed data
     * @return array Chart data points
     */
    public static function generateChartData(array $data): array
    {
        // Take sample for chart (reduce points for performance)
        $sampleSize = min(count($data), 100);
        $step = max(1, (int)floor(count($data) / $sampleSize));

        $chartData = [];
        for ($i = 0; $i < count($data); $i += $step) {
            $item = $data[$i];
            $chartData[] = [
                'x' => $i,
                'y' => $item['value'],
                'label' => $item['label'],
            ];
        }

        // Apply smoothing (more CPU work)
        return self::applyMovingAverage($chartData, 3);
    }

    /**
     * Apply moving average smoothing
     *
     * @param array $data Chart data points
     * @param int $window Window size for moving average
     * @return array Smoothed data
     */
    private static function applyMovingAverage(array $data, int $window): array
    {
        $result = [];

        foreach ($data as $index => $point) {
            if ($index < $window - 1) {
                $result[] = $point;
                continue;
            }

            $slice = array_slice($data, $index - $window + 1, $window);
            $avgY = array_sum(array_column($slice, 'y')) / $window;

            $result[] = array_merge($point, ['y' => $avgY]);
        }

        return $result;
    }

    /**
     * Perform complex calculations (CPU-intensive)
     * Simulates data science operations
     *
     * @param array $data Dataset
     * @return array Statistical results
     */
    public static function performComplexCalculations(array $data): array
    {
        $values = array_column($data, 'value');

        // Basic statistics
        $sum = array_sum($values);
        $count = count($values);
        $mean = $sum / $count;

        // Variance and standard deviation
        $variance = 0;
        foreach ($values as $value) {
            $variance += pow($value - $mean, 2);
        }
        $variance /= $count;
        $stdDev = sqrt($variance);

        // Quartiles
        $sorted = $values;
        sort($sorted);
        $q1 = $sorted[(int)floor($count * 0.25)];
        $median = $sorted[(int)floor($count * 0.5)];
        $q3 = $sorted[(int)floor($count * 0.75)];

        // Outlier detection
        $iqr = $q3 - $q1;
        $lowerBound = $q1 - 1.5 * $iqr;
        $upperBound = $q3 + 1.5 * $iqr;

        $outliers = array_filter($values, function ($v) use ($lowerBound, $upperBound) {
            return $v < $lowerBound || $v > $upperBound;
        });

        // Distribution analysis
        $histogram = self::generateHistogram($values, 10);

        return [
            'count' => $count,
            'sum' => $sum,
            'mean' => $mean,
            'variance' => $variance,
            'stdDev' => $stdDev,
            'min' => min($values),
            'max' => max($values),
            'q1' => $q1,
            'median' => $median,
            'q3' => $q3,
            'iqr' => $iqr,
            'outliers' => count($outliers),
            'histogram' => $histogram,
        ];
    }

    /**
     * Generate histogram bins
     *
     * @param array $values Numeric values
     * @param int $bins Number of bins
     * @return array Histogram data
     */
    private static function generateHistogram(array $values, int $bins): array
    {
        $min = min($values);
        $max = max($values);
        $binSize = ($max - $min) / $bins;

        $histogram = [];

        for ($i = 0; $i < $bins; $i++) {
            $binMin = $min + $i * $binSize;
            $binMax = $binMin + $binSize;

            $count = count(array_filter($values, function ($v) use ($binMin, $binMax) {
                return $v >= $binMin && $v < $binMax;
            }));

            $histogram[] = [
                'min' => $binMin,
                'max' => $binMax,
                'count' => $count,
            ];
        }

        return $histogram;
    }

    /**
     * Simulate heavy computation
     * Can be used to artificially increase CPU load
     *
     * @param int $iterations Number of iterations
     * @return float Result of computation
     */
    public static function simulateHeavyComputation(int $iterations = 1000000): float
    {
        $result = 0.0;

        for ($i = 0; $i < $iterations; $i++) {
            $result += sqrt($i) * sin($i) * cos($i);
        }

        return $result;
    }
}