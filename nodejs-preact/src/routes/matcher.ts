/**
 * Route Matcher
 *
 * Matches incoming URLs to route definitions
 */

import type { RouteDefinition, MatchedRoute } from './types.js';

/**
 * Match a URL pathname to a registered route
 */
export function matchRoute(
  pathname: string,
  routes: RouteDefinition[]
): MatchedRoute | null {
  for (const route of routes) {
    const match = pathname.match(route.pattern);

    if (match) {
      // Extract named groups if any
      const params = match.groups || {};

      return {
        route,
        params
      };
    }
  }

  return null;
}

/**
 * Convert a path pattern like "/test/:id" to a RegExp
 */
export function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\//g, '\\/')
    .replace(/:\w+/g, '(?<$&>[^/]+)') // Named capture groups
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`);
}