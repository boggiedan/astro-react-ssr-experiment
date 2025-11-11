# SSR Performance Comparison: Node.js vs PHP

Performance benchmarking comparing Astro (Node.js) SSR against traditional PHP SSR across different workload types.

## The Problem with Node.js SSR

Node.js is single-threaded, creating bottlenecks for SSR:
- React's `renderToString()` blocks the event loop
- CPU-intensive renders block all other requests
- SSR rendering confined to one CPU core, leaving others idle
- Complex pages cause request queueing and timeouts

**Real impact**: With 100 concurrent connections rendering a complex page, traditional SSR achieves ~67 req/s with 51% timeout rate.

## Experiment: Worker Threads

This project experiments **worker-based SSR** inspired by [Wix Engineering's approach](https://www.wix.engineering/post/how-wix-applied-multi-threading-to-node-js-and-cut-thousands-of-ssr-pods-and-money) and comparing it with other solutions (load balancing):

- **Main thread**: HTTP server, routing, I/O operations
- **Worker threads**: Pure SSR rendering distributed across CPU cores
- **Expected improvement**: 5-10x throughput by utilizing all cores

Astro offers three modes:
- **Traditional**: Single-threaded baseline
- **Worker**: All SSR offloaded to workers
- **Hybrid**: Intelligent routing (I/O on main, CPU on workers)

PHP comparison provides baseline for traditional process-based concurrency (PHP-FPM).

## Quick Start

### Run Astro (Node.js)

```bash
cd astro
npm install
npm run build
npm run preview:worker  # or preview:traditional, preview:hybrid
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
