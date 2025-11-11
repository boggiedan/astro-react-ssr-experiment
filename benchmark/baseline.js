#!/usr/bin/env node

/**
 * Baseline Performance Test Script
 *
 * This script runs autocannon benchmarks against all test pages
 * and collects baseline metrics for comparison with worker-based SSR.
 *
 * Usage:
 *   # Standard test (100 connections, 10 pipelining = ~1,000 concurrent requests)
 *   node benchmark/baseline.js
 *   npm run benchmark
 *
 *   # Stress test (1000 connections, 10 pipelining = ~10,000 concurrent requests)
 *   node benchmark/baseline.js --stress
 *   npm run benchmark:stress
 *
 *   # Custom configuration
 *   node benchmark/baseline.js --duration 60 --connections 500 --pipelining 20
 *
 *   # Test specific URL
 *   node benchmark/baseline.js --url http://localhost:4321/test/simple
 *
 * Flags:
 *   --stress           Use heavy load configuration (1000 connections, 60s duration)
 *   --duration N       Test duration in seconds (default: 30, stress: 60)
 *   --connections N    Concurrent connections (default: 100, stress: 1000)
 *   --pipelining N     Requests per connection (default: 10)
 *   --url URL          Custom base URL (default: http://localhost:4321)
 */

import autocannon from 'autocannon';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DEFAULT_CONFIG = {
  duration: 30, // seconds
  connections: 100, // concurrent connections (simulates concurrent users)
  pipelining: 10, // requests per connection (amplifies load)
  workers: 8, // autocannon workers (not app workers)
};

// Heavy load configuration for stress testing
const STRESS_CONFIG = {
  duration: 60,
  connections: 1000, // 1000 concurrent connections
  pipelining: 10, // 10 requests pipelined per connection = 10,000 concurrent requests
  workers: 8,
};

const TEST_SCENARIOS = [
  {
    name: 'Simple SSR',
    url: '/test/simple',
    description: 'Baseline - minimal SSR overhead',
    expectedRT: '10-20ms',
  },
  {
    name: 'API-Heavy',
    url: '/test/api-heavy',
    description: 'I/O bound - multiple API calls',
    expectedRT: '150-450ms',
  },
  {
    name: 'CPU-Intensive',
    url: '/test/cpu-intensive',
    description: 'CPU bound - heavy analytics dashboard',
    expectedRT: '200-500ms',
  },
  {
    name: 'Mixed',
    url: '/test/mixed',
    description: 'Real-world - API + CPU work',
    expectedRT: '150-400ms',
  },
];

// Parse CLI arguments (supports both --key=value and --key value)
function getArg(name, defaultValue = null) {
  const args = process.argv.slice(2);

  // Try --key=value format
  const withEquals = args.find(arg => arg.startsWith(`--${name}=`));
  if (withEquals) {
    return withEquals.split('=')[1];
  }

  // Try --key value format
  const flagIndex = args.findIndex(arg => arg === `--${name}`);
  if (flagIndex !== -1 && args[flagIndex + 1]) {
    return args[flagIndex + 1];
  }

  return defaultValue;
}

const baseUrl = getArg('url', 'http://localhost:4321');
const duration = getArg('duration');
const connections = getArg('connections');
const pipelining = getArg('pipelining');
const useStress = process.argv.includes('--stress');

const cliConfig = {};
if (duration) cliConfig.duration = parseInt(duration);
if (connections) cliConfig.connections = parseInt(connections);
if (pipelining) cliConfig.pipelining = parseInt(pipelining);

// Use stress config if --stress flag is present, otherwise use default
const baseConfig = useStress ? STRESS_CONFIG : DEFAULT_CONFIG;
const config = { ...baseConfig, ...cliConfig };

console.log('\n🚀 Starting Baseline Performance Tests');
console.log('=====================================\n');
console.log(`Mode: ${useStress ? '💥 STRESS TEST' : '📊 STANDARD'}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Duration: ${config.duration}s`);
console.log(`Connections: ${config.connections}`);
console.log(`Pipelining: ${config.pipelining}`);
console.log(`Workers: ${config.workers}`);
console.log(`Estimated concurrent requests: ~${config.connections * config.pipelining}`);
console.log('');

const results = [];
let serverInfo = null;

// Helper to safely format numbers with default values
function safeFormat(value, decimals = 2, defaultValue = 0) {
  return (value !== undefined && value !== null) ? value.toFixed(decimals) : defaultValue.toFixed(decimals);
}

// Fetch server information (mode, platform, etc.)
async function fetchServerInfo() {
  try {
    const response = await fetch(`${baseUrl}/api/server-info`);
    if (!response.ok) {
      console.warn('⚠️  Could not fetch server info (endpoint may not be available)');
      return null;
    }
    const info = await response.json();
    return info;
  } catch (error) {
    console.warn('⚠️  Could not fetch server info:', error.message);
    return null;
  }
}

