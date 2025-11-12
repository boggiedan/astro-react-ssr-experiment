import React from 'react';
import { renderToString } from 'react-dom/server';
import Layout from '../components/Layout.js';
import Header from '../components/Header.js';
import ComplexChart from '../components/ComplexChart.js';

/**
 * Mixed Scenario Test Page Renderer
 */
export function renderMixedTestPage(data: any, ctx: any): string {
  const { processed, chartData, categoryStats, apiTime, cpuTime, totalTime } = data;

  const content = (
    <Layout title="Mixed Scenario Test">
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Mixed Scenario Test"
          subtitle="Realistic combination of API and CPU work"
        />

        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Test Information</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Test Type</p>
                <p className="text-lg font-semibold text-blue-700">Mixed</p>
              </div>
              <div className="rounded bg-green-50 p-4">
                <p className="text-sm text-gray-600">API Time</p>
                <p className="text-lg font-semibold text-green-700">{Math.round(apiTime)}ms</p>
              </div>
              <div className="rounded bg-purple-50 p-4">
                <p className="text-sm text-gray-600">CPU Time</p>
                <p className="text-lg font-semibold text-purple-700">{Math.round(cpuTime)}ms</p>
              </div>
              <div className="rounded bg-orange-50 p-4">
                <p className="text-sm text-gray-600">Total Time</p>
                <p className="text-lg font-semibold text-orange-700">{Math.round(totalTime)}ms</p>
              </div>
              <div className="rounded bg-red-50 p-4">
                <p className="text-sm text-gray-600">Data Points</p>
                <p className="text-lg font-semibold text-red-700">{processed.length}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-3">
            {categoryStats.map((stat: any) => (
              <div key={stat.category} className="rounded-lg bg-white p-5 shadow-lg">
                <h3 className="mb-2 text-lg font-bold text-gray-800">
                  {stat.category}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-semibold">{stat.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-semibold text-blue-600">
                      {stat.avg.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-purple-600">
                      {stat.sum.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${(stat.avg / Math.max(...categoryStats.map((s: any) => s.avg))) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-xl font-bold text-gray-800">Data Visualization</h3>
            <ComplexChart data={chartData} />
          </div>

          <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-xl font-bold text-gray-800">
              Performance Breakdown
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">API Call:</div>
                <div className="flex-1">
                  <div className="relative h-8 rounded-full bg-gray-200">
                    <div
                      className="flex h-8 items-center rounded-full bg-green-500 px-3 text-sm font-semibold text-white"
                      style={{ width: `${(apiTime / totalTime) * 100}%` }}
                    >
                      {Math.round(apiTime)}ms ({Math.round((apiTime / totalTime) * 100)}%)
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">
                  CPU Processing:
                </div>
                <div className="flex-1">
                  <div className="relative h-8 rounded-full bg-gray-200">
                    <div
                      className="flex h-8 items-center rounded-full bg-purple-500 px-3 text-sm font-semibold text-white"
                      style={{ width: `${(cpuTime / totalTime) * 100}%` }}
                    >
                      {Math.round(cpuTime)}ms ({Math.round((cpuTime / totalTime) * 100)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Worker Benefit Analysis:</strong> This page has {Math.round((apiTime / totalTime) * 100)}% I/O time and {Math.round((cpuTime / totalTime) * 100)}% CPU time. Workers will help with the CPU portion but not the I/O portion, so expect ~{Math.round((cpuTime / totalTime) * 50)}% improvement at best.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-xl font-bold text-gray-800">Top Items</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {processed.slice(0, 20).map((item: any) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-3 text-center">
                  <div className="text-xs font-bold text-gray-500">#{item.rank}</div>
                  <div className="my-1 text-sm font-semibold">{item.label}</div>
                  <div className="text-lg font-bold text-blue-600">
                    {item.value.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">{item.category}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Total server render time: {Math.round(totalTime)}ms</p>
            <p>API time: {Math.round(apiTime)}ms | CPU time: {Math.round(cpuTime)}ms</p>
            <p>Rendered at: {new Date().toISOString()}</p>
          </div>
        </main>
      </div>
    </Layout>
  );

  return '<!DOCTYPE html>' + renderToString(content);
}