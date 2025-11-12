/**
 * Serialization utilities for worker communication
 *
 * Minimal data structures for passing render jobs to workers
 * and receiving rendered HTML back.
 */

import type { RouteDefinition } from '../routes/types.js';

/**
 * Input sent to worker for rendering
 * Contains only what's needed for the renderer function
 */
export interface RenderInput {
  routeName: string;           // Which route to render
  data: any;                   // Data from data fetcher
  context: {
    url: string;               // URL string (not full URL object)
    timestamp: number;
  };
}

/**
 * Output received from worker after rendering
 */
export interface RenderOutput {
  html: string;
  duration: number;
  workerId: number;
  error?: string;
}

/**
 * Create minimal render input for worker
 */
export function createRenderInput(
  route: RouteDefinition,
  data: any,
  context: { url: URL; timestamp: number }
): RenderInput {
  return {
    routeName: route.name,
    data,
    context: {
      url: context.url.toString(),
      timestamp: context.timestamp,
    },
  };
}

/**
 * Create render output to send back to main thread
 */
export function createRenderOutput(
  html: string,
  duration: number,
  workerId: number,
  error?: string
): RenderOutput {
  return {
    html,
    duration,
    workerId,
    error,
  };
}