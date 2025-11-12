/**
 * Static File Server
 *
 * Serves files from public/ directory
 */

import { createReadStream, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

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
  '.webp': 'image/webp',
};

/**
 * Serve a static file from public/ directory
 * Returns true if file was served, false if not found
 */
export async function serveStaticFile(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  if (!req.url) return false;

  // Parse URL to remove query strings
  const urlPath = req.url.split('?')[0];

  // Only serve from /assets/ or /favicon.svg
  if (!urlPath.startsWith('/assets/') && urlPath !== '/favicon.svg') {
    return false;
  }

  try {
    // Map to public directory
    const filePath = join(process.cwd(), 'public', urlPath);

    // Check if file exists
    if (!existsSync(filePath)) {
      return false;
    }

    const stats = statSync(filePath);

    if (!stats.isFile()) {
      return false;
    }

    // Get MIME type
    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);

    // Cache static assets for 1 year
    if (urlPath.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Stream file
    const stream = createReadStream(filePath);
    stream.pipe(res);

    return true;
  } catch (error) {
    return false;
  }
}