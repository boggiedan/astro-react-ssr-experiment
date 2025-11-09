/**
 * Render-Only Worker Middleware for Astro
 *
 * This middleware routes rendering to worker threads while keeping
 * all HTTP handling on the main thread.
 *
 * Architecture:
 * - Main thread: HTTP server, routing, Request creation, Response writing
 * - Worker threads: ONLY app.render() execution
 *
 * Integration approach:
 * 1. Main thread creates Request and matches route
 * 2. Main thread extracts minimal data for rendering
 * 3. Worker receives minimal RenderInput and calls app.render()
 * 4. Worker returns minimal RenderOutput
 * 5. Main thread reconstructs Response and writes to client
 */

import type { App } from "astro/app";
import { NodeApp } from "astro/app/node";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getWorkerPool } from "./worker-pool.js";
import {
  createRenderInput,
  createResponseFromOutput,
} from "./serialize.js";

export interface WorkerMiddlewareOptions {
  /**
   * SSR mode: traditional (main thread) | worker (worker threads) | hybrid (smart routing)
   */
  mode: "traditional" | "worker" | "hybrid";

  /**
   * For hybrid mode: requests with render time below this threshold go to main thread
   */
  hybridThreshold?: number;

  /**
   * Enable detailed logging
   */
  debug?: boolean;
}

/**
 * Create worker-based middleware for Astro
 *
 * This wraps Astro's default handler and routes rendering through workers
 */
export function createWorkerMiddleware(
  app: App,
  options: WorkerMiddlewareOptions = { mode: "traditional" },
) {
  const logger = app.getAdapterLogger();
  const workerPool = getWorkerPool();

  // Track request stats for hybrid mode
  const requestStats = new Map<
    string,
    { count: number; avgDuration: number }
  >();

  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next?: Function,
    locals?: Record<string, any>,
  ) => {
    const startTime = Date.now();

    try {
      // Create Astro request object
      const request = NodeApp.createRequest(req, {
        allowedDomains: app.getAllowedDomains?.() ?? [],
      });

      // Match route
      const routeData = app.match(request, true);

      if (!routeData) {
        // No route match, pass to next handler or render 404
        if (next) {
          return next();
        }
        const response = await app.render(request, { addCookieHeader: true });
        await NodeApp.writeResponse(response, res);
        return;
      }

      // Determine if we should use workers
      const useWorker = shouldUseWorker(
        options.mode,
        request.url,
        requestStats,
      );

      if (options.debug) {
        const routeType = getRouteType(request.url);
        logger.info(
          `[${useWorker ? "WORKER" : "MAIN"}] ${routeType} - ${request.url}`,
        );
      }

      let response: Response;

      if (useWorker && options.mode !== "traditional") {
        // Try to render in worker thread
        try {
          response = await renderInWorker(
            app,
            request,
            locals,
            routeData,
            workerPool,
          );
        } catch (error) {
          // Fallback to main thread if worker pool fails (queue full, etc.)
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('Task queue is at limit')) {
            if (options.debug) {
              logger.warn(`Worker queue full, falling back to main thread`);
            }
            response = await app.render(request, {
              addCookieHeader: true,
              locals,
              routeData,
            });
          } else {
            throw error;
          }
        }
      } else {
        // Render on main thread (traditional)
        response = await app.render(request, {
          addCookieHeader: true,
          locals,
          routeData,
        });
      }

      // Track stats for hybrid mode
      const duration = Date.now() - startTime;
      if (options.mode === "hybrid") {
        updateRequestStats(request.url, duration, requestStats);
      }

      // Write response
      await NodeApp.writeResponse(response, res);

      if (options.debug) {
        logger.info(`Rendered ${request.url} in ${duration}ms`);
      }
    } catch (error) {
      logger.error(`Error rendering ${req.url}: ${error}`);
      console.error(error);

      if (!res.headersSent) {
        res.writeHead(500, "Server error");
        res.end();
      }
    }
  };
}

/**
 * Render a request in a worker thread
 *
 * Main thread responsibilities:
 * - Extract minimal data from Request
 * - Send to worker for rendering
 * - Reconstruct Response from minimal output
 *
 * Worker responsibilities:
 * - ONLY execute app.render()
 */
