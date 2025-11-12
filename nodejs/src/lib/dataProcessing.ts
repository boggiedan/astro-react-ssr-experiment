/**
 * Utility functions for CPU-intensive data processing during SSR
 * These simulate real-world data transformations and calculations
 */

interface DataPoint {
  id: number;
  value: number;
  label: string;
  category?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

interface ProcessedItem {
  id: number;
  value: number;
  label: string;
  category: string;
  rank: number;
}

interface ChartDataPoint {
  x: number;
  y: number;
  label: string;
}

/**
 * Heavy data processing function
 * Performs multiple transformations and calculations
 */
export function processData(data: DataPoint[]): ProcessedItem[] {
  // Sort by value (CPU work)
  const sorted = [...data].sort((a, b) => b.value - a.value);

  // Assign ranks
  const withRanks = sorted.map((item, index) => ({
    ...item,
    category: item.category || "Uncategorized",
    rank: index + 1,
  }));

  // Filter and transform
  const processed = withRanks
    .filter((item) => item.value > 10) // Filter low values
    .map((item) => ({
      id: item.id,
      value: item.value,
      label: item.label,
      category: item.category,
      rank: item.rank,
    }));

  return processed;
}

/**
 * Generate chart data with statistical calculations
 */
export function generateChartData(data: ProcessedItem[]): ChartDataPoint[] {
  // Take sample for chart (reduce points for performance)
  const sampleSize = Math.min(data.length, 100);
  const step = Math.floor(data.length / sampleSize);

  const chartData: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    const item = data[i];
    chartData.push({
      x: i,
      y: item.value,
      label: item.label,
    });
  }

  // Apply smoothing (more CPU work)
  const smoothed = applyMovingAverage(chartData, 3);

  return smoothed;
}

/**
 * Apply moving average smoothing
 */
function applyMovingAverage(
  data: ChartDataPoint[],
  window: number,
): ChartDataPoint[] {
  return data.map((point, index) => {
    if (index < window - 1) return point;

    const slice = data.slice(index - window + 1, index + 1);
    const avgY = slice.reduce((sum, p) => sum + p.y, 0) / window;

    return {
      ...point,
      y: avgY,
    };
  });
}

/**
 * Perform complex calculations (CPU-intensive)
 * Simulates data science operations
 */
export function performComplexCalculations(
  data: DataPoint[],
): Record<string, any> {
  const values = data.map((d) => d.value);

  // Basic statistics
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  // Quartiles
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  // Outlier detection
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = values.filter((v) => v < lowerBound || v > upperBound);

  // Distribution analysis
  const histogram = generateHistogram(values, 10);

  return {
    count: values.length,
    sum,
    mean,
    variance,
    stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
    q1,
    median,
    q3,
    iqr,
    outliers: outliers.length,
    histogram,
  };
}

/**
 * Generate histogram bins
 */
function generateHistogram(
  values: number[],
  bins: number,
): Array<{ min: number; max: number; count: number }> {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / bins;

  const histogram: Array<{ min: number; max: number; count: number }> = [];

  for (let i = 0; i < bins; i++) {
    const binMin = min + i * binSize;
    const binMax = binMin + binSize;
    const count = values.filter((v) => v >= binMin && v < binMax).length;

    histogram.push({ min: binMin, max: binMax, count });
  }

  return histogram;
}

/**
 * Simulate heavy computation
 * Can be used to artificially increase CPU load
 */
export function simulateHeavyComputation(iterations: number = 1000000): number {
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
  }
  return result;
}