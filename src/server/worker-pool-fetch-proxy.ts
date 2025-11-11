/**
 * Worker Pool with Fetch Proxy Support
 *
 * This is an alternative worker pool implementation that supports:
 * - Bidirectional communication (worker ↔ main thread)
 * - Fetch proxying (workers call fetch on main thread)
 * - Long-lived workers (not task-based like Piscina)
 *
 * Use this for the fetch-proxy experiment.
 */

import { Worker, MessageChannel } from "worker_threads";
import { cpus } from "os";
import type { RenderInput, RenderOutput } from "./serialize.js";
import { executeFetch, type FetchProxyResponse } from "./fetch-proxy.js";

interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  port: MessageChannel["port1"];
}

interface PendingTask {
  input: RenderInput;
  resolve: (output: RenderOutput) => void;
  reject: (error: Error) => void;
}

interface WorkerFetchRequest {
  type: "fetch-request";
  id: string;
  workerId: number;
  url: string;
  options?: RequestInit;
}

interface PendingInternalFetch {
  fetchId: string;
  originalWorkerId: number;
  resolve: (response: Omit<FetchProxyResponse, 'id' | 'type'>) => void;
  reject: (error: Error) => void;
}

export class FetchProxyWorkerPool {
  private workers: WorkerInstance[] = [];
  private queue: PendingTask[] = [];
  private pendingInternalFetches = new Map<string, PendingInternalFetch>();
  private workerPath: string;
  private minWorkers: number;
  private maxWorkers: number;
  private initialized = false;
  private astroApp: any = null; // Astro app instance for route matching

  constructor(workerPath: string, astroApp?: any) {
    this.workerPath = workerPath;
    this.astroApp = astroApp;
    const cpuCount = cpus().length;
    this.minWorkers = Math.max(2, Math.floor(cpuCount / 2));
    this.maxWorkers = cpuCount;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(`🔄 Initializing Fetch-Proxy Worker Pool:`);
    console.log(`   Workers: ${this.minWorkers}-${this.maxWorkers}`);
    console.log(`   Worker path: ${this.workerPath}`);

    // Create minimum workers
    for (let i = 0; i < this.minWorkers; i++) {
      await this.createWorker();
    }

    this.initialized = true;
    console.log(
      `✅ Fetch-Proxy Worker Pool initialized with ${this.workers.length} workers`,
    );
  }

  private async createWorker(): Promise<WorkerInstance> {
    const { port1, port2 } = new MessageChannel();

    const worker = new Worker(this.workerPath, {
      workerData: { mainPort: port2 },
      transferList: [port2],
    });

    const instance: WorkerInstance = {
      worker,
      busy: false,
      port: port1,
    };

    // Handle messages from worker
    port1.on("message", (message) => {
      this.handleWorkerMessage(instance, message);
    });

    worker.on("error", (error) => {
      console.error(`[Worker ${worker.threadId}] Error:`, error);
    });

    worker.on("exit", (code) => {
      console.log(`[Worker ${worker.threadId}] Exited with code ${code}`);
      // Remove from pool
      this.workers = this.workers.filter((w) => w !== instance);
    });

    this.workers.push(instance);
    return instance;
  }

  private handleWorkerMessage(instance: WorkerInstance, message: any): void {
    if (message.type === "fetch-request") {
      // Worker wants to fetch something
      this.handleFetchRequest(message as WorkerFetchRequest);
    } else if (message.type === "error") {
      console.error(`[Worker] Error:`, message.error);
      instance.busy = false;
      this.processQueue();
    }
    // Note: render-result and render-error are handled by the per-task resultHandler
  }

