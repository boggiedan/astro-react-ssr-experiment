import { useState } from "react";

interface BenchmarkRun {
  testType: string;
  timestamp: string;
  config: {
    duration: number;
    connections: number;
  };
  baseUrl: string;
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

interface MonitorRun {
  pid: number;
  timestamp: string;
  config: {
    interval: number;
    duration: number;
  };
  stats: {
    cpu: {
      mean: string;
      min: string;
      max: string;
      p50: string;
      p95: string;
      p99: string;
    };
    memory: {
      mean: string;
      min: string;
      max: string;
      p50: string;
      p95: string;
      p99: string;
    };
    samples: number;
  };
}

interface FullTestRun {
  testType: string;
  timestamp: string;
  benchmark: BenchmarkRun;
  monitor: MonitorRun;
  summary: {
    testDuration: string;
    scenarios: number;
    totalRequests: number;
    avgRequestsPerSec: string;
    systemCpu: {
      mean: string;
      max: string;
      p95: string;
    };
    systemMemory: {
      mean: string;
      max: string;
      p95: string;
    };
  };
}

interface BenchmarkViewerProps {
  benchmarkRuns: BenchmarkRun[];
  monitorRuns: MonitorRun[];
  fullTestRuns: FullTestRun[];
}

export default function BenchmarkViewer({
  benchmarkRuns,
  monitorRuns,
  fullTestRuns,
}: BenchmarkViewerProps) {
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);
  const [selectedFullTestIndex, setSelectedFullTestIndex] = useState(0);
  const selectedRun = benchmarkRuns[selectedRunIndex];
  const selectedFullTest = fullTestRuns[selectedFullTestIndex];

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

