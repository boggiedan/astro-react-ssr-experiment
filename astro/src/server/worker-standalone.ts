/**
 * Render-Only Worker for Astro SSR
 *
 * This file runs in worker threads via Piscina.
 * It handles ONLY the Astro rendering (app.render()).
 *
 * Architecture:
 * - Main thread: HTTP server, routing, request/response handling
 * - Worker thread: ONLY executes app.render() with minimal input data
 *
 * Key responsibilities:
 * - Load the Astro app instance (once per worker)
 * - Receive minimal RenderInput data
 * - Call app.render() with the reconstructed Request
 * - Return minimal RenderOutput data (no full Response object)
 */

import { threadId } from "worker_threads";
import type { App } from "astro/app";
import { createRequestFromInput, createRenderOutput } from "./serialize.js";
import type { RenderInput, RenderOutput } from "./serialize.js";

let app: App | null = null;

/**
 * Initialize the Astro app in this worker thread
 *
 * The app is loaded once per worker and reused for all renders.
 * This is critical for performance - we don't want to reload the app per request.
 */
async function initializeApp(): Promise<App> {
  if (app) return app;

  console.log(`[Worker ${threadId}] Initializing Astro app...`);

  try {
    // Import from the built entry.mjs (middleware mode)
    // Worker is in dist/server, so entry.mjs is in the same directory
    const entryModule = await import("./entry.mjs");

    if (!entryModule) {
      throw new Error("Could not load entry module from dist/server/entry.mjs");
    }

    // In middleware mode, try to get the app instance directly
    app = (entryModule as any).app || (entryModule as any).default;

    if (!app) {
      // If app is not exported, create it from the manifest
      const { NodeApp } = await import("astro/app/node");
      const pageMap = (entryModule as any).pageMap;

      // Find the manifest file dynamically
      const fs = await import('fs');
      const path = await import('path');
      const serverDir = path.join(process.cwd(), 'dist', 'server');
      const manifestFiles = fs.readdirSync(serverDir).filter(f => f.startsWith('manifest_') && f.endsWith('.mjs'));

      if (manifestFiles.length === 0) {
        throw new Error('Could not find manifest file in dist/server');
      }

      // Manifest is in the same directory as the worker
      const manifestPath = `./${manifestFiles[0]}`;
      const { manifest } = await import(manifestPath);

      const fullManifest = Object.assign({}, manifest, {
        pageMap: pageMap || manifest.pageMap,
      });

      app = new NodeApp(fullManifest);
    }

    console.log(`[Worker ${threadId}] Astro app initialized successfully`);

    return app;
  } catch (error) {
    console.error(
      `[Worker ${threadId}] Failed to initialize Astro app:`,
      error,
    );
    throw error;
  }
}

/**
 * Main render function called by Piscina
 *
 * This is the ONLY job of the worker: render the page and return minimal output.
 * All HTTP handling, routing, and response writing happens on the main thread.
 */
export default async function render(input: RenderInput): Promise<RenderOutput> {
  const startTime = Date.now();

  try {
    // Ensure app is initialized
    const astroApp = await initializeApp();

    // Reconstruct Request from minimal input data
    const request = createRequestFromInput(input);

    // Match the route in the worker thread
    const routeData = astroApp.match(request, true);

    // THIS IS THE ONLY HEAVY WORK: Render the Astro page
    // Everything else (HTTP handling, routing, etc.) stays on main thread
    const response = await astroApp.render(request, {
      addCookieHeader: true,
      locals: input.locals,
      routeData,
    });

    // Extract minimal response data to send back
    return await createRenderOutput(response, Date.now() - startTime, threadId);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[Worker ${threadId}] Render failed after ${duration}ms:`,
      errorMessage,
    );

    // Return error as minimal output
    const errorResponse = new Response(
      `<html><body><h1>500 Internal Server Error</h1><p>${errorMessage}</p></body></html>`,
      {
        status: 500,
        statusText: "Internal Server Error",
        headers: {
          "Content-Type": "text/html",
        },
      },
    );

    return await createRenderOutput(errorResponse, duration, threadId);
  }
}

/**
 * Health check for this worker
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  workerId: number;
  hasApp: boolean;
}> {
  return {
    healthy: app !== null,
    workerId: threadId,
    hasApp: app !== null,
  };
}

/**
 * Warmup function to preload the app
 */
export async function warmup(): Promise<void> {
  await initializeApp();
  console.log(`[Worker ${threadId}] Warmup complete`);
}
