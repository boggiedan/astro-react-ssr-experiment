/**
 * Route Registry Types
 *
 * Abstract, framework-agnostic route definitions
 */

import type { IncomingMessage } from 'http';

export interface RequestContext {
  url: URL;
  headers: Record<string, string>;
  apiBaseUrl: string;
  request: IncomingMessage;
}

export interface RenderContext {
  url: URL;
  timestamp: number;
}

export type DataFetcher = (
  url: URL,
  context: RequestContext
) => Promise<any> | any;

export type Renderer = (
  data: any,
  context: RenderContext
) => Promise<string> | string;

export interface RouteMeta {
  type: 'simple' | 'io-heavy' | 'cpu-intensive' | 'mixed';
  estimatedTime?: number;
  description?: string;
}

export interface RouteDefinition {
  // URL pattern to match
  pattern: RegExp;

  // Optional data fetcher (runs on main thread for I/O)
  dataFetcher?: DataFetcher;

  // Renderer function (can run in worker - must be pure)
  renderer: Renderer;

  // Metadata for routing decisions
  meta?: RouteMeta;

  // Route name for logging
  name: string;
}

export interface MatchedRoute {
  route: RouteDefinition;
  params: Record<string, string>;
}