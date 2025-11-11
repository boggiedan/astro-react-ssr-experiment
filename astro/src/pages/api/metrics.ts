/**
 * Worker Metrics API Endpoint
 *
 * GET /api/metrics
 *
 * Returns current worker pool statistics and performance metrics.
 * This endpoint is useful for monitoring and debugging worker-based SSR.
 */

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    // Check if we're running in worker mode
    const ssrMode = process.env.SSR_MODE || "traditional";

    if (ssrMode === "traditional") {
      return new Response(
        JSON.stringify({
          mode: "traditional",
          message: "Worker pool not active in traditional mode",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Dynamic import to avoid errors when worker-pool isn't initialized
    // The worker pool instance is shared via a global variable
    const { getWorkerPool } = await import("../../server/worker-pool");
    const pool = getWorkerPool();

    // Get pool status and metrics
    const status = pool.getStatus();
    const metrics = pool.getMetrics();
    const isHealthy = pool.isHealthy();

    return new Response(
      JSON.stringify(
        {
          mode: ssrMode,
          healthy: isHealthy,
          status,
          metrics: {
            ...metrics,
            successRate:
              metrics.totalTasks > 0
                ? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(
                    2,
                  ) + "%"
                : "N/A",
            failureRate:
              metrics.totalTasks > 0
                ? ((metrics.failedTasks / metrics.totalTasks) * 100).toFixed(
                    2,
                  ) + "%"
                : "N/A",
          },
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        error: "Failed to retrieve metrics",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
