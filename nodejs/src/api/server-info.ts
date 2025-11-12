/**
 * /api/server-info endpoint
 *
 * Returns server configuration
 */

import { cpus } from 'os';

export async function handleServerInfo(url: URL): Promise<any> {
  const ssrMode = process.env.SSR_MODE || 'traditional';

  return {
    mode: ssrMode,
    runtime: 'Node.js',
    framework: 'vanilla',
    nodeVersion: process.version,
    deployment: {
      type: process.env.DOCKER ? 'docker' : 'standalone',
      replicas: parseInt(process.env.REPLICAS || '1', 10),
      multiInstance: parseInt(process.env.REPLICAS || '1', 10) > 1
    },
    platform: process.platform,
    cpuCores: cpus().length,
    timestamp: new Date().toISOString()
  };
}