async function renderInWorker(
  _app: App,
  request: Request,
  locals: Record<string, any> | undefined,
  _routeData: any,
  workerPool: any,
): Promise<Response> {
  // Create minimal input for worker (just the data needed for rendering)
  const renderInput = await createRenderInput(request, locals);

  // Send to worker - worker ONLY does app.render()
  const renderOutput = await workerPool.render(renderInput);

  // Reconstruct Response from minimal output
  return createResponseFromOutput(renderOutput);
}

/**
 * Determine if a request should use workers
 *
 * Hybrid mode uses intelligent routing:
 * - I/O-heavy routes → main thread (avoid serialization overhead)
 * - CPU-intensive routes → workers (parallel processing)
 * - Simple routes → workers (fast parallel rendering)
 * - Unknown routes → adaptive based on statistics
 */
function shouldUseWorker(
  mode: "traditional" | "worker" | "hybrid",
  url: string,
  stats: Map<string, { count: number; avgDuration: number }>,
): boolean {
  if (mode === "traditional") return false;

  // Always render metrics endpoint on main thread so it can access the worker pool instance
  if (url.includes('/api/metrics')) return false;

  if (mode === "worker") return true;

  // Hybrid mode: intelligent routing based on workload type

  // 1. I/O-heavy routes → main thread
  // These routes spend most time waiting on external APIs, not rendering
  // Worker overhead (serialization) outweighs benefits
  if (isIOHeavyRoute(url)) {
    return false;
  }

  // 2. CPU-intensive routes → always use workers
  // These routes benefit from parallel processing across cores
  if (isCPUIntensiveRoute(url)) {
    return true;
  }

  // 3. Simple/fast routes → use workers
  // They render quickly and benefit from parallelism
  if (isSimpleRoute(url)) {
    return true;
  }

  // 4. Unknown routes → adaptive based on statistics
  const stat = stats.get(url);
  if (!stat) {
    // First request: default to worker
    return true;
  }

  // After collecting stats, decide based on average duration
  // Routes with moderate duration (50-200ms) benefit from workers
  // Very fast routes (< 50ms) might have more overhead
  // Very slow routes (> 200ms) are likely I/O-bound
  if (stat.avgDuration < 50) {
    return false; // Too fast, overhead not worth it
  }

  if (stat.avgDuration > 200) {
    return false; // Likely I/O-bound, keep on main thread
  }

  return true; // Sweet spot for workers
}

/**
 * Detect I/O-heavy routes that should stay on main thread
 */
function isIOHeavyRoute(url: string): boolean {
  return (
    url.includes('/api/') ||           // API endpoints
    url.includes('/test/api-heavy') || // API-heavy test page
    url.includes('/test/mixed')        // Mixed workload (has API calls)
  );
}

/**
 * Detect CPU-intensive routes that benefit from workers
 */
function isCPUIntensiveRoute(url: string): boolean {
  return (
    url.includes('/test/cpu-intensive') || // Heavy analytics dashboard
    url.includes('/benchmark-results')     // Results visualization
  );
}

/**
 * Detect simple routes that benefit from parallel rendering
 */
function isSimpleRoute(url: string): boolean {
  return (
    url.includes('/test/simple') ||  // Simple test page
    url === '/'                       // Home page
  );
}

/**
 * Get route type for logging
 */
function getRouteType(url: string): string {
  if (url.includes('/api/metrics')) return 'METRICS';
  if (isIOHeavyRoute(url)) return 'I/O-HEAVY';
  if (isCPUIntensiveRoute(url)) return 'CPU-INTENSIVE';
  if (isSimpleRoute(url)) return 'SIMPLE';
  return 'ADAPTIVE';
}

/**
 * Update request statistics for hybrid mode
 */
function updateRequestStats(
  url: string,
  duration: number,
  stats: Map<string, { count: number; avgDuration: number }>,
): void {
  const existing = stats.get(url);

  if (!existing) {
    stats.set(url, { count: 1, avgDuration: duration });
  } else {
    // Rolling average
    const newCount = existing.count + 1;
    const newAvg =
      (existing.avgDuration * existing.count + duration) / newCount;

    stats.set(url, { count: newCount, avgDuration: newAvg });
  }

  // Cleanup old stats (keep only recent 100 unique URLs)
  if (stats.size > 100) {
    const firstKey = stats.keys().next().value;
    if (firstKey) {
      stats.delete(firstKey);
    }
  }
}

export type { App };
