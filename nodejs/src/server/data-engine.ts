/**
 * Data Fetching Engine
 *
 * Layer 2: Executes data fetchers on main thread (I/O operations)
 */

import type { RouteDefinition, RequestContext } from '../routes/types.js';

export interface DataFetchResult {
  data: any;
  duration: number;
  error?: Error;
}

/**
 * Execute data fetching for a route
 * Always runs on main thread (I/O operations)
 */
export async function fetchDataForRoute(
  route: RouteDefinition,
  url: URL,
  context: RequestContext
): Promise<DataFetchResult> {
  const startTime = Date.now();

  // No data fetcher = no data needed
  if (!route.dataFetcher) {
    return {
      data: null,
      duration: 0
    };
  }

  try {
    const data = await route.dataFetcher(url, context);
    const duration = Date.now() - startTime;

    console.log(`[Data] Fetched for ${route.name} in ${duration}ms`);

    return {
      data,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    console.error(`[Data] Error fetching for ${route.name} after ${duration}ms:`, err.message);

    return {
      data: null,
      duration,
      error: err
    };
  }
}