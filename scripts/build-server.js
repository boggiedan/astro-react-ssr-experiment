#!/usr/bin/env node

/**
 * Build script for custom server files
 *
 * This compiles TypeScript server files (worker-standalone, worker-pool, etc.)
 * into the dist/server directory so workers can load compiled JavaScript
 * instead of transpiling TypeScript on-the-fly.
 */

import { build } from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function buildServerFiles() {
  console.log('🔨 Building server files...');

  try {
    await build({
      entryPoints: [
        join(rootDir, 'src/server/custom-server.ts'),
        join(rootDir, 'src/server/custom-server-fetch-proxy.ts'),
        join(rootDir, 'src/server/worker-standalone.ts'),
        join(rootDir, 'src/server/worker-fetch-proxy.ts'),
        join(rootDir, 'src/server/serialize.ts'),
        join(rootDir, 'src/server/worker-pool.ts'),
        join(rootDir, 'src/server/worker-pool-fetch-proxy.ts'),
        join(rootDir, 'src/server/worker-middleware.ts'),
        join(rootDir, 'src/server/fetch-proxy.ts'),
      ],
      bundle: false, // Don't bundle, just transpile
      outdir: join(rootDir, 'dist/server'),
      format: 'esm',
      platform: 'node',
      target: 'node18',
      // Keep .js extension to match import statements
      sourcemap: true,
      minify: false, // Keep readable for debugging
    });

    console.log('✅ Server files built successfully');
    console.log('   Output: dist/server/custom-server.js');
    console.log('   Output: dist/server/worker-standalone.js');
    console.log('   Output: dist/server/serialize.js');
    console.log('   Output: dist/server/worker-pool.js');
    console.log('   Output: dist/server/worker-middleware.js');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildServerFiles();