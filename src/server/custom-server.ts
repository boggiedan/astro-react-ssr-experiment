/**
 * Custom Server Entry Point
 *
 * This file replaces Astro's default standalone server to integrate
 * worker-based SSR rendering. It provides environment-based mode switching.
 *
 * Usage:
 *   SSR_MODE=traditional node src/server/custom-server.js  (default, main thread)
 *   SSR_MODE=worker node src/server/custom-server.js       (worker threads)
 *   SSR_MODE=hybrid node src/server/custom-server.js       (smart routing)
 *
 * Environment variables:
 *   SSR_MODE: traditional | worker | hybrid
 *   SSR_DEBUG: true | false (enable detailed logging)
 *   PORT: server port (default: 4321)
 *   HOST: server host (default: 0.0.0.0)
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createWorkerMiddleware } from "./worker-middleware.js";
import {
  getWorkerPool,
  initializeWorkerPool,
  shutdownWorkerPool,
} from "./worker-pool.js";

// Read environment configuration
const SSR_MODE = (process.env.SSR_MODE || "traditional") as
  | "traditional"
  | "worker"
  | "hybrid";
const SSR_DEBUG = process.env.SSR_DEBUG === "true";
const PORT = parseInt(process.env.PORT || "4321", 10);
const HOST = process.env.HOST || "0.0.0.0";

let server: any = null;
let astroApp: any = null;

// MIME types for common file extensions
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain',
};

/**
 * Serve static files from dist/client directory
 * Returns true if file was served, false if not found
 */
function serveStaticFile(req: any, res: any): boolean {
  if (!req.url) return false;

  // Parse URL to remove query strings
  const urlPath = req.url.split('?')[0];

  // Only serve files from _astro directory (Astro's asset directory)
  if (!urlPath.startsWith('/_astro/')) {
    return false;
  }

  try {
    // Map /_astro/* to dist/client/_astro/*
    const filePath = join(process.cwd(), 'dist', 'client', urlPath);

    // Check if file exists
    const stats = statSync(filePath);

    if (!stats.isFile()) {
      return false;
    }

    // Get MIME type from extension
    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);

    // Cache static assets for 1 year (they have content hashes in filenames)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Stream file to response
    const stream = createReadStream(filePath);
    stream.pipe(res);

    return true;
  } catch (error) {
    // File not found or other error
    return false;
  }
}

/**
 * Initialize and start the server
 */
async function start() {
  console.log("\n🚀 Starting Astro SSR Server with Worker Integration");
  console.log("═".repeat(60));
  console.log(`SSR Mode: ${SSR_MODE.toUpperCase()}`);
  console.log(`Debug: ${SSR_DEBUG}`);
  console.log(`Port: ${PORT}`);
  console.log(`Host: ${HOST}`);
  console.log("═".repeat(60) + "\n");

  try {
    // Import the handler from the build output (middleware mode)
    const entryModule = await import("../../dist/server/entry.mjs");

    if (!entryModule || !entryModule.handler) {
      throw new Error("Could not load handler from dist/server/entry.mjs - make sure adapter mode is 'middleware'");
    }

    // In middleware mode, entry.mjs exports a handler and an App instance
    // We'll use the App instance for our worker integration
    astroApp = (entryModule as any).app || (entryModule as any).default;

    if (!astroApp) {
      // If app is not exported, we need to create it from the manifest
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

      const manifestPath = `../../dist/server/${manifestFiles[0]}`;
      const { manifest } = await import(manifestPath);

      const fullManifest = Object.assign({}, manifest, {
        pageMap: pageMap || manifest.pageMap,
      });

      astroApp = new NodeApp(fullManifest);
    }

    console.log("✅ Astro app created from entry.mjs successfully\n");

    // Initialize worker pool if using workers
    if (SSR_MODE === "worker" || SSR_MODE === "hybrid") {
      console.log("Initializing worker pool...");
      await initializeWorkerPool();
      console.log("");
    }

    // Create middleware based on SSR mode
    const middleware = createWorkerMiddleware(astroApp, {
      mode: SSR_MODE,
      debug: SSR_DEBUG,
    });

    // Create HTTP server
    // Wrap middleware to match Node's http.Server signature and handle async
    server = createServer(async (req, res) => {
      try {
        // Try to serve static files first
        const staticFileServed = serveStaticFile(req, res);

        // If a static file was served, we're done
        if (staticFileServed) {
          return;
        }

        // Otherwise, pass to Astro middleware for SSR
        await middleware(req, res);
      } catch (error) {
        console.error('[HTTP Server] Error:', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      }
    });

    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.listen(PORT, HOST, () => {
        resolve();
      });
      server.on("error", reject);
    });

    console.log(`\n✅ Server is running!`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Network: http://${HOST}:${PORT}`);
    console.log(`\n   Mode: ${SSR_MODE}`);

    if (SSR_MODE !== "traditional") {
      const pool = getWorkerPool();
      const status = pool.getStatus();
      console.log(
        `   Workers: ${status.threads?.min}-${status.threads?.max} threads`,
      );
    }

    console.log("\n   Press Ctrl+C to stop\n");
  } catch (error) {
    console.error("\n❌ Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal: string) {
  console.log(`\n\n📛 Received ${signal}, shutting down gracefully...`);

  try {
    // Close HTTP server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log("✅ HTTP server closed");
          resolve();
        });
      });
    }

    // Shutdown worker pool
    if (SSR_MODE === "worker" || SSR_MODE === "hybrid") {
      await shutdownWorkerPool();
    }

    console.log("✅ Shutdown complete\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("\n❌ Uncaught exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("\n❌ Unhandled rejection:", reason);
  shutdown("unhandledRejection");
});

// Start the server
start().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
