# SSR Performance Comparison: Multi-Runtime Benchmarking

Performance benchmarking comparing different SSR implementations across multiple runtimes and modes:

- **PHP** - Traditional SSR with PHP-FPM
- **Astro** - Custom worker pool, hybrid, and traditional SSR modes
- **Vanilla Node.js + React** - Worker pool and traditional SSR modes

All implementations are tested with Docker replicas and nginx load balancing to compare performance under various workloads.

## The Problem with Node.js SSR

Node.js is single-threaded, creating bottlenecks for SSR:
- React's `renderToString()` blocks the event loop
- CPU-intensive renders block all other requests
- SSR rendering confined to one CPU core, leaving others idle
- Complex pages cause request queueing and timeouts

**Real impact**: With 100 concurrent connections rendering a complex page, traditional SSR achieves ~67 req/s with 51% timeout rate.

## Experiment: Worker Threads & Multi-Runtime Comparison

This project experiments **worker-based SSR** inspired by [Wix Engineering's approach](https://www.wix.engineering/post/how-wix-applied-multi-threading-to-node-js-and-cut-thousands-of-ssr-pods-and-money) and compares it across different runtimes and deployment strategies:

### SSR Modes Tested:

**Astro:**
- **Traditional**: Single-threaded baseline
- **Worker**: All SSR offloaded to workers
- **Hybrid**: Intelligent routing (I/O on main, CPU on workers)

**Vanilla Node.js + React:**
- **Traditional**: Single-threaded SSR
- **Worker**: Worker pool for parallel rendering

**PHP:**
- Traditional process-based concurrency (PHP-FPM)

All implementations use Docker with nginx load balancing and multiple replicas to maximize CPU utilization.

## Quick Start

### Run Astro

```bash
cd astro
npm install
npm run build
npm run preview:worker  # or preview:traditional, preview:hybrid
```

### Run Vanilla Node.js + React

```bash
cd nodejs
npm install
npm run build

# Traditional mode
npm start

# Worker mode
SSR_MODE=worker npm start

# Or use Docker with replicas
docker-compose up --build
```

### Run PHP

```bash
cd php
docker-compose up --build
```

### Run Benchmarks

```bash
# Benchmark Astro (must be running on localhost:80)
npm run benchmark:astro

# Benchmark Node.js (must be running on localhost:3000)
npm run benchmark:nodejs

# Benchmark PHP (must be running on localhost:8080)
npm run benchmark:php
```

### View Results

```bash
npm run view-results
# Opens http://localhost:4321/benchmark-results
```

## Test Scenarios

- **Simple** - Baseline SSR with minimal complexity
- **API-Heavy** - Multiple parallel API calls (I/O bound)
- **CPU-Intensive** - Heavy data processing (2,500 items)
- **Mixed** - Real-world combination (30% I/O, 70% CPU)

## License

MIT
