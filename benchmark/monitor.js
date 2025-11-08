#!/usr/bin/env node

/**
 * System Resource Monitor
 *
 * Monitors CPU and memory usage during load tests.
 * Can monitor a specific process or all Node.js processes.
 *
 * Usage:
 *   node benchmark/monitor.js
 *   node benchmark/monitor.js --pid 12345
 *   node benchmark/monitor.js --interval 500
 */

import pidusage from 'pidusage';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

const targetPid = getArg('pid');
const interval = parseInt(getArg('interval', '1000'));
const duration = parseInt(getArg('duration', '60'));

const samples = [];
let monitoringInterval;

async function findNodeProcesses() {
  try {
    // Find process listening on port 4321 (works for both dev and preview)
    const { stdout } = await execAsync('lsof -ti:4321 2>/dev/null');
    const pid = stdout.trim();

    if (!pid) {
      console.warn('⚠️  No process listening on port 4321');
      console.warn('    Make sure the dev or preview server is running');
      return null;
    }

    console.log(`📍 Found server process on port 4321: PID ${pid}`);
    return pid;
  } catch (error) {
    console.error('❌ Error finding server process:', error.message);
    return null;
  }
}

async function sample(pid) {
  try {
    const stats = await pidusage(pid);

    const data = {
      timestamp: Date.now(),
      cpu: stats.cpu.toFixed(2),
      memory: {
        bytes: stats.memory,
        mb: (stats.memory / 1024 / 1024).toFixed(2),
      },
      elapsed: stats.elapsed,
      ppid: stats.ppid,
    };

    samples.push(data);

    // Console output (overwrite line)
    process.stdout.write(
      `\r⚡ CPU: ${data.cpu}% | Memory: ${data.memory.mb}MB | Samples: ${samples.length}   `
    );

    return data;
  } catch (error) {
    console.error(`\n❌ Error sampling PID ${pid}:`, error.message);
    stopMonitoring();
  }
}

function calculateStats() {
  if (samples.length === 0) return null;

  const cpuValues = samples.map(s => parseFloat(s.cpu));
  const memoryValues = samples.map(s => parseFloat(s.memory.mb));

  const sortedCpu = [...cpuValues].sort((a, b) => a - b);
  const sortedMemory = [...memoryValues].sort((a, b) => a - b);

  const stats = {
    cpu: {
      mean: (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2),
      min: Math.min(...cpuValues).toFixed(2),
      max: Math.max(...cpuValues).toFixed(2),
      p50: sortedCpu[Math.floor(sortedCpu.length * 0.5)].toFixed(2),
      p95: sortedCpu[Math.floor(sortedCpu.length * 0.95)].toFixed(2),
      p99: sortedCpu[Math.floor(sortedCpu.length * 0.99)].toFixed(2),
    },
    memory: {
      mean: (memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length).toFixed(2),
      min: Math.min(...memoryValues).toFixed(2),
      max: Math.max(...memoryValues).toFixed(2),
      p50: sortedMemory[Math.floor(sortedMemory.length * 0.5)].toFixed(2),
      p95: sortedMemory[Math.floor(sortedMemory.length * 0.95)].toFixed(2),
      p99: sortedMemory[Math.floor(sortedMemory.length * 0.99)].toFixed(2),
    },
    samples: samples.length,
  };

  return stats;
}

function saveResults(pid, stats) {
  const resultsDir = join(process.cwd(), 'benchmark', 'results');
  mkdirSync(resultsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = join(resultsDir, `monitor-${pid}-${timestamp}.json`);

  const report = {
    pid: parseInt(pid),
    timestamp: new Date().toISOString(),
    config: { interval, duration },
    stats,
    samples,
  };

  writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n💾 Monitor results saved to: ${filename}`);
}

function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
}

async function startMonitoring(pid) {
  console.log('\n🔍 System Resource Monitor');
  console.log('=========================\n');
  console.log(`Monitoring PID: ${pid}`);
  console.log(`Interval: ${interval}ms`);
  console.log(`Duration: ${duration}s`);
  console.log('\nPress Ctrl+C to stop\n');

  monitoringInterval = setInterval(() => sample(pid), interval);

  // Auto-stop after duration
  setTimeout(() => {
    stopMonitoring();
    console.log('\n\n⏱️  Monitoring duration completed\n');
    printSummary(pid);
  }, duration * 1000);
}

function printSummary(pid) {
  const stats = calculateStats();

  if (!stats) {
    console.log('No data collected');
    return;
  }

  console.log('\n📊 Summary Statistics');
  console.log('═'.repeat(50));
  console.log('\nCPU Usage (%)');
  console.log(`  Mean:  ${stats.cpu.mean}%`);
  console.log(`  Min:   ${stats.cpu.min}%`);
  console.log(`  Max:   ${stats.cpu.max}%`);
  console.log(`  p50:   ${stats.cpu.p50}%`);
  console.log(`  p95:   ${stats.cpu.p95}%`);
  console.log(`  p99:   ${stats.cpu.p99}%`);

  console.log('\nMemory Usage (MB)');
  console.log(`  Mean:  ${stats.memory.mean} MB`);
  console.log(`  Min:   ${stats.memory.min} MB`);
  console.log(`  Max:   ${stats.memory.max} MB`);
  console.log(`  p50:   ${stats.memory.p50} MB`);
  console.log(`  p95:   ${stats.memory.p95} MB`);
  console.log(`  p99:   ${stats.memory.p99} MB`);

  console.log(`\nTotal samples: ${stats.samples}\n`);

  saveResults(pid, stats);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  stopMonitoring();
  console.log('\n\n⚠️  Monitoring stopped by user\n');
  const pid = targetPid || process.env.MONITOR_PID;
  if (pid) printSummary(pid);
  process.exit(0);
});

// Main execution
(async () => {
  let pid = targetPid;

  if (!pid) {
    pid = await findNodeProcesses();
    if (!pid) {
      console.error('\n❌ No process to monitor. Please specify --pid or start the dev server.\n');
      process.exit(1);
    }
  }

  await startMonitoring(pid);
})();