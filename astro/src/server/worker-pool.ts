/**
 * Render-Only Worker Pool Manager
 *
 * Manages a pool of worker threads for Astro rendering using Piscina.
 * Workers ONLY execute app.render() - all HTTP handling stays on main thread.
 *
 * Based on Wix Engineering's approach to worker-based SSR.
 *
 * Key features:
 * - Dynamic worker pool sizing based on CPU cores
 * - Health monitoring and metrics
 * - Graceful shutdown handling
 * - Task queue management
 * - Minimal serialization overhead (only essential render data)
 */

import Piscina from "piscina";
import { cpus } from "os";
import { join } from "path";
import type { RenderInput, RenderOutput } from "./serialize.js";

interface WorkerPoolMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeWorkers: number;
  queueSize: number;
  avgTaskDuration: number;
  cpuUsage: number;
}

class WorkerPoolManager {
  private pool: Piscina | null = null;
  private metrics: WorkerPoolMetrics;
  private taskDurations: number[] = [];
  private maxDurationSamples = 100;

  constructor() {
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeWorkers: 0,
      queueSize: 0,
      avgTaskDuration: 0,
      cpuUsage: 0,
    };
  }

  /**
   * Get CPU count respecting Docker/container limits
   *
   * Checks:
   * 1. WORKER_THREADS env var (manual override)
   * 2. Docker CPU quota from cgroups
   * 3. Falls back to os.cpus().length
   */
  private getCpuCount(): number {
    // Manual override via environment variable
    if (process.env.WORKER_THREADS) {
      const override = parseInt(process.env.WORKER_THREADS, 10);
      if (override > 0) {
        console.log(`   Using manual override: ${override} workers`);
        return override;
      }
    }

    // Try to detect Docker CPU quota from cgroups v2
    try {
      const fs = require('fs');
      const quota = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim();
      const [max, period] = quota.split(' ').map(Number);

      if (max && period && max !== -1) {
        const cpuQuota = Math.floor(max / period);
        if (cpuQuota > 0) {
          console.log(`   Detected Docker CPU quota: ${cpuQuota} cores`);
          return cpuQuota;
        }
      }
    } catch (err) {
      // cgroups v2 not available, try v1
      try {
        const fs = require('fs');
        const quota = parseInt(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8').trim(), 10);
        const period = parseInt(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8').trim(), 10);

        if (quota > 0 && period > 0) {
          const cpuQuota = Math.floor(quota / period);
          console.log(`   Detected Docker CPU quota (v1): ${cpuQuota} cores`);
          return cpuQuota;
        }
      } catch (err2) {
        // Not in a container or cgroups not available
      }
    }

    // Fallback to actual CPU cores
    const physicalCores = cpus().length;
    console.log(`   Using physical CPU cores: ${physicalCores}`);
    return physicalCores;
  }

  /**
   * Initialize the worker pool
   *
   * Configuration based on Wix Engineering's findings:
   * - minThreads: Half of CPU cores (warm standby)
   * - maxThreads: CPU cores (full utilization under load)
   * - maxQueue: Auto (unbounded queue)
   *
   * Respects Docker CPU limits to avoid over-provisioning workers
   */
  async initialize(): Promise<void> {
    if (this.pool) {
      console.log("⚠️  Worker pool already initialized");
      return;
    }

    const cpuCount = this.getCpuCount();
    const minThreads = Math.max(1, Math.floor(cpuCount / 2));
    const maxThreads = Math.max(2, cpuCount);

    console.log(`🚀 Initializing worker pool:`);
    console.log(`   CPU cores: ${cpuCount}`);
    console.log(`   Min threads: ${minThreads}`);
    console.log(`   Max threads: ${maxThreads}`);

    // In production/preview: Load compiled worker from dist/server
    // In dev: This file isn't used (Vite dev server handles SSR)
    const workerPath = join(process.cwd(), "dist/server/worker-standalone.js");
    console.log(`   Worker path: ${workerPath}`);

    this.pool = new Piscina({
      filename: workerPath,
      minThreads,
      maxThreads,
      maxQueue: maxThreads * 4, // Reasonable queue size: 4x worker count
      idleTimeout: 30000, // 30 seconds
      atomics: "async", // Better performance for task communication
      // No execArgv needed - loading compiled JavaScript, not TypeScript
    });

    // Listen to worker events for metrics
    this.pool.on("drain", () => {
      this.metrics.queueSize = 0;
    });

    console.log("✅ Worker pool initialized");
  }

  /**
   * Render a page in a worker thread
   *
   * Sends minimal RenderInput to worker, receives minimal RenderOutput.
   * Worker ONLY executes app.render() - all HTTP handling stays here on main thread.
   */
  async render(input: RenderInput): Promise<RenderOutput> {
    if (!this.pool) {
      throw new Error("Worker pool not initialized. Call initialize() first.");
    }

    this.metrics.totalTasks++;
    this.metrics.queueSize = this.pool.queueSize;
    this.metrics.activeWorkers = this.pool.threads.length;

    try {
      // Send minimal render input to worker
      // Worker returns minimal render output (includes duration and workerId)
      const output = await this.pool.run(input);

      this.metrics.completedTasks++;

      // Track task duration for metrics (worker already measured it)
      this.trackTaskDuration(output.duration);

      return output;
    } catch (error) {
      this.metrics.failedTasks++;
      console.error(`[Worker Pool] Task failed:`, error);
      throw error;
    }
  }

  /**
   * Track task duration for average calculation
   */
  private trackTaskDuration(duration: number): void {
    this.taskDurations.push(duration);

    // Keep only recent samples
    if (this.taskDurations.length > this.maxDurationSamples) {
      this.taskDurations.shift();
    }

    // Calculate average
    this.metrics.avgTaskDuration =
      this.taskDurations.reduce((sum, d) => sum + d, 0) /
      this.taskDurations.length;
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): WorkerPoolMetrics {
    if (this.pool) {
      this.metrics.queueSize = this.pool.queueSize;
      this.metrics.activeWorkers = this.pool.threads.length;
    }

    return { ...this.metrics };
  }

  /**
   * Get detailed worker pool status
   */
  getStatus() {
    if (!this.pool) {
      return {
        initialized: false,
        message: "Worker pool not initialized",
      };
    }

    return {
      initialized: true,
      threads: {
        active: this.pool.threads.length,
        min: this.pool.options.minThreads,
        max: this.pool.options.maxThreads,
      },
      queue: {
        size: this.pool.queueSize,
        completed: this.pool.completed,
      },
      metrics: this.getMetrics(),
    };
  }

  /**
   * Health check for the worker pool
   */
  isHealthy(): boolean {
    if (!this.pool) return false;

    const metrics = this.getMetrics();
    const failureRate =
      metrics.totalTasks > 0 ? metrics.failedTasks / metrics.totalTasks : 0;

    // Consider unhealthy if failure rate > 10%
    return failureRate < 0.1;
  }

  /**
   * Gracefully shutdown the worker pool
   */
  async shutdown(): Promise<void> {
    if (!this.pool) {
      console.log("⚠️  Worker pool not initialized, nothing to shutdown");
      return;
    }

    console.log("🔄 Shutting down worker pool...");
    console.log(`   Completed tasks: ${this.metrics.completedTasks}`);
    console.log(`   Failed tasks: ${this.metrics.failedTasks}`);
    console.log(`   Pending tasks: ${this.pool.queueSize}`);

    await this.pool.destroy();
    this.pool = null;

    console.log("✅ Worker pool shutdown complete");
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeWorkers: 0,
      queueSize: 0,
      avgTaskDuration: 0,
      cpuUsage: 0,
    };
    this.taskDurations = [];
  }
}

// Singleton instance stored on global to share across module contexts
// This ensures the same instance is used by both the custom server and API endpoints
declare global {
  var __workerPoolInstance: WorkerPoolManager | undefined;
}

/**
 * Get or create the worker pool singleton
 */
export function getWorkerPool(): WorkerPoolManager {
  if (!global.__workerPoolInstance) {
    global.__workerPoolInstance = new WorkerPoolManager();
  }
  return global.__workerPoolInstance;
}

/**
 * Initialize the worker pool (should be called on server startup)
 */
export async function initializeWorkerPool(): Promise<void> {
  const pool = getWorkerPool();
  await pool.initialize();
}

/**
 * Shutdown the worker pool (should be called on server shutdown)
 */
export async function shutdownWorkerPool(): Promise<void> {
  if (global.__workerPoolInstance) {
    await global.__workerPoolInstance.shutdown();
    global.__workerPoolInstance = undefined;
  }
}

export type { WorkerPoolMetrics };
