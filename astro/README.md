# Astro SSR - Worker Thread Experiment

Astro + React SSR with worker thread support for performance comparison.

## SSR Modes

- **Traditional**: Single-threaded baseline (blocks event loop)
- **Worker**: All SSR offloaded to worker threads
- **Hybrid**: I/O on main thread, CPU work on workers
- **Fetch-Proxy**: Workers proxy fetch back to main thread

## Local Development

```bash
npm install
npm run build
npm run preview:traditional  # or :worker, :hybrid
```

## Docker Deployment

```bash
# 4 replicas with traditional mode
docker-compose up -d

# Worker mode
SSR_MODE=worker docker-compose up -d

# Custom replicas and workers
REPLICAS=2 WORKER_THREADS=4 SSR_MODE=worker docker-compose up -d
```

## Configuration

Worker threads are auto-detected from Docker CPU limits, or override with `WORKER_THREADS` env var.

**Example:**
- 4 replicas × 2 CPU cores each = 8 total workers
- Each container auto-detects its 2 CPU quota