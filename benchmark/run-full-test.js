#!/usr/bin/env node

/**
 * Full Performance Test Script
 *
 * Runs both autocannon benchmark and system resource monitoring
 * in a single command, then combines the results.
 *
 * Usage:
 *   node benchmark/run-full-test.js
 *   npm run benchmark:full
 *
 *   # With custom options
 *   node benchmark/run-full-test.js --stress
 *   node benchmark/run-full-test.js --duration 60 --connections 500
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Parse CLI arguments
function getArgs() {
  const args = process.argv.slice(2);
  return args;
}

async function findServerPid() {
  try {
    const { stdout } = await execAsync('lsof -ti:4321 2>/dev/null');
    const pid = stdout.trim();
    if (!pid) {
      console.error('❌ No server found on port 4321');
      console.error('   Please start the server with: npm run preview');
      process.exit(1);
    }
    return pid;
  } catch (error) {
    console.error('❌ Error finding server:', error.message);
    process.exit(1);
  }
}

function runMonitor(pid, duration) {
  return new Promise((resolve, reject) => {
    console.log(`📊 Starting monitor for PID ${pid}...\n`);

    const monitor = spawn('node', [
      'benchmark/monitor.js',
      '--pid', pid,
      '--duration', duration.toString(),
      '--interval', '500'
    ], {
      stdio: 'inherit'
    });

    monitor.on('error', reject);
    monitor.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Monitor exited with code ${code}`));
      }
    });
  });
}

function runBenchmark(args) {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting benchmark tests...\n');

    const benchmark = spawn('node', [
      'benchmark/baseline.js',
      ...args
    ], {
      stdio: 'inherit'
    });

    benchmark.on('error', reject);
    benchmark.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Benchmark exited with code ${code}`));
      }
    });
  });
}

function getLatestFile(dir, prefix) {
  const files = readdirSync(dir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .map(f => ({
      name: f,
      time: statSync(join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? join(dir, files[0].name) : null;
}

function combineResults(benchmarkFile, monitorFile) {
  const benchmark = JSON.parse(readFileSync(benchmarkFile, 'utf-8'));
  const monitor = JSON.parse(readFileSync(monitorFile, 'utf-8'));

  const resultsDir = join(process.cwd(), 'benchmark', 'results');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = join(resultsDir, `full-test-${timestamp}.json`);

  const combined = {
    testType: 'full',
    timestamp: new Date().toISOString(),
    benchmark: benchmark,
    monitor: monitor,
    summary: {
      testDuration: benchmark.totalDuration,
      scenarios: benchmark.results.length,
      totalRequests: benchmark.results.reduce((sum, r) => sum + r.metrics.requests.total, 0),
      avgRequestsPerSec: (benchmark.results.reduce((sum, r) => sum + r.metrics.requests.mean, 0) / benchmark.results.length).toFixed(2),
      systemCpu: {
        mean: monitor.stats.cpu.mean,
        max: monitor.stats.cpu.max,
        p95: monitor.stats.cpu.p95,
      },
      systemMemory: {
        mean: monitor.stats.memory.mean,
        max: monitor.stats.memory.max,
        p95: monitor.stats.memory.p95,
      },
    }
  };

  writeFileSync(filename, JSON.stringify(combined, null, 2));
  console.log(`\n💾 Combined results saved to: ${filename}\n`);

  return combined;
}

function printSummary(combined) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           FULL PERFORMANCE TEST SUMMARY                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('📊 Benchmark Results:');
  console.log(`   Scenarios tested: ${combined.summary.scenarios}`);
  console.log(`   Total requests: ${combined.summary.totalRequests.toLocaleString()}`);
  console.log(`   Avg requests/sec: ${combined.summary.avgRequestsPerSec}`);
  console.log('');

  console.log('⚡ System Resources:');
  console.log(`   CPU Usage - Mean: ${combined.summary.systemCpu.mean}% | Max: ${combined.summary.systemCpu.max}% | p95: ${combined.summary.systemCpu.p95}%`);
  console.log(`   Memory - Mean: ${combined.summary.systemMemory.mean}MB | Max: ${combined.summary.systemMemory.max}MB | p95: ${combined.summary.systemMemory.p95}MB`);
  console.log('');

  console.log('📈 Per-Scenario Breakdown:');
  console.log('─'.repeat(95));
  console.log('Scenario'.padEnd(20) + 'Req/s'.padEnd(12) + 'Mean(ms)'.padEnd(12) + 'P95(ms)'.padEnd(12) + 'P99(ms)'.padEnd(12) + 'Errors');
  console.log('─'.repeat(95));

  combined.benchmark.results.forEach(r => {
    console.log(
      r.scenario.padEnd(20) +
      r.metrics.requests.mean.toFixed(2).padEnd(12) +
      r.metrics.latency.mean.toFixed(2).padEnd(12) +
      r.metrics.latency.p95.toFixed(2).padEnd(12) +
      r.metrics.latency.p99.toFixed(2).padEnd(12) +
      r.metrics.errors
    );
  });
  console.log('─'.repeat(95) + '\n');
}

// Main execution
(async () => {
  try {
    const args = getArgs();

    // Extract duration from args (default 30s per test)
    const durationArg = args.find(a => a.startsWith('--duration='));
    const isStress = args.includes('--stress');
    const testDuration = durationArg
      ? parseInt(durationArg.split('=')[1])
      : (isStress ? 60 : 30);

    // Monitor should run a bit longer than total benchmark time
    // Estimate: 4 scenarios * testDuration + 8s (2s pause between tests)
    const monitorDuration = (4 * testDuration) + 15;

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║        FULL PERFORMANCE TEST (Benchmark + Monitor)        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const pid = await findServerPid();
    console.log(`✅ Server found: PID ${pid}\n`);
    console.log(`⏱️  Estimated total time: ~${Math.ceil(monitorDuration / 60)} minutes\n`);

    // Run monitor and benchmark concurrently
    const resultsDir = join(process.cwd(), 'benchmark', 'results');
    mkdirSync(resultsDir, { recursive: true });

    await Promise.all([
      runMonitor(pid, monitorDuration),
      runBenchmark(args)
    ]);

    console.log('\n✅ Tests completed! Combining results...\n');

    // Find latest result files
    const benchmarkFile = getLatestFile(resultsDir, 'baseline-');
    const monitorFile = getLatestFile(resultsDir, 'monitor-');

    if (!benchmarkFile || !monitorFile) {
      console.error('❌ Could not find result files');
      process.exit(1);
    }

    console.log(`📄 Benchmark results: ${benchmarkFile}`);
    console.log(`📄 Monitor results: ${monitorFile}`);

    const combined = combineResults(benchmarkFile, monitorFile);
    printSummary(combined);

  } catch (error) {
    console.error('\n❌ Error running tests:', error.message);
    process.exit(1);
  }
})();