  return (
    <div>
      {/* Full Test Results (Benchmark + Monitor Combined) */}
      {fullTestRuns.length > 0 && (
        <div className="mb-8 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 p-6 shadow-xl text-white">
          <h2 className="mb-4 text-2xl font-bold">
            🏆 Complete Performance Tests (Benchmark + System Monitor)
          </h2>

          {/* Full Test Selector */}
          {fullTestRuns.length > 1 && (
            <div className="mb-6">
              <p className="mb-2 text-sm opacity-90">
                {fullTestRuns.length} complete test{fullTestRuns.length > 1 ? "s" : ""} available
              </p>
              <select
                value={selectedFullTestIndex}
                onChange={(e) => setSelectedFullTestIndex(parseInt(e.target.value))}
                className="w-full rounded-lg bg-white px-4 py-2 text-gray-800 md:w-auto"
              >
                {fullTestRuns.map((test, index) => (
                  <option key={index} value={index}>
                    {index === 0 ? "Latest" : `Test #${fullTestRuns.length - index}`} - {formatDate(test.timestamp)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-lg">
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-3xl font-bold text-blue-600">{selectedFullTest.summary.totalRequests.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-lg">
              <p className="text-sm text-gray-600">Avg Req/sec</p>
              <p className="text-3xl font-bold text-purple-600">{selectedFullTest.summary.avgRequestsPerSec}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-lg">
              <p className="text-sm text-gray-600">CPU (Mean)</p>
              <p className="text-3xl font-bold text-orange-600">{selectedFullTest.summary.systemCpu.mean}%</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-lg">
              <p className="text-sm text-gray-600">Memory (Mean)</p>
              <p className="text-3xl font-bold text-green-600">{selectedFullTest.summary.systemMemory.mean}MB</p>
            </div>
          </div>

          {/* Combined Performance + System Stats */}
          <div className="rounded-lg bg-white p-6 text-gray-800">
            <h3 className="mb-4 text-xl font-bold">Performance & Resource Correlation</h3>

            {/* Table with both benchmark and system stats */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Scenario</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Req/s</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">P95 Latency</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedFullTest.benchmark.results.map((result: BenchmarkResult) => (
                    <tr key={result.scenario} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{result.scenario}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${getPerformanceColor(result.metrics.requests.mean, "requests")}`}>
                        {result.metrics.requests.mean.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right ${getPerformanceColor(result.metrics.latency.p95, "latency")}`}>
                        {result.metrics.latency.p95.toFixed(2)}ms
                      </td>
                      <td className={`px-4 py-3 text-right ${result.metrics.errors > 0 ? "font-bold text-red-600" : "text-gray-600"}`}>
                        {result.metrics.errors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* System Resource Summary */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-3 font-semibold text-gray-800">CPU Usage During Test</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean:</span>
                    <span className="font-semibold text-blue-600">{selectedFullTest.summary.systemCpu.mean}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">P95:</span>
                    <span className="font-semibold text-yellow-600">{selectedFullTest.summary.systemCpu.p95}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max:</span>
                    <span className="font-semibold text-red-600">{selectedFullTest.summary.systemCpu.max}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-purple-50 p-4">
                <h4 className="mb-3 font-semibold text-gray-800">Memory Usage During Test</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean:</span>
                    <span className="font-semibold text-blue-600">{selectedFullTest.summary.systemMemory.mean}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">P95:</span>
                    <span className="font-semibold text-yellow-600">{selectedFullTest.summary.systemMemory.p95}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max:</span>
                    <span className="font-semibold text-red-600">{selectedFullTest.summary.systemMemory.max}MB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm">
              <p className="font-semibold text-green-800">✓ This test captured both performance metrics and system resource usage simultaneously</p>
              <p className="mt-1 text-green-700">
                Duration: {selectedFullTest.summary.testDuration}s |
                Scenarios: {selectedFullTest.summary.scenarios} |
                PID: {selectedFullTest.monitor.pid}
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
              key={index}
              onClick={() => setSelectedRunIndex(index)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                index === selectedRunIndex
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-lg font-bold ${
                    index === selectedRunIndex
                      ? "text-blue-700"
                      : "text-gray-800"
                  }`}
                >
                  {index === 0 ? "Latest" : `Run #${benchmarkRuns.length - index}`}
                </span>
                {index === selectedRunIndex && (
                  <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                    Selected
                  </span>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p>{formatDate(run.timestamp)}</p>
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
      <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {selectedRunIndex === 0
              ? "Latest Run"
              : `Run #${benchmarkRuns.length - selectedRunIndex}`}{" "}
            Details
          </h2>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            {formatDate(selectedRun.timestamp)}
          </span>
        </div>

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

      {/* Monitor Results */}
      {monitorRuns.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">
            Resource Monitoring
          </h2>
          {monitorRuns.map((monitor: MonitorRun) => (
            <div
              key={monitor.timestamp}
              className="mb-4 rounded-lg border border-gray-200 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  PID: {monitor.pid}
                </h3>
                <span className="text-sm text-gray-600">
                  {formatDate(monitor.timestamp)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* CPU Stats */}
                <div>
                  <h4 className="mb-3 font-semibold text-gray-700">
                    CPU Usage
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Mean:</span>
                      <span className="font-semibold text-blue-600">
                        {monitor.stats.cpu.mean}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">P95:</span>
                      <span className="font-semibold text-yellow-600">
                        {monitor.stats.cpu.p95}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Max:</span>
                      <span className="font-semibold text-red-600">
                        {monitor.stats.cpu.max}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Memory Stats */}
                <div>
                  <h4 className="mb-3 font-semibold text-gray-700">
                    Memory Usage
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Mean:</span>
                      <span className="font-semibold text-blue-600">
                        {monitor.stats.memory.mean} MB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">P95:</span>
                      <span className="font-semibold text-yellow-600">
                        {monitor.stats.memory.p95} MB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Max:</span>
                      <span className="font-semibold text-red-600">
                        {monitor.stats.memory.max} MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                {monitor.stats.samples} samples collected
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}