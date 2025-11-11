/**
 * Render-Only Worker Communication
 *
 * Workers ONLY handle the Astro rendering (app.render()).
 * All HTTP server logic, routing, and response handling stays on main thread.
 *
 * Main thread responsibilities:
 * - HTTP request handling
 * - Route matching
 * - Response construction and delivery
 *
 * Worker thread responsibilities:
 * - ONLY executing app.render() with provided data
 */

/**
 * Minimal data needed for rendering
 * (Main thread → Worker)
 */
export interface RenderInput {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  locals?: Record<string, any>;
}

/**
 * Minimal data returned from rendering
 * (Worker → Main thread)
 */
export interface RenderOutput {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  workerId: number;
}

/**
 * Create RenderInput from a Request object
 * (Main thread prepares data to send to worker)
 */
export async function createRenderInput(
  request: Request,
  locals?: Record<string, any>,
): Promise<RenderInput> {
  // Extract headers as plain object
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Get body if present (most SSR requests are GET, so this is rare)
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.text();
    } catch {
      // Body already consumed or not available
      body = undefined;
    }
  }

  return {
    url: request.url,
    method: request.method,
    headers,
    body,
    locals,
  };
}

/**
 * Create Request object from RenderInput
 * (Worker reconstructs Request to pass to app.render())
 */
export function createRequestFromInput(input: RenderInput): Request {
  const { url, method, headers, body } = input;

  return new Request(url, {
    method,
    headers: new Headers(headers),
    body: body && method !== "GET" && method !== "HEAD" ? body : undefined,
  });
}

/**
 * Create RenderOutput from a Response object
 * (Worker extracts essential response data to send back)
 */
export async function createRenderOutput(
  response: Response,
  duration: number,
  workerId: number,
): Promise<RenderOutput> {
  // Extract headers as plain object
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Get body as text
  const body = await response.text();

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
    duration,
    workerId,
  };
}

/**
 * Create Response object from RenderOutput
 * (Main thread constructs Response to send to client)
 */
export function createResponseFromOutput(output: RenderOutput): Response {
  const { status, statusText, headers, body } = output;

  return new Response(body, {
    status,
    statusText,
    headers: new Headers(headers),
  });
}
