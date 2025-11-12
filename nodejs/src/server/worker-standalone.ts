/**
 * Worker for React SSR rendering
 *
 * This file runs in worker threads via Piscina.
 * It handles ONLY the React rendering (renderToString).
 *
 * Architecture:
 * - Main thread: HTTP server, routing, data fetching
 * - Worker thread: ONLY executes renderer functions
 *
 * Key responsibilities:
 * - Load route registry (once per worker)
 * - Receive minimal RenderInput data
 * - Call the appropriate renderer function
 * - Return minimal RenderOutput data
 */

import { threadId } from 'worker_threads';
import type { RenderInput, RenderOutput } from './serialize.js';
import type { RouteDefinition } from '../routes/types.js';
import { createRenderOutput } from './serialize.js';

let routes: RouteDefinition[] | null = null;

/**
 * Initialize routes in this worker thread
 *
 * Routes are loaded once per worker and reused for all renders.
 */
async function initializeRoutes(): Promise<RouteDefinition[]> {
  if (routes) return routes;

  console.log(`[Worker ${threadId}] Loading route registry...`);

  try {
    // Import the route registry
    const { routes: loadedRoutes } = await import('../routes/registry.js');
    routes = loadedRoutes;

    console.log(`[Worker ${threadId}] Loaded ${routes.length} routes`);
    return routes;
  } catch (error) {
    console.error(`[Worker ${threadId}] Failed to load routes:`, error);
    throw error;
  }
}

/**
 * Main render function called by Piscina
 *
 * This is the ONLY job of the worker: render the page and return HTML.
 * All HTTP handling, routing, and data fetching happens on the main thread.
 */
export default async function render(input: RenderInput): Promise<RenderOutput> {
  const startTime = Date.now();

  try {
    // Ensure routes are initialized
    const loadedRoutes = await initializeRoutes();

    // Find the route by name
    const route = loadedRoutes.find(r => r.name === input.routeName);
    if (!route) {
      throw new Error(`Route not found: ${input.routeName}`);
    }

    // Reconstruct context with URL object
    const renderContext = {
      url: new URL(input.context.url),
      timestamp: input.context.timestamp,
    };

    // THIS IS THE ONLY HEAVY WORK: Call the renderer function
    // Everything else (HTTP handling, routing, data fetching) stays on main thread
    const html = await route.renderer(input.data, renderContext);

    const duration = Date.now() - startTime;

    return createRenderOutput(html, duration, threadId);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[Worker ${threadId}] Render failed after ${duration}ms:`,
      errorMessage
    );

    // Return error HTML
    const errorHtml = `<!DOCTYPE html>
<html>
<head><title>500 Error</title></head>
<body>
  <h1>500 Internal Server Error</h1>
  <p>${errorMessage}</p>
</body>
</html>`;

    return createRenderOutput(errorHtml, duration, threadId, errorMessage);
  }
}

/**
 * Health check for this worker
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  workerId: number;
  routesLoaded: boolean;
}> {
  return {
    healthy: routes !== null,
    workerId: threadId,
    routesLoaded: routes !== null,
  };
}

/**
 * Warmup function to preload routes
 */
export async function warmup(): Promise<void> {
  await initializeRoutes();
  console.log(`[Worker ${threadId}] Warmup complete`);
}