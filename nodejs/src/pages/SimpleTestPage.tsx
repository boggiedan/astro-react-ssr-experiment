import React from 'react';
import { renderToString } from 'react-dom/server';
import Layout from '../components/Layout.js';
import Header from '../components/Header.js';
import SimpleReact from '../components/SimpleReact.js';

/**
 * Simple SSR Test Page Renderer
 */
export function renderSimpleTestPage(data: any, ctx: any): string {
  const startTime = Date.now();

  const content = (
    <Layout title="Simple SSR Test">
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Simple SSR Test"
          subtitle="Baseline React component rendering"
        />

        <main className="container mx-auto max-w-4xl px-4 py-8">
          <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Test Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Test Type</p>
                <p className="text-lg font-semibold text-blue-700">Simple SSR</p>
              </div>
              <div className="rounded bg-green-50 p-4">
                <p className="text-sm text-gray-600">Complexity</p>
                <p className="text-lg font-semibold text-green-700">Low</p>
              </div>
              <div className="rounded bg-purple-50 p-4">
                <p className="text-sm text-gray-600">API Calls</p>
                <p className="text-lg font-semibold text-purple-700">0</p>
              </div>
              <div className="rounded bg-orange-50 p-4">
                <p className="text-sm text-gray-600">Expected Time</p>
                <p className="text-lg font-semibold text-orange-700">10-20ms</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <SimpleReact
              message="Hello from Simple SSR Test!"
              count={100}
            />
          </div>

          <div className="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Server render time: {Date.now() - startTime}ms</p>
            <p>Rendered at: {new Date().toISOString()}</p>
          </div>
        </main>
      </div>
    </Layout>
  );

  return '<!DOCTYPE html>' + renderToString(content);
}