import { renderToString } from 'preact-render-to-string';
import Layout from '../components/Layout.js';

const testScenarios = [
  {
    name: "Simple SSR",
    path: "/test/simple",
    description: "Baseline Preact component rendering with minimal complexity",
    complexity: "Low",
    apiCalls: 0,
    expectedTime: "10-20ms",
    color: "blue",
  },
  {
    name: "API-Heavy",
    path: "/test/api-heavy",
    description: "Multiple sequential API calls simulating I/O-bound scenarios",
    complexity: "I/O Bound",
    apiCalls: 3,
    expectedTime: "150-450ms",
    color: "green",
  },
  {
    name: "CPU-Intensive",
    path: "/test/cpu-intensive",
    description: "Heavy analytics dashboard (2500 items, statistics, trend calculations)",
    complexity: "High",
    apiCalls: 0,
    expectedTime: "200-500ms",
    color: "purple",
  },
  {
    name: "Mixed Scenario",
    path: "/test/mixed",
    description: "Real-world combination of API calls (30%) and CPU work (70%)",
    complexity: "Mixed",
    apiCalls: 1,
    expectedTime: "150-400ms",
    color: "red",
  },
];

/**
 * Home Page Renderer
 */
export function renderHomePage(data: any, ctx: any): string {
  const content = (
    <Layout title="Node.js Preact SSR Experiment">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <header className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-900">
              Node.js Preact SSR <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Worker Experiment</span>
            </h1>
            <p className="mb-6 text-xl text-gray-600">
              Performance testing framework for worker-based vs traditional SSR
            </p>
            <div className="flex justify-center gap-4">
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                <span className="text-sm text-gray-600">Scenarios:</span>
                <span className="ml-2 text-lg font-bold text-blue-600">{testScenarios.length}</span>
              </div>
              <div className="rounded-lg bg-white px-4 py-2 shadow">
                <span className="text-sm text-gray-600">Framework:</span>
                <span className="ml-2 text-lg font-bold text-purple-600">Node.js + Preact</span>
              </div>
            </div>
          </header>

          <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testScenarios.map((scenario) => (
              <a
                key={scenario.path}
                href={scenario.path}
                className="group overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className={`h-2 bg-${scenario.color}-500`} />
                <div className="p-6">
                  <h3 className="mb-2 text-2xl font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                    {scenario.name}
                  </h3>
                  <p className="mb-4 text-sm text-gray-600">{scenario.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Complexity:</span>
                      <span className={`text-sm font-semibold text-${scenario.color}-600`}>
                        {scenario.complexity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">API Calls:</span>
                      <span className="text-sm font-semibold">
                        {scenario.apiCalls}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Expected Time:</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {scenario.expectedTime}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      Run Test →
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="mb-8 rounded-xl bg-white p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              About This Experiment
            </h2>
            <div className="prose prose-blue max-w-none">
              <p className="text-gray-700">
                This project tests the performance impact of using worker threads
                for server-side rendering with Preact. Inspired by Wix
                Engineering's success (70% reduction in server pods, 153% RPM
                improvement), we're evaluating whether similar gains are achievable
                with vanilla Node.js + Preact SSR.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="mb-2 font-bold text-blue-900">Traditional Mode</h4>
                  <p className="text-sm text-blue-800">
                    Single-threaded SSR on main event loop
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <h4 className="mb-2 font-bold text-purple-900">Worker Mode</h4>
                  <p className="text-sm text-purple-800">
                    Multi-threaded SSR with worker pool
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <h4 className="mb-2 font-bold text-green-900">Hybrid Mode</h4>
                  <p className="text-sm text-green-800">
                    Smart routing based on workload type
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );

  return '<!DOCTYPE html>' + renderToString(content);
}