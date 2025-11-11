/**
 * Fetch Proxy System
 *
 * Allows workers to proxy fetch() calls back to the main thread.
 * This enables I/O operations to run on main thread while rendering happens in workers.
 *
 * Architecture:
 * 1. Worker calls fetch() → proxied to main thread
 * 2. Main thread executes actual fetch
 * 3. Response serialized and sent back to worker
 */

export interface FetchProxyRequest {
  id: string;
  type: "fetch";
  url: string;
  options?: RequestInit;
}

export interface FetchProxyResponse {
  id: string;
  type: "fetch-response";
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | null;
  error?: string;
}

/**
 * Serialize a Request object for transfer to main thread
 */
export function serializeFetchRequest(
  url: string | URL | Request,
  options?: RequestInit,
): Omit<FetchProxyRequest, "id" | "type"> {
  let finalUrl: string;
  let finalOptions: RequestInit = options || {};

  if (typeof url === "string" || url instanceof URL) {
    finalUrl = url.toString();
  } else {
    // url is a Request object
    finalUrl = url.url;
    finalOptions = {
      method: url.method,
      headers: Object.fromEntries(url.headers.entries()),
      body: url.body,
      ...finalOptions,
    };
  }

  // Remove non-serializable properties
  const serializableOptions: any = {
    method: finalOptions.method,
    headers: finalOptions.headers,
  };

  // Handle body if present (only string/null for simplicity)
  if (finalOptions.body && typeof finalOptions.body === "string") {
    serializableOptions.body = finalOptions.body;
  }

  return {
    url: finalUrl,
    options: serializableOptions,
  };
}

/**
 * Deserialize and execute fetch on main thread
 */
export async function executeFetch(
  request: Omit<FetchProxyRequest, "id" | "type">,
): Promise<Omit<FetchProxyResponse, "id" | "type">> {
  try {
    const response = await fetch(request.url, request.options);

    // Serialize response
    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "Network Error",
      headers: {},
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deserialize fetch response and create Response object
 */
export function deserializeFetchResponse(
  data: Omit<FetchProxyResponse, "id" | "type">,
): Response {
  if (data.error) {
    throw new Error(`Fetch proxy error: ${data.error}`);
  }

  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: data.headers,
  });
}

/**
 * Global fetch override for workers
 * This will be set in the worker context
 */
export type FetchInterceptor = (
  url: string | URL | Request,
  options?: RequestInit,
) => Promise<Response>;

let interceptor: FetchInterceptor | null = null;

export function setFetchInterceptor(fn: FetchInterceptor) {
  interceptor = fn;
}

export function getFetchInterceptor(): FetchInterceptor | null {
  return interceptor;
}
