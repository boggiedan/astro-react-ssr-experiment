import { renderToString } from 'preact-render-to-string';
import Layout from '../components/Layout.js';
import Header from '../components/Header.js';
import DataDisplay from '../components/DataDisplay.js';

/**
 * API-Heavy SSR Test Page Renderer
 */
export function renderApiHeavyTestPage(data: any, ctx: any): string {
  const { user, posts, comments, renderTime } = data;

  const content = (
    <Layout title="API-Heavy SSR Test">
      <div className="min-h-screen bg-gray-50">
        <Header
          title="API-Heavy SSR Test"
          subtitle="Multiple sequential API calls"
        />

        <main className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Test Information</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded bg-blue-50 p-4">
                <p className="text-sm text-gray-600">Test Type</p>
                <p className="text-lg font-semibold text-blue-700">API-Heavy</p>
              </div>
              <div className="rounded bg-green-50 p-4">
                <p className="text-sm text-gray-600">Complexity</p>
                <p className="text-lg font-semibold text-green-700">I/O Bound</p>
              </div>
              <div className="rounded bg-purple-50 p-4">
                <p className="text-sm text-gray-600">API Calls</p>
                <p className="text-lg font-semibold text-purple-700">3</p>
              </div>
              <div className="rounded bg-orange-50 p-4">
                <p className="text-sm text-gray-600">Render Time</p>
                <p className="text-lg font-semibold text-orange-700">{renderTime}ms</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <DataDisplay
              user={user}
              posts={posts}
              comments={comments}
            />
          </div>

          <div className="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-600">
            <p>Total server render time: {renderTime}ms</p>
            <p>Expected: ~450ms (100ms + 150ms + 200ms for parallel fetches)</p>
            <p>Rendered at: {new Date().toISOString()}</p>
          </div>
        </main>
      </div>
    </Layout>
  );

  return '<!DOCTYPE html>' + renderToString(content);
}