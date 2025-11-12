/**
 * API Request Handler
 *
 * Routes /api/* requests to appropriate handlers
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { handleServerInfo } from './server-info.js';
import { handleUser } from './user.js';
import { handlePosts } from './posts.js';
import { handleComments } from './comments.js';
import { handleData } from './data.js';

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    let data: any;

    // Route to appropriate handler
    if (url.pathname === '/api/server-info') {
      data = await handleServerInfo(url);
    } else if (url.pathname === '/api/user') {
      data = await handleUser(url);
    } else if (url.pathname === '/api/posts') {
      data = await handlePosts(url);
    } else if (url.pathname === '/api/comments') {
      data = await handleComments(url);
    } else if (url.pathname === '/api/data') {
      data = await handleData(url);
    } else {
      // API endpoint not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
      return;
    }

    // Send JSON response
    const json = JSON.stringify(data);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    });
    res.end(json);

  } catch (error) {
    console.error('[API] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }));
  }
}