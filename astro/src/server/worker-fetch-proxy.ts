/**
 * Worker Thread with Fetch Proxy
 *
 * This worker overrides global fetch() to proxy requests back to the main thread.
 * This allows I/O operations to run on the main thread while rendering happens here.
 *
 * Communication:
 * - Worker → Main: Fetch requests
 * - Main → Worker: Fetch responses
 * - Worker → Main: Render results
 */

import { workerData, threadId } from "worker_threads";
import type { App } from "astro/app";
import type { RenderInput, RenderOutput } from "./serialize.js";
import { createRequestFromInput, createRenderOutput } from "./serialize.js";
import {
  serializeFetchRequest,
  deserializeFetchResponse,
  type FetchProxyResponse,
} from "./fetch-proxy.js";

let app: App | null = null;
let mainPort: any = null;

// Map to track pending fetch requests
const pendingFetches = new Map<
  string,
  {
    resolve: (response: Response) => void;
    reject: (error: Error) => void;
  }
>();

/**
 * Initialize the Astro app in this worker
 */
async function initializeApp(): Promise<App> {
  if (app) return app;

  console.log(
    `[Worker ${threadId}] Initializing Astro app with fetch proxy...`,
  );

  try {
    const entryModule = await import("../../dist/server/entry.mjs");

    if (!entryModule) {
      throw new Error("Could not load entry module");
    }

    app = (entryModule as any).app || (entryModule as any).default;

    if (!app) {
      const { NodeApp } = await import("astro/app/node");
      const pageMap = (entryModule as any).pageMap;

      const fs = await import("fs");
      const path = await import("path");
      const serverDir = path.join(process.cwd(), "dist", "server");
      const manifestFiles = fs
        .readdirSync(serverDir)
        .filter((f) => f.startsWith("manifest_") && f.endsWith(".mjs"));

      if (manifestFiles.length === 0) {
        throw new Error("Could not find manifest file");
      }

      const manifestPath = `./${manifestFiles[0]}`;
      const { manifest } = await import(manifestPath);

      const fullManifest = Object.assign({}, manifest, {
        pageMap: pageMap || manifest.pageMap,
      });

      app = new NodeApp(fullManifest);
    }

    console.log(`[Worker ${threadId}] Astro app initialized with fetch proxy`);

    return app;
  } catch (error) {
    console.error(`[Worker ${threadId}] Failed to initialize:`, error);
    throw error;
  }
}

/**
 * Override global fetch to proxy to main thread
 */
function installFetchProxy() {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function proxiedFetch(
    url: string | URL | Request,
    options?: RequestInit,
  ): Promise<Response> {
    // Only proxy external URLs (http/https)
    const urlString =
      typeof url === "string"
        ? url
        : url instanceof URL
          ? url.toString()
          : url.url;

    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      // Local URLs, use original fetch
      return originalFetch(url as any, options);
    }

    console.log(`[Worker ${threadId}] Proxying fetch: ${urlString}`);

    const requestId = `${threadId}-${Date.now()}-${Math.random()}`;
    const serialized = serializeFetchRequest(url, options);

    return new Promise((resolve, reject) => {
      // Store promise handlers
      pendingFetches.set(requestId, { resolve, reject });

      // Send fetch request to main thread
      mainPort.postMessage({
        type: "fetch-request",
        id: requestId,
        workerId: threadId,
        url: serialized.url,
        options: serialized.options,
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingFetches.has(requestId)) {
          pendingFetches.delete(requestId);
          reject(new Error(`Fetch proxy timeout: ${urlString}`));
        }
      }, 30000);
    });
  };

  console.log(`[Worker ${threadId}] Fetch proxy installed`);
}

/**
 * Handle fetch response from main thread
 */
function handleFetchResponse(message: FetchProxyResponse) {
  const pending = pendingFetches.get(message.id);
  if (!pending) {
    console.warn(
      `[Worker ${threadId}] Received response for unknown fetch: ${message.id}`,
    );
    return;
  }

  pendingFetches.delete(message.id);

  try {
    const response = deserializeFetchResponse(message);
    pending.resolve(response);
  } catch (error) {
    pending.reject(error as Error);
  }
}

/**
 * Main render function
 */
async function render(input: RenderInput): Promise<RenderOutput> {
  const startTime = Date.now();

  try {
    const astroApp = await initializeApp();
    const request = createRequestFromInput(input);
    const routeData = astroApp.match(request, true);

    console.log(`[Worker ${threadId}] Rendering: ${input.url}`);

    // THIS IS WHERE THE MAGIC HAPPENS
    // When Astro components call fetch(), it will be proxied to main thread!
    const response = await astroApp.render(request, {
      addCookieHeader: true,
      locals: input.locals,
      routeData,
    });

    const output = await createRenderOutput(
      response,
      Date.now() - startTime,
      threadId,
    );

    console.log(`[Worker ${threadId}] Rendered in ${output.duration}ms`);

    return output;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[Worker ${threadId}] Render failed:`, errorMessage);

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
 * Initialize worker
 */
async function init() {
  if (!workerData || !workerData.mainPort) {
    throw new Error("Worker requires mainPort in workerData");
  }

  mainPort = workerData.mainPort;

  // Install fetch proxy BEFORE initializing app
  installFetchProxy();

  // Handle messages from main thread
  mainPort.on("message", async (message: any) => {
    if (message.type === "render") {
      try {
        const output = await render(message.input);
        mainPort.postMessage({
          type: "render-result",
          output,
        });
      } catch (error) {
        mainPort.postMessage({
          type: "render-error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (message.type === "fetch-response") {
      handleFetchResponse(message as FetchProxyResponse);
    }
  });

  console.log(`[Worker ${threadId}] Initialized with fetch proxy`);
}

// Start the worker
init().catch((error) => {
  console.error(`[Worker ${threadId}] Fatal error:`, error);
  process.exit(1);
});
