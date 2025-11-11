interface ChartDataPoint {
  x: number;
  y: number;
  label: string;
}

interface ComplexChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
}

/**
 * Complex chart component with heavy calculations during render
 * Tests CPU-intensive SSR scenarios
 */
export default function ComplexChart({
  data,
  width = 800,
  height = 400,
}: ComplexChartProps) {
  // Calculate statistics (CPU-intensive)
  const sum = data.reduce((acc, point) => acc + point.y, 0);
  const mean = sum / data.length;
  const variance =
    data.reduce((acc, point) => acc + Math.pow(point.y - mean, 2), 0) /
    data.length;
  const stdDev = Math.sqrt(variance);

  // Find min/max for scaling
  const minY = Math.min(...data.map((p) => p.y));
  const maxY = Math.max(...data.map((p) => p.y));
  const range = maxY - minY;

  // Calculate SVG path points (CPU-intensive)
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((point.y - minY) / range) * height;
    return { x, y, label: point.label };
  });

  // Generate path string
  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Calculate moving average (more CPU work)
  const window = 10;
  const movingAvg = points.map((_, i) => {
    if (i < window) return null;
    const slice = data.slice(i - window, i);
    const avg = slice.reduce((acc, p) => acc + p.y, 0) / window;
    const x = points[i].x;
    const y = height - ((avg - minY) / range) * height;
    return { x, y };
  });

  return (
    <div className="w-full">
      <h3 className="mb-4 text-2xl font-bold text-gray-800">Data Visualization ({data.length} points)</h3>

      <div className="mb-4 flex gap-4">
        <div className="rounded bg-gray-100 px-4 py-2">
          <span className="text-gray-600">Mean:</span> <strong className="text-gray-800">{mean.toFixed(2)}</strong>
        </div>
        <div className="rounded bg-gray-100 px-4 py-2">
          <span className="text-gray-600">Std Dev:</span> <strong className="text-gray-800">{stdDev.toFixed(2)}</strong>
        </div>
        <div className="rounded bg-gray-100 px-4 py-2">
          <span className="text-gray-600">Range:</span>{" "}
          <strong className="text-gray-800">
            {minY.toFixed(2)} - {maxY.toFixed(2)}
          </strong>
        </div>
      </div>

      <svg width={width} height={height} className="w-full rounded border border-gray-300">
        {/* Grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={(i / 10) * height}
            x2={width}
            y2={(i / 10) * height}
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        ))}

        {/* Data line */}
        <path d={pathData} fill="none" stroke="#2196F3" strokeWidth="2" />

        {/* Moving average */}
        {movingAvg
          .filter(Boolean)
          .map(
            (point, i) =>
              point && (
                <circle
                  key={`avg-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  fill="#FF5722"
                />
              ),
          )}

        {/* Data points */}
        {points.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="3" fill="#2196F3" />
        ))}
      </svg>

      <div className="mt-4 flex gap-6 text-sm text-gray-700">
        <div>
          <span style={{ color: "#2196F3" }}>●</span> Data Points
        </div>
        <div>
          <span style={{ color: "#FF5722" }}>●</span> Moving Average (window=
          {window})
        </div>
      </div>
    </div>
  );
}