async function runTest(scenario) {
  const url = `${baseUrl}${scenario.url}`;

  console.log(`\n📊 Testing: ${scenario.name}`);
  console.log(`URL: ${url}`);
  console.log(`Expected: ${scenario.expectedRT}`);
  console.log('─'.repeat(50));

  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url,
      duration: config.duration,
      connections: config.connections,
      pipelining: config.pipelining,
      workers: config.workers,
    }, (err, result) => {
      if (err) {
        console.error(`❌ Error testing ${scenario.name}:`, err.message);
        reject(err);
        return;
      }

      const summary = {
        scenario: scenario.name,
        url: scenario.url,
        description: scenario.description,
        expectedRT: scenario.expectedRT,
        timestamp: new Date().toISOString(),
        config: {
          duration: config.duration,
          connections: config.connections,
        },
        metrics: {
          requests: {
            total: result.requests?.total || 0,
            average: result.requests?.average || 0,
            mean: result.requests?.mean || 0,
          },
          throughput: {
            total: result.throughput?.total || 0,
            average: result.throughput?.average || 0,
            mean: result.throughput?.mean || 0,
          },
          latency: {
            mean: result.latency?.mean || 0,
            stddev: result.latency?.stddev || 0,
            min: result.latency?.min || 0,
            max: result.latency?.max || 0,
            p50: result.latency?.p50 || 0,
            p75: result.latency?.p75 || 0,
            p90: result.latency?.p90 || 0,
            p95: result.latency?.p97_5 || 0, // autocannon uses p97_5 for p97.5
            p99: result.latency?.p99 || 0,
            p999: result.latency?.p99_9 || 0, // autocannon uses p99_9 for p99.9
          },
          errors: result.errors || 0,
          timeouts: result.timeouts || 0,
          non2xx: result.non2xx || 0,
        },
      };

      // Console output
      console.log('\n✅ Results:');
      console.log(`   Requests/sec: ${safeFormat(result.requests?.mean)}`);
      console.log(`   Latency (mean): ${safeFormat(result.latency?.mean)}ms`);
      console.log(`   Latency (p97.5): ${safeFormat(result.latency?.p97_5)}ms`);
      console.log(`   Latency (p99): ${safeFormat(result.latency?.p99)}ms`);
      console.log(`   Throughput: ${safeFormat((result.throughput?.mean || 0) / 1024 / 1024)} MB/s`);
      console.log(`   Errors: ${result.errors || 0}`);
      console.log(`   Timeouts: ${result.timeouts || 0}`);

      results.push(summary);
      resolve(summary);
    });

    // Track progress
    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: false,
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();

  for (const scenario of TEST_SCENARIOS) {
    try {
      await runTest(scenario);
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to complete test for ${scenario.name}:`, error.message);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n📈 Summary');
  console.log('═'.repeat(50));
  console.log(`Total test time: ${totalTime}s`);
  console.log(`Tests completed: ${results.length}/${TEST_SCENARIOS.length}\n`);

  // Create results directory
  const resultsDir = join(process.cwd(), 'benchmark', 'results');
  mkdirSync(resultsDir, { recursive: true });

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = join(resultsDir, `baseline-${timestamp}.json`);

  const report = {
    testType: 'baseline',
    timestamp: new Date().toISOString(),
    config,
    baseUrl,
    serverInfo,
    totalDuration: totalTime,
    results,
  };

  writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`💾 Results saved to: ${filename}\n`);

  // Print comparison table
  console.log('\n📊 Performance Comparison');
  console.log('─'.repeat(90));
  console.log('Scenario'.padEnd(20) + 'Req/s'.padEnd(12) + 'Mean(ms)'.padEnd(12) + 'P95(ms)'.padEnd(12) + 'P99(ms)'.padEnd(12) + 'Errors');
  console.log('─'.repeat(90));

  results.forEach(r => {
    console.log(
      r.scenario.padEnd(20) +
      r.metrics.requests.mean.toFixed(2).padEnd(12) +
      r.metrics.latency.mean.toFixed(2).padEnd(12) +
      r.metrics.latency.p95.toFixed(2).padEnd(12) +
      r.metrics.latency.p99.toFixed(2).padEnd(12) +
      r.metrics.errors
    );
  });
  console.log('─'.repeat(90) + '\n');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Cannot connect to ${baseUrl}`);
    console.error('Please make sure the dev server is running with: npm run dev\n');
    process.exit(1);
  }
}

// Main execution
(async () => {
  await checkServer();

  // Fetch server information
  console.log('🔍 Fetching server information...');
  serverInfo = await fetchServerInfo();

  if (serverInfo) {
    console.log(`✅ Server Mode: ${serverInfo.mode.toUpperCase()}`);
    console.log(`   Node.js: ${serverInfo.nodeVersion}`);
    console.log(`   CPU Cores: ${serverInfo.cpuCores}`);
    console.log(`   Platform: ${serverInfo.platform}`);
    if (serverInfo.deployment) {
      console.log(`   Deployment: ${serverInfo.deployment.type.toUpperCase()}`);
      if (serverInfo.deployment.multiInstance) {
        console.log(`   Replicas: ${serverInfo.deployment.replicas} (Multi-instance)`);
      }
    }
    if (serverInfo.debug) {
      console.log(`   Debug: ${serverInfo.debug}`);
    }
  }
  console.log('');

  await runAllTests();
})();