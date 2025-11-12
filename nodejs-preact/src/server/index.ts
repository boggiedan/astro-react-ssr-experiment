/**
 * Main HTTP Server
 *
 * Orchestrates the 3-layer architecture:
 * 1. Route matching
 * 2. Data fetching (main thread)
 * 3. Rendering (main thread or worker)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { matchRoute } from '../routes/matcher.js';
import { fetchDataForRoute } from './data-engine.js';
import { renderRoute } from './render-engine.js';
import { serveStaticFile } from './static.js';
import { handleApiRequest } from '../api/index.js';
import { routes } from '../routes/registry.js';
import { initializeWorkerPool, getWorkerPool, shutdownWorkerPool } from './worker-pool.js';
import { createRenderInput } from './serialize.js';

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const SSR_MODE = (process.env.SSR_MODE || 'traditional') as 'traditional' | 'worker';

console.log('\n🚀 Starting Node.js React SSR Server');
console.log('═'.repeat(60));
console.log(`Mode: ${SSR_MODE.toUpperCase()}`);
console.log(`Port: ${PORT}`);
console.log(`Host: ${HOST}`);
console.log('═'.repeat(60) + '\n');

// Initialize worker pool if in worker mode
if (SSR_MODE === 'worker') {
  console.log('Initializing worker pool for SSR...\n');
  await initializeWorkerPool();
  console.log();
}

/**
 * Main request handler
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    // Try to serve static files first
    const staticServed = await serveStaticFile(req, res);
    if (staticServed) {
      return;
    }

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(req, res);
    }

    // ── Layer 1: Route Matching ──
    const matched = matchRoute(url.pathname, routes);

    if (!matched) {
      return send404(res, url.pathname);
    }

    const { route } = matched;
    const startTime = Date.now();

    // ── Layer 2: Data Fetching (Main Thread - I/O) ──
    const fetchResult = await fetchDataForRoute(route, url, {
      url,
      headers: req.headers as Record<string, string>,
      apiBaseUrl: process.env.INTERNAL_API_URL || `http://localhost:${PORT}`,
      request: req
    });

    if (fetchResult.error) {
      return send500(res, fetchResult.error);
    }

    // ── Layer 3: Rendering (Main Thread or Worker) ──
    let renderResult;

    if (SSR_MODE === 'worker') {
      // Worker mode: Send rendering to worker thread
      const workerPool = getWorkerPool();
      const renderInput = createRenderInput(route, fetchResult.data, {
        url,
        timestamp: Date.now()
      });

      const workerOutput = await workerPool.render(renderInput);

      if (workerOutput.error) {
        return send500(res, new Error(workerOutput.error));
      }

      renderResult = {
        html: workerOutput.html,
        duration: workerOutput.duration,
        error: undefined
      };
    } else {
      // Traditional mode: Render on main thread
      renderResult = await renderRoute({
        route,
        data: fetchResult.data,
        context: {
          url,
          timestamp: Date.now()
        }
      });

      if (renderResult.error) {
        return send500(res, renderResult.error);
      }
    }

    // ── Send Response ──
    const totalDuration = Date.now() - startTime;

    console.log(
      `[${url.pathname}] ` +
      `Fetch: ${fetchResult.duration}ms | ` +
      `Render: ${renderResult.duration}ms | ` +
      `Total: ${totalDuration}ms`
    );

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(renderResult.html)
    });
    res.end(renderResult.html);

  } catch (error) {
    console.error('[Server] Unhandled error:', error);
    if (!res.headersSent) {
      send500(res, error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Send 404 Not Found
 */
function send404(res: ServerResponse, pathname: string): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>404 Not Found</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
    }
    h1 { color: #ef4444; }
  </style>
</head>
<body>
  <h1>404 Not Found</h1>
  <p>The page <code>${pathname}</code> was not found.</p>
  <p><a href="/">Go to homepage</a></p>
</body>
</html>`;

  res.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html)
  });
  res.end(html);
}

/**
 * Send 500 Internal Server Error
 */
function send500(res: ServerResponse, error: Error): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>500 Internal Server Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    h1 { color: #ef4444; }
    pre {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>500 Internal Server Error</h1>
  <p>${error.message}</p>
  <pre>${error.stack || ''}</pre>
</body>
</html>`;

  res.writeHead(500, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html)
  });
  res.end(html);
}

/**
 * Create and start server
 */
const server = createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`\n✅ Server running!`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Network: http://${HOST}:${PORT}`);
  console.log(`\n   Registered routes: ${routes.length}`);
  routes.forEach(route => {
    console.log(`   - ${route.name} (${route.meta?.type || 'unknown'})`);
  });
  console.log('\n   Press Ctrl+C to stop\n');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function shutdown(signal: string): Promise<void> {
  console.log(`\n\n📛 Received ${signal}, shutting down gracefully...`);

  // Shutdown worker pool first if in worker mode
  if (SSR_MODE === 'worker') {
    try {
      await shutdownWorkerPool();
    } catch (error) {
      console.error('Error shutting down worker pool:', error);
    }
  }

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown');
    process.exit(1);
  }, 10000);
}