/**
 * Custom Server with Fetch Proxy
 *
 * EXPERIMENTAL: This server uses workers with fetch() proxied to main thread.
 *
 * Architecture:
 * - Main thread: HTTP server, routing, ALL fetch() calls
 * - Worker threads: Pure rendering (HTML generation)
 *
 * This allows I/O operations to run on the main thread (non-blocking due to async)
 * while CPU-intensive rendering happens in workers.
 *
 * Usage:
 *   npm run build
 *   npm run start:fetch-proxy
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname } from "node:path";
import {
  initializeFetchProxyPool,
  getFetchProxyPool,
  shutdownFetchProxyPool,
} from "./worker-pool-fetch-proxy.js";
import { createRenderInput } from "./serialize.js";

const PORT = parseInt(process.env.PORT || "4321", 10);
const HOST = process.env.HOST || "0.0.0.0";

let server: any = null;
let astroApp: any = null;

// MIME types for static files
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveStaticFile(req: any, res: any): boolean {
  if (!req.url) return false;

  const urlPath = req.url.split("?")[0];

  if (!urlPath.startsWith("/_astro/")) {
    return false;
  }

  try {
    const filePath = join(process.cwd(), "dist", "client", urlPath);
    const stats = statSync(filePath);

    if (!stats.isFile()) {
      return false;
    }

    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", stats.size);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = createReadStream(filePath);
    stream.pipe(res);

    return true;
  } catch (error) {
    return false;
  }
}

async function start() {
  console.log("\n🧪 Starting EXPERIMENTAL Astro SSR Server with Fetch Proxy");
  console.log("═".repeat(70));
  console.log("  Mode: FETCH-PROXY (I/O on main, rendering in workers)");
  console.log(`  Port: ${PORT}`);
  console.log(`  Host: ${HOST}`);
  console.log("═".repeat(70) + "\n");

  try {
    // Import Astro app
    const entryModule = await import("../../dist/server/entry.mjs");

    if (!entryModule || !entryModule.handler) {
      throw new Error(
        'Could not load handler - make sure adapter mode is "middleware"',
      );
    }

    astroApp = (entryModule as any).app || (entryModule as any).default;

    if (!astroApp) {
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

      const manifestPath = `../../dist/server/${manifestFiles[0]}`;
      const { manifest } = await import(manifestPath);

      const fullManifest = Object.assign({}, manifest, {
        pageMap: pageMap || manifest.pageMap,
      });

      astroApp = new NodeApp(fullManifest);
    }

    console.log("✅ Astro app loaded\n");

    // Initialize fetch-proxy worker pool
    const workerPath = join(process.cwd(), "dist/server/worker-fetch-proxy.js");
    await initializeFetchProxyPool(workerPath, astroApp);
    console.log("");

    // Create HTTP server
    server = createServer(async (req, res) => {
      try {
        // Serve static files first
        if (serveStaticFile(req, res)) {
          return;
        }

        // Match route
        const request = new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method,
          headers: req.headers as any,
        });

        const routeData = astroApp.match(request);

        if (!routeData) {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }

        // Create render input
        const renderInput = await createRenderInput(request, {});

        // Send to worker for rendering
        // fetch() calls inside the page will be proxied back to THIS thread!
        const pool = getFetchProxyPool();
        const output = await pool.render(renderInput);

        // Send response
        res.statusCode = output.status;
        for (const [key, value] of Object.entries(output.headers)) {
          res.setHeader(key, value);
        }
        res.end(output.body);
      } catch (error) {
        console.error("[HTTP Server] Error:", error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      }
    });

    // Start listening
    await new Promise<void>((resolve) => {
      server.listen(PORT, HOST, () => {
        resolve();
      });
    });

    console.log(`\n✅ Server is running!`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Network: http://${HOST}:${PORT}`);
    console.log(`\n   🧪 EXPERIMENTAL: Fetch proxy enabled`);
    console.log(`   - All fetch() calls run on main thread`);
    console.log(`   - All rendering happens in workers`);
    console.log(`\n   Press Ctrl+C to stop\n`);
  } catch (error) {
    console.error("\n❌ Failed to start server:", error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`\n\n📛 Received ${signal}, shutting down...`);

  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log("✅ HTTP server closed");
          resolve();
        });
      });
    }

    await shutdownFetchProxyPool();

    console.log("✅ Shutdown complete\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("\n❌ Uncaught exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("\n❌ Unhandled rejection:", reason);
  shutdown("unhandledRejection");
});

start().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
