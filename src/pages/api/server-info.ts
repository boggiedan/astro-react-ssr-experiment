/**
 * Server Information API Endpoint
 *
 * GET /api/server-info
 *
 * Returns basic server configuration information including SSR mode.
 * Useful for benchmark scripts to identify which mode is being tested.
 */

import type { APIRoute } from "astro";
import { cpus } from "os";

export const GET: APIRoute = async () => {
  const ssrMode = process.env.SSR_MODE || "traditional";
  const ssrDebug = process.env.SSR_DEBUG === "true";

  return new Response(
    JSON.stringify(
      {
        mode: ssrMode,
        debug: ssrDebug,
        nodeVersion: process.version,
        platform: process.platform,
        cpuCores: cpus().length,
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
};