  private async handleFetchRequest(request: WorkerFetchRequest): Promise<void> {
    try {
      console.log(`[Main Thread] Proxying fetch: ${request.url}`);

      // Check if this is a localhost URL that we should handle internally
      const url = new URL(request.url);
      const isLocalhost =
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "0.0.0.0";

      if (isLocalhost && this.astroApp) {
        // This is an internal fetch - route to another worker for rendering!
        console.log(
          `[Main Thread] Routing internal fetch to worker: ${url.pathname}`,
        );

        // Create a promise that will be resolved when the internal render completes
        const responsePromise = new Promise<Omit<FetchProxyResponse, 'id' | 'type'>>((resolve, reject) => {
          this.pendingInternalFetches.set(request.id, {
            fetchId: request.id,
            originalWorkerId: request.workerId,
            resolve,
            reject,
          });

          // Create render input for internal route
          const internalRequest = new Request(request.url, request.options);

          // Extract headers as plain object
          const headers: Record<string, string> = {};
          internalRequest.headers.forEach((value, key) => {
            headers[key] = value;
          });

          const renderInput: RenderInput = {
            url: request.url,
            method: internalRequest.method,
            headers,
            locals: {},
          };

          // Queue this as an internal render task
          this.renderInternal(renderInput, request.id).catch((error) => {
            console.error('[Main Thread] Internal render task failed:', error);
            reject(error);
          });
        });

        // Wait for the internal render to complete
        const response = await responsePromise;

        // Find the worker that sent this request
        const worker = this.workers.find(
          (w) => w.worker.threadId === request.workerId,
        );

        if (worker) {
          // Send response back to original worker
          worker.port.postMessage({
            type: "fetch-response",
            id: request.id,
            ...response,
          } as FetchProxyResponse);
        }
      } else {
        // External fetch - make real HTTP request
        const response = await executeFetch({
          url: request.url,
          options: request.options,
        });

        // Find the worker that sent this request
        const worker = this.workers.find(
          (w) => w.worker.threadId === request.workerId,
        );

        if (worker) {
          // Send response back to worker
          worker.port.postMessage({
            type: "fetch-response",
            id: request.id,
            ...response,
          } as FetchProxyResponse);
        }
      }
    } catch (error) {
      console.error("[Main Thread] Fetch proxy error:", error);
      const worker = this.workers.find(
        (w) => w.worker.threadId === request.workerId,
      );
      if (worker) {
        worker.port.postMessage({
          type: "fetch-response",
          id: request.id,
          ok: false,
          status: 0,
          statusText: "Error",
          headers: {},
          body: null,
          error: error instanceof Error ? error.message : String(error),
        } as FetchProxyResponse);
      }
    }
  }

  async render(input: RenderInput): Promise<RenderOutput> {
    return new Promise((resolve, reject) => {
      this.queue.push({ input, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Render an internal fetch request in another worker
   * This is called when a worker makes a fetch to localhost
   */
  private async renderInternal(input: RenderInput, fetchId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const pending = this.pendingInternalFetches.get(fetchId);
      if (!pending) {
        reject(new Error(`No pending fetch found for ${fetchId}`));
        return;
      }

      // Queue the internal render task
      this.queue.push({
        input,
        resolve: async (output: RenderOutput) => {
          // Internal render completed - extract response and send back to original worker
          try {
            const response = {
              ok: output.status >= 200 && output.status < 300,
              status: output.status,
              statusText: output.statusText || 'OK',
              headers: output.headers,
              body: output.body,
            };

            pending.resolve(response);
            this.pendingInternalFetches.delete(fetchId);
            resolve();
          } catch (error) {
            pending.reject(error as Error);
            this.pendingInternalFetches.delete(fetchId);
            reject(error);
          }
        },
        reject: (error: Error) => {
          pending.reject(error);
          this.pendingInternalFetches.delete(fetchId);
          reject(error);
        },
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    // Find available worker
    let worker = this.workers.find((w) => !w.busy);

    // If no available worker and we haven't hit max, create one
    if (!worker && this.workers.length < this.maxWorkers) {
      worker = await this.createWorker();
    }

    if (!worker) {
      // All workers busy, wait for next available
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    worker.busy = true;

    // Send render task to worker
    worker.port.postMessage({
      type: "render",
      input: task.input,
    });

    // Set up one-time listener for result
    const resultHandler = (message: any) => {
      if (message.type === "render-result") {
        worker!.port.off("message", resultHandler);
        worker!.busy = false;
        task.resolve(message.output);
        this.processQueue(); // Process next task
      } else if (message.type === "render-error") {
        worker!.port.off("message", resultHandler);
        worker!.busy = false;
        task.reject(new Error(message.error));
        this.processQueue(); // Process next task
      }
    };

    worker.port.on("message", resultHandler);
  }

  async shutdown(): Promise<void> {
    console.log("🛑 Shutting down fetch-proxy worker pool...");

    await Promise.all(
      this.workers.map(async ({ worker, port }) => {
        port.close();
        await worker.terminate();
      }),
    );

    this.workers = [];
    this.initialized = false;

    console.log("✅ Fetch-proxy worker pool shut down");
  }

  getStatus() {
    return {
      workers: {
        total: this.workers.length,
        busy: this.workers.filter((w) => w.busy).length,
        idle: this.workers.filter((w) => !w.busy).length,
      },
      queue: {
        pending: this.queue.length,
      },
    };
  }
}

// Singleton instance
let pool: FetchProxyWorkerPool | null = null;

export async function initializeFetchProxyPool(
  workerPath: string,
  astroApp?: any,
): Promise<void> {
  if (pool) {
    console.warn("⚠️  Fetch-proxy worker pool already initialized");
    return;
  }

  pool = new FetchProxyWorkerPool(workerPath, astroApp);
  await pool.initialize();
}

export function getFetchProxyPool(): FetchProxyWorkerPool {
  if (!pool) {
    throw new Error(
      "Fetch-proxy worker pool not initialized. Call initializeFetchProxyPool() first.",
    );
  }
  return pool;
}

export async function shutdownFetchProxyPool(): Promise<void> {
  if (pool) {
    await pool.shutdown();
    pool = null;
  }
}
