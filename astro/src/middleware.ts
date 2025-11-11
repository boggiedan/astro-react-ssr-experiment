/**
 * Astro Middleware
 *
 * Sets up environment variables for internal API calls during SSR
 */

import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // For Docker deployments: set internal API URL to bypass nginx
  // This allows containers to call their own APIs directly
  if (!process.env.INTERNAL_API_URL) {
    const port = process.env.PORT || '4321';
    process.env.INTERNAL_API_URL = `http://localhost:${port}`;
  }

  return next();
});
