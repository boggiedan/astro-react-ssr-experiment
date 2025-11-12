/**
 * HTTP Client Utility
 *
 * For making API requests from data fetchers
 */

/**
 * Fetch a single URL and parse JSON
 */
export async function fetchJSON<T = any>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch multiple URLs in parallel
 * Returns an object with keys matching the input
 */
export async function fetchParallel<T extends Record<string, string>>(
  urls: T
): Promise<{ [K in keyof T]: any }> {
  const entries = Object.entries(urls);

  const responses = await Promise.all(
    entries.map(([_, url]) => fetchJSON(url))
  );

  return Object.fromEntries(
    entries.map(([key], index) => [key, responses[index]])
  ) as any;
}

/**
 * Get base API URL from environment
 */
export function getBaseUrl(): string {
  return process.env.INTERNAL_API_URL || 'http://localhost:3000';
}

/**
 * Add delay to a promise (for testing)
 */
export async function withDelay<T>(promise: Promise<T>, delayMs: number): Promise<T> {
  const [result] = await Promise.all([
    promise,
    new Promise(resolve => setTimeout(resolve, delayMs))
  ]);
  return result;
}