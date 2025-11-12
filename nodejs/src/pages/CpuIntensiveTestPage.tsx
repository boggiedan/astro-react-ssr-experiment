import React from 'react';
import { renderToString } from 'react-dom/server';
import Layout from '../components/Layout.js';
import Header from '../components/Header.js';
import ComplexChart from '../components/ComplexChart.js';
import DataProcessor from '../components/DataProcessor.js';

/**
 * CPU-Intensive SSR Test Page Renderer
 */
export function renderCpuIntensiveTestPage(data: any, ctx: any): string {
  const { dataset, processed, chartData, statistics, renderTime } = data;

  const content = (
    <Layout title="CPU-Intensive SSR Test">
      <div className="min-h-screen bg-gray-50">
        <Header
          title="CPU-Intensive SSR Test"
          subtitle="Heavy computation and data processing"
        />

        <main className="container mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Test Information</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Test Type</p>
                <p className="text-lg font-semibold text-blue-700">CPU-Intensive</p>
              </div>
              <div className="rounded bg-green-50 p-4">
                <p className="text-sm text-gray-600">Complexity</p>
                <p className="text-lg font-semibold text-green-700">High</p>
              </div>
              <div className="rounded bg-purple-50 p-4">
                <p className="text-sm text-gray-600">Data Points</p>
                <p className="text-lg font-semibold text-purple-700">2,500</p>
              </div>
              <div className="rounded bg-orange-50 p-4">
                <p className="text-sm text-gray-600">Render Time</p>
                <p className="text-lg font-semibold text-orange-700">{renderTime}ms</p>
              </div>
              <div className="rounded bg-red-50 p-4">
                <p className="text-sm text-gray-600">CPU Usage</p>
                <p className="text-lg font-semibold text-red-700">High</p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-bold">Statistical Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Count:</span>
                  <span className="font-semibold">{statistics.count}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Mean:</span>
                  <span className="font-semibold">{statistics.mean.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Std Dev:</span>
                  <span className="font-semibold">{statistics.stdDev.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Range:</span>
                  <span className="font-semibold">
                    {statistics.min.toFixed(2)} - {statistics.max.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Median:</span>
                  <span className="font-semibold">{statistics.median.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outliers:</span>
                  <span className="font-semibold text-red-600">{statistics.outliers}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-bold">Processing Summary</h3>
              <div className="space-y-3">
                <div className="rounded bg-blue-50 p-3">
                  <p className="text-sm text-gray-600">Original Dataset</p>
                  <p className="text-2xl font-bold text-blue-700">{dataset.length}</p>
                </div>
                <div className="rounded bg-green-50 p-3">
                  <p className="text-sm text-gray-600">Processed Items</p>
                  <p className="text-2xl font-bold text-green-700">{processed.length}</p>
                </div>
                <div className="rounded bg-purple-50 p-3">
                  <p className="text-sm text-gray-600">Chart Points</p>
                  <p className="text-2xl font-bold text-purple-700">{chartData.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <ComplexChart data={chartData} />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <DataProcessor items={processed} />
          </div>

          <div className="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Total server render time: {renderTime}ms</p>
            <p>Data processing + chart generation + component rendering</p>
            <p>Rendered at: {new Date().toISOString()}</p>
          </div>
        </main>
      </div>
    </Layout>
  );

  return '<!DOCTYPE html>' + renderToString(content);
}