/**
 * Rendering Engine
 *
 * Layer 3: Executes renderers (pure functions: data → HTML)
 * Can run on main thread OR worker thread
 */

import type { RouteDefinition, RenderContext } from '../routes/types.js';

export interface RenderInput {
  route: RouteDefinition;
  data: any;
  context: RenderContext;
}

export interface RenderResult {
  html: string;
  duration: number;
  error?: Error;
}

/**
 * Execute rendering for a route
 * Pure function - can run on main thread OR worker thread
 */
export async function renderRoute(input: RenderInput): Promise<RenderResult> {
  const startTime = Date.now();

  try {
    // Call the route's renderer with pre-fetched data
    const html = await input.route.renderer(input.data, input.context);

    const duration = Date.now() - startTime;
    console.log(`[Render] Rendered ${input.route.name} in ${duration}ms`);

    return {
      html,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    console.error(`[Render] Error rendering ${input.route.name} after ${duration}ms:`, err.message);

    return {
      html: generateErrorPage(err),
      duration,
      error: err
    };
  }
}

/**
 * Generate an error page
 */
function generateErrorPage(error: Error): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>500 Internal Server Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
    }
    h1 { color: #ef4444; }
    pre {
      text-align: left;
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>500 Internal Server Error</h1>
  <p>${error.message}</p>
  <pre>${error.stack}</pre>
</body>
</html>`;
}