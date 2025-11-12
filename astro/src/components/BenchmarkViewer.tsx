import { useRef, useState } from "react";

interface ServerInfo {
  mode: string;
  debug?: boolean;
  runtime?: string; // 'Astro', 'Node.js', or 'PHP'
  framework?: string; // 'vanilla' for vanilla Node.js
  deployment?: {
    type: string;
    replicas: number;
    multiInstance: boolean;
  };
  nodeVersion?: string; // For Node.js/Astro
  phpVersion?: string; // For PHP
  platform: string;
  cpuCores: number;
  timestamp: string;
}

interface BenchmarkRun {
  testType: string;
  timestamp: string;
  config: {
    duration: number;
    connections: number;
  };
  baseUrl: string;
  serverInfo?: ServerInfo | null;
  totalDuration: string;
  results: BenchmarkResult[];
}

interface BenchmarkResult {
  scenario: string;
  url: string;
  description: string;
  expectedRT: string;
  timestamp: string;
  config: {
    duration: number;
    connections: number;
  };
  metrics: {
    requests: {
      total: number;
      average: number;
      mean: number;
    };
    throughput: {
      total: number;
      average: number;
      mean: number;
    };
    latency: {
      mean: number;
      stddev: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      p999: number;
      min: number;
      max: number;
    };
    errors: number;
    timeouts: number;
    non2xx: number;
  };
}

interface BenchmarkViewerProps {
  benchmarkRuns: BenchmarkRun[];
}

export default function BenchmarkViewer({
  benchmarkRuns,
}: BenchmarkViewerProps) {
  const detailsRef = useRef<HTMLDivElement>(null);
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);

  // Ensure selectedRunIndex is valid
  const validIndex = Math.min(selectedRunIndex, benchmarkRuns.length - 1);
  const selectedRun = benchmarkRuns[validIndex];

  function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleString();
  }

  function getPerformanceColor(value: number, metric: string) {
    if (metric === "latency") {
      if (value < 50) return "text-green-600";
      if (value < 200) return "text-yellow-600";
      return "text-red-600";
    }
    if (metric === "requests") {
      if (value > 200) return "text-green-600";
      if (value > 50) return "text-yellow-600";
      return "text-red-600";
    }
    return "text-gray-700";
  }

  function getRuntimeDisplay(serverInfo: ServerInfo) {
    if (serverInfo.runtime === "PHP" || serverInfo.phpVersion) {
      return "PHP";
    }

    if (serverInfo.runtime === "Astro") {
      return `Astro (${serverInfo.framework || "vanilla"})`;
    }

    if (serverInfo.runtime === "Node.js") {
      return `Node.js (${serverInfo.framework || "vanilla"})`;
    }

    return "Unkown";
  }

  if (benchmarkRuns.length === 0) {
    return (
      <div className="rounded-lg bg-yellow-50 p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-yellow-800">
          No Results Yet
        </h2>
        <p className="mb-4 text-yellow-700">
          Run benchmarks to see results here:
        </p>
        <code className="rounded bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
          npm run benchmark
        </code>
      </div>
    );
  }

  // Calculate winners based on composite score (throughput + latency)
  const runsWithScores = benchmarkRuns.map((run, index) => {
    const avgThroughput =
      run.results.reduce((sum, r) => sum + r.metrics.requests.mean, 0) /
      run.results.length;
    const avgMeanLatency =
      run.results.reduce((sum, r) => sum + r.metrics.latency.mean, 0) /
      run.results.length;
    const avgP95Latency =
      run.results.reduce((sum, r) => sum + r.metrics.latency.p95, 0) /
      run.results.length;
    const avgP99Latency =
      run.results.reduce((sum, r) => sum + r.metrics.latency.p99, 0) /
      run.results.length;

    // Composite score: favor high throughput and low latency
    // Throughput is weighted positively, latency negatively
    // Score = (throughput * 10) - (mean_latency / 10) - (p95 / 15) - (p99 / 20)
    const score =
      avgThroughput * 10 -
      avgMeanLatency / 10 -
      avgP95Latency / 15 -
      avgP99Latency / 20;

    return {
      run,
      index,
      avgThroughput,
      avgMeanLatency,
      avgP95Latency,
      avgP99Latency,
      score,
    };
  });

  const sortedByPerformance = [...runsWithScores].sort(
    (a, b) => b.score - a.score,
  );

  // Show min 2, max 4 performers based on available data
  const topCount = Math.min(Math.max(2, benchmarkRuns.length), 8);
  const topPerformers = sortedByPerformance.slice(0, topCount);

  // Medal mapping
  const medals = ["🥇", "🥈", "🥉", "🏅"];
  const borderColors = [
    "border-yellow-400",
    "border-gray-400",
    "border-orange-400",
    "border-blue-400",
  ];
  const bgColors = ["bg-yellow-50", "bg-gray-50", "bg-orange-50", "bg-blue-50"];

  return (
    <div>
      {/* Winners Comparison - Only show if we have at least 2 results */}
      {benchmarkRuns.length >= 2 && (
        <div className="mb-8 rounded-lg border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-6 shadow-lg">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">
              🏆 Top {topCount} Performers
            </h2>
            <p className="text-gray-600">
              Side-by-side comparison of the best performing test runs
            </p>
          </div>

          <div
            className={`grid gap-6 ${topCount === 2 ? "md:grid-cols-2" : topCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}
          >
            {topPerformers.map((item, position) => {
              const { run, index } = item;
              const medal = medals[position];
              const borderColor =
                borderColors[position] || borderColors[borderColors.length - 1];
              const bgColor =
                bgColors[position] || bgColors[bgColors.length - 1];

              return (
                <div
                  key={run.timestamp}
                  className={`rounded-lg border-4 ${borderColor} ${bgColor} p-5 shadow-md`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {medal} {position === 0 ? "Winner" : `#${position + 1}`}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedRunIndex(index);
                        detailsRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                          inline: "nearest",
                        });
                      }}
                      className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      View Full Details
                    </button>
                  </div>

                  {/* Server Info */}
                  {run.serverInfo && (
                    <div className="mb-4 rounded-lg bg-white p-3 shadow-sm">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Mode</p>
                          <p className="font-bold text-gray-900 uppercase">
                            {run.serverInfo.mode}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Runtime</p>
                          <p className="font-bold text-gray-900">
                            {getRuntimeDisplay(run.serverInfo)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {run.serverInfo.phpVersion ||
                              run.serverInfo.nodeVersion}
                          </p>
                        </div>
                        {run.serverInfo.deployment && (
                          <>
                            <div>
                              <p className="text-xs text-gray-500">
                                Deployment
                              </p>
                              <p className="font-bold text-gray-900 uppercase">
                                {run.serverInfo.deployment.type}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Replicas</p>
                              <p className="font-bold text-gray-900">
                                {run.serverInfo.deployment.replicas}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Overall Score */}
                  <div className="mb-4 rounded-lg bg-white p-3 shadow-sm">
                    <p className="mb-1 text-xs text-gray-500">
                      Performance Score
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {item.score.toFixed(0)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Avg Throughput</p>
                        <p className="font-bold text-green-600">
                          {item.avgThroughput.toFixed(1)} req/s
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Mean Latency</p>
                        <p className="font-bold text-blue-600">
                          {item.avgMeanLatency.toFixed(1)}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg P95</p>
                        <p className="font-bold text-orange-600">
                          {item.avgP95Latency.toFixed(1)}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg P99</p>
                        <p className="font-bold text-red-600">
                          {item.avgP99Latency.toFixed(1)}ms
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scenario Results */}
                  <div className="space-y-2">
                    <h4 className="mb-2 text-sm font-semibold text-gray-700">
                      Scenarios:
                    </h4>
                    {run.results.map((result) => (
                      <div
                        key={result.scenario}
                        className="rounded-lg bg-white p-3 shadow-sm"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">
                            {result.scenario}
                          </span>
                          <span className="text-xs text-gray-500">
                            {result.description}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Req/sec</p>
                            <p className="font-bold text-green-600">
                              {result.metrics.requests.mean.toFixed(1)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Mean</p>
                            <p className="font-bold text-blue-600">
                              {result.metrics.latency.mean.toFixed(1)}ms
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">P95</p>
                            <p className="font-bold text-orange-600">
                              {result.metrics.latency.p95.toFixed(1)}ms
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg bg-white p-2 text-center text-xs text-gray-500">
                    {formatDate(run.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scoring Explanation */}
          <div className="mt-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-3 text-lg font-bold text-blue-900">
              📊 How Winners Are Determined
            </h3>
            <div className="space-y-3 text-sm text-blue-800">
              <p>
                Rankings are calculated using a{" "}
                <strong>composite performance score</strong> that balances both
                throughput and latency metrics across all test scenarios.
              </p>

              <div className="rounded-lg bg-white p-4">
                <h4 className="mb-2 font-bold text-blue-900">
                  Scoring Formula:
                </h4>
                <code className="mb-3 block rounded bg-blue-100 p-3 font-mono text-xs text-blue-900">
                  Score = (Throughput × 10) - (Mean Latency ÷ 10) - (P95 Latency
                  ÷ 15) - (P99 Latency ÷ 20)
                </code>

                <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-green-600">✓</span>
                    <div>
                      <strong className="text-green-700">
                        Throughput (×10):
                      </strong>
                      <p className="text-gray-600">
                        Higher requests/sec increases score significantly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">✓</span>
                    <div>
                      <strong className="text-blue-700">
                        Mean Latency (÷10):
                      </strong>
                      <p className="text-gray-600">
                        Lower average response time increases score
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-orange-600">✓</span>
                    <div>
                      <strong className="text-orange-700">
                        P95 Latency (÷15):
                      </strong>
                      <p className="text-gray-600">
                        Better 95th percentile improves score
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-red-600">✓</span>
                    <div>
                      <strong className="text-red-700">
                        P99 Latency (÷20):
                      </strong>
                      <p className="text-gray-600">
                        Better tail latency (99th percentile) helps score
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-blue-700 italic">
                💡 This balanced approach ensures winners excel at both handling
                high traffic volumes (throughput) and maintaining fast response
                times (latency), providing the best overall user experience.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Run Selector */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Select Test Run</h2>
          <span className="text-sm text-gray-500">
            {benchmarkRuns.length} run{benchmarkRuns.length > 1 ? "s" : ""}{" "}
            available
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {benchmarkRuns.map((run, index) => (
            <button
              key={run.timestamp}
              onClick={() => {
                setSelectedRunIndex(index);
              }}
              className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                index === validIndex
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-lg font-bold ${
                    index === validIndex ? "text-blue-700" : "text-gray-800"
                  }`}
                >
                  {index === 0
                    ? "Latest"
                    : `Run #${benchmarkRuns.length - index}`}
                </span>
                {index === validIndex && (
                  <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                    Selected
                  </span>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p>{formatDate(run.timestamp)}</p>
                <p className="font-semibold text-gray-800">
                  {getRuntimeDisplay(run.serverInfo)}
                </p>
                <p>
                  Mode:{" "}
                  <span className="font-medium">
                    {run.serverInfo.mode || "N/A"}
                  </span>
                </p>
                <p>
                  {run.config.duration}s • {run.config.connections} connections
                </p>
                <p>
                  {run.results.length} scenarios • {run.totalDuration}s total
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Run Details */}
      <div ref={detailsRef} className="mb-8 rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {validIndex === 0
              ? "Latest Run"
              : `Run #${benchmarkRuns.length - validIndex}`}{" "}
            Details
          </h2>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            {formatDate(selectedRun.timestamp)}
          </span>
        </div>

        {/* Server Mode Info */}
        {selectedRun.serverInfo && (
          <div className="mb-6 rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-indigo-700 uppercase">
              Server Configuration
            </h3>
            <div
              className={`grid grid-cols-2 gap-3 ${selectedRun.serverInfo.deployment ? "md:grid-cols-5" : "md:grid-cols-4"}`}
            >
              <div>
                <p className="text-xs text-indigo-600">SSR Mode</p>
                <p className="text-lg font-bold text-indigo-900 uppercase">
                  {selectedRun.serverInfo.mode}
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-600">Runtime</p>
                <p className="text-lg font-bold text-indigo-900">
                  {getRuntimeDisplay(selectedRun.serverInfo)}
                </p>
                <p className="text-xs text-indigo-600">
                  {selectedRun.serverInfo.phpVersion ||
                    selectedRun.serverInfo.nodeVersion}
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-600">CPU Cores</p>
                <p className="text-lg font-bold text-indigo-900">
                  {selectedRun.serverInfo.cpuCores}
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-600">Platform</p>
                <p className="text-lg font-bold text-indigo-900">
                  {selectedRun.serverInfo.platform}
                </p>
              </div>
              {selectedRun.serverInfo.deployment && (
                <div>
                  <p className="text-xs text-indigo-600">Deployment</p>
                  <p className="text-lg font-bold text-indigo-900 uppercase">
                    {selectedRun.serverInfo.deployment.type}
                  </p>
                  {selectedRun.serverInfo.deployment.multiInstance && (
                    <p className="text-xs text-indigo-700">
                      {selectedRun.serverInfo.deployment.replicas} replicas
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Config Info */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-600">Duration</p>
            <p className="text-2xl font-bold text-blue-900">
              {selectedRun.config.duration}s
            </p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <p className="text-sm text-purple-600">Connections</p>
            <p className="text-2xl font-bold text-purple-900">
              {selectedRun.config.connections}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-600">Tests Run</p>
            <p className="text-2xl font-bold text-green-900">
              {selectedRun.results.length}
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-sm text-orange-600">Total Time</p>
            <p className="text-2xl font-bold text-orange-900">
              {selectedRun.totalDuration}s
            </p>
          </div>
        </div>

        {/* Performance Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Scenario
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Expected
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Req/sec
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Mean
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  P95
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  P99
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Errors
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {selectedRun.results.map((result: BenchmarkResult) => (
                <tr key={result.scenario} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {result.scenario}
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {result.expectedRT}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${getPerformanceColor(result.metrics.requests.mean, "requests")}`}
                  >
                    {result.metrics.requests.mean.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${getPerformanceColor(result.metrics.latency.mean, "latency")}`}
                  >
                    {result.metrics.latency.mean.toFixed(2)}ms
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${getPerformanceColor(result.metrics.latency.p95, "latency")}`}
                  >
                    {result.metrics.latency.p95.toFixed(2)}ms
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${getPerformanceColor(result.metrics.latency.p99, "latency")}`}
                  >
                    {result.metrics.latency.p99.toFixed(2)}ms
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${result.metrics.errors > 0 ? "font-bold text-red-600" : "text-gray-600"}`}
                  >
                    {result.metrics.errors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual Performance Bars */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">
            Throughput Comparison
          </h3>
          <div className="space-y-3">
            {selectedRun.results.map((result: BenchmarkResult) => {
              const maxReq = Math.max(
                ...selectedRun.results.map((r) => r.metrics.requests.mean),
              );
              const percentage = (result.metrics.requests.mean / maxReq) * 100;

              return (
                <div key={result.scenario}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {result.scenario}
                    </span>
                    <span className="text-gray-600">
                      {result.metrics.requests.mean.toFixed(2)} req/s
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-lg bg-gray-200">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latency Distribution */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">
            Latency Distribution
          </h3>
          {selectedRun.results.map((result: BenchmarkResult) => (
            <div
              key={result.scenario}
              className="mb-4 rounded-lg bg-gray-50 p-4"
            >
              <h4 className="mb-3 font-semibold text-gray-800">
                {result.scenario}
              </h4>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded bg-white p-2 text-center">
                  <p className="text-xs text-gray-500">Min</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {result.metrics.latency.min.toFixed(2)}ms
                  </p>
                </div>
                <div className="rounded bg-white p-2 text-center">
                  <p className="text-xs text-gray-500">P50</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {result.metrics.latency.p50.toFixed(2)}ms
                  </p>
                </div>
                <div className="rounded bg-white p-2 text-center">
                  <p className="text-xs text-gray-500">P95</p>
                  <p className="text-sm font-semibold text-yellow-600">
                    {result.metrics.latency.p95.toFixed(2)}ms
                  </p>
                </div>
                <div className="rounded bg-white p-2 text-center">
                  <p className="text-xs text-gray-500">P99</p>
                  <p className="text-sm font-semibold text-orange-600">
                    {result.metrics.latency.p99.toFixed(2)}ms
                  </p>
                </div>
                <div className="rounded bg-white p-2 text-center">
                  <p className="text-xs text-gray-500">Max</p>
                  <p className="text-sm font-semibold text-red-600">
                    {result.metrics.latency.max.toFixed(2)}ms
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
