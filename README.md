# Astro React SSR Performance Experiment

An experimental project exploring **worker-based Server-Side Rendering (SSR)** with Astro and React to overcome Node.js single-threaded performance limitations.

## The Problem

Node.js is single-threaded, which creates significant bottlenecks for SSR applications:

- **React's `renderToString()` blocks the event loop** - A single CPU-intensive render can block all other requests
- **Limited CPU utilization** - Only uses one CPU core, leaving others idle
- **Poor scalability under load** - Can't process multiple SSR renders in parallel
- **Timeout issues** - Complex pages (>200ms render time) cause request queueing and timeouts

### Real-World Impact

With 100 concurrent connections rendering a complex page:
- **Traditional (single-threaded):** ~67 req/s, 3,086ms mean latency, **51% timeout rate**
- **Worker-based (multi-threaded):** Expected 5-10x improvement by utilizing all CPU cores

## The Solution

This project implements **worker thread-based SSR** inspired by [Wix Engineering's approach](https://www.wix.engineering/post/how-wix-applied-multi-threading-to-node-js-and-cut-thousands-of-ssr-pods-and-money), where:

1. **Main thread:** HTTP server, routing, static files, I/O operations
2. **Worker threads:** Pure SSR rendering (`app.render()`) distributed across CPU cores
3. **Piscina pool:** Manages worker threads with dynamic scaling (min/max threads based on CPU count)

### Three Rendering Modes

- **Traditional:** All rendering on main thread (baseline)
- **Worker:** All SSR rendering offloaded to worker threads
- **Hybrid:** Intelligent routing based on workload type
  - I/O-heavy routes → main thread (avoid serialization overhead)
  - CPU-intensive routes → workers (parallel processing)
  - Simple routes → workers (fast parallel rendering)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ HTTP Server  │  │   Routing    │  │ Static Files │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Worker Middleware (Route Decision)        │      │
│  └──────────────────────────────────────────────────┘      │
│           │                                                  │
│           ├─────────────┬─────────────┬─────────────┐      │
└───────────┼─────────────┼─────────────┼─────────────┼──────┘
            ▼             ▼             ▼             ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  Worker 1   │ │  Worker 2   │ │  Worker 3   │ │  Worker N   │
   │             │ │             │ │             │ │             │
   │ app.render()│ │ app.render()│ │ app.render()│ │ app.render()│
   │   (Astro)   │ │   (Astro)   │ │   (Astro)   │ │   (Astro)   │
   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Available Scripts

### Development
```bash
npm run dev              # Start Astro dev server (traditional SSR)
```

### Building
```bash
npm run build            # Build Astro + compile server files
npm run build:astro      # Build Astro only
npm run build:server     # Compile TypeScript server files only
```

### Production Servers
```bash
# Traditional mode (baseline - single-threaded)
npm run preview:traditional

# Worker mode (multi-threaded SSR)
npm run preview:worker
npm run preview:worker:debug    # With debug logging

# Hybrid mode (intelligent routing)
npm run preview:hybrid
npm run preview:hybrid:debug    # With debug logging
```

### Benchmarking
```bash
# Quick test (10s, 10 connections, ~10 concurrent requests)
npm run benchmark

# Standard test (30s, 100 connections, ~1,000 concurrent requests)
npm run benchmark:stress

# Heavy test (60s, 1,000 connections, ~10,000 concurrent requests)
npm run benchmark:extreme
```

## Benchmark Suite

The project includes comprehensive benchmarking tools to measure SSR performance:

### Test Pages

- **`/test/simple`** - Minimal SSR overhead (baseline)
- **`/test/api-heavy`** - I/O bound with multiple API calls
- **`/test/cpu-intensive`** - CPU bound with heavy data processing (2,500 items)
- **`/test/mixed`** - Real-world scenario (50% I/O, 50% CPU)

### Viewing Results

```bash
# Run benchmarks (server must be running)
npm run benchmark

# View results in browser
open http://localhost:4321/benchmark-results
```

The benchmark viewer shows:
- Server mode (traditional/worker/hybrid)
- Node.js version and CPU cores
- Requests/sec, latency percentiles (p50, p95, p99)
- Error and timeout rates
- Performance comparisons across test runs

### API Endpoints

- **`/api/server-info`** - Returns current server mode and configuration
- **`/api/metrics`** - Worker pool metrics (only in worker/hybrid mode)

## Key Files

```
src/server/
├── custom-server.ts         # Main server entry point
├── worker-middleware.ts     # Routing logic for hybrid mode
├── worker-pool.ts          # Piscina worker pool management
├── worker-standalone.ts    # Worker thread renderer
└── serialize.ts            # Request/Response serialization

benchmark/
├── baseline.js             # Autocannon benchmark script
└── results/                # JSON results (auto-generated)

src/pages/
├── test/                   # Performance test pages
│   ├── simple.astro
│   ├── api-heavy.astro
│   ├── cpu-intensive.astro
│   └── mixed.astro
└── benchmark-results.astro # Results viewer
```

## Research References

This project is based on production-proven techniques:

1. **[How Wix Applied Multi-threading to Node.js and Cut Thousands of SSR Pods and Money](https://www.wix.engineering/post/how-wix-applied-multi-threading-to-node-js-and-cut-thousands-of-ssr-pods-and-money)**
   - Wix's approach to worker-based SSR that reduced infrastructure costs
   - Worker pool architecture using Piscina
   - Production metrics and performance gains

2. **[SSR Applications at Scale](https://medium.com/its-tinkoff/ssr-applications-at-scale-d57892719024)**
   - Analysis of SSR performance bottlenecks
   - Event loop blocking and React rendering overhead
   - Real-world performance metrics (36 TPS baseline)

## Performance Expectations

Based on industry research and initial testing:

| Metric | Traditional | Worker (Expected) | Improvement |
|--------|-------------|-------------------|-------------|
| CPU-intensive pages | ~67 req/s | ~400-600 req/s | 5-10x |
| Simple pages | ~1,000 req/s | ~3,000-5,000 req/s | 3-5x |
| I/O-heavy pages | ~400 req/s | ~400-500 req/s | Minimal |
| CPU utilization | ~12-15% (1 core) | ~80-95% (all cores) | 6-8x |

## Current Status

⚠️ **Experimental** - This is a research project to validate worker-based SSR with Astro.

**Working:**
- ✅ Worker pool initialization and management
- ✅ Three rendering modes (traditional/worker/hybrid)
- ✅ Hybrid routing based on workload type
- ✅ Comprehensive benchmark suite
- ✅ Results visualization
- ✅ Graceful shutdown and error handling

## Future Tests & Experiments

The following experiments are planned to validate different scaling approaches and identify optimal deployment strategies:

### 1. Multi-Instance vs Worker Comparison

**Objective:** Compare traditional horizontal scaling (PM2/Docker replicas) against single-instance worker thread scaling.

**Test Configurations:**

**Configuration A: PM2 Cluster (Traditional)**
```bash
# 8 Node.js processes, no workers
pm2 start dist/server/custom-server.js -i 8 --name astro-traditional
SSR_MODE=traditional
```

**Configuration B: Worker Threads (Current)**
```bash
# 1 Node.js process, 8 worker threads
SSR_MODE=worker node dist/server/custom-server.js
```

**Metrics to Compare:**
- Throughput (requests/sec) under varying load
- Latency (p50, p95, p99)
- Memory consumption (total system memory)
- CPU utilization (per-core and aggregate)
- Error/timeout rates under stress
- Cold start time (initial request latency)
- Deployment complexity and operational overhead

**Expected Findings:**
- PM2: Higher memory usage (~1.2GB for 8 processes), process isolation
- Workers: Lower memory (~200-300MB), better CPU utilization
- Workers: Potentially higher throughput due to shared work queue

**Docker Equivalent:**
```yaml
# Configuration A: 8 containers, 1 CPU each
deploy:
  replicas: 8
  resources:
    limits:
      cpus: '1'

# Configuration B: 1 container, 8 CPUs
deploy:
  replicas: 1
  resources:
    limits:
      cpus: '8'
```

---

### 2. Hybrid Multi-Instance + Workers

**Objective:** Test if combining process-level and thread-level parallelism provides optimal balance between isolation and efficiency.

**Test Configurations:**

**Configuration C: Balanced Hybrid**
```bash
# 2 PM2 processes × 4 workers each = 8 total workers
pm2 start ecosystem.config.js
SSR_MODE=worker
# Worker pool configured to: min=2, max=4 per process
```

**Configuration D: Conservative Hybrid**
```bash
# 4 PM2 processes × 2 workers each = 8 total workers
pm2 start ecosystem.config.js
SSR_MODE=worker
# Worker pool configured to: min=1, max=2 per process
```

**Implementation Requirements:**
- Auto-detect PM2 cluster mode via `process.env.NODE_APP_INSTANCE`
- Dynamically adjust worker pool size: `workersPerInstance = CPU_COUNT / PM2_INSTANCES`
- Add configuration option to override worker count

**Code Changes Needed:**
```typescript
// src/server/worker-pool.ts
const pm2Instances = parseInt(process.env.PM2_INSTANCES || '1');
const workersPerInstance = Math.floor(cpuCount / pm2Instances);
const maxThreads = Math.max(2, workersPerInstance);
```

**Metrics to Compare:**
- vs Configuration A (PM2 only): Memory savings, throughput improvements
- vs Configuration B (Workers only): Fault tolerance (process crash isolation)
- Resource efficiency vs operational complexity trade-off
- Zero-downtime deployment capabilities

**Expected Findings:**
- Best balance for high-availability production environments
- Fault isolation without excessive memory overhead
- Potential sweet spot: 2-4 processes with proportional workers

---

### 3. Separated I/O and Rendering Pipeline

**Objective:** Refactor architecture to keep I/O operations on main thread while offloading pure rendering (HTML generation) to workers.

**Current Limitation:**
```astro
---
// ALL of this runs atomically in one thread
const data = await fetch('/api/data?delay=150');  // I/O - blocking
const processed = processData(data);              // CPU - could parallelize
---
<Component data={processed} />                    {/* CPU - could parallelize */}
```

The entire `app.render()` call is monolithic - can't split mid-execution.

**Proposed Architecture:**

**Phase 1: Data Layer Separation**
```typescript
// Main thread - custom middleware
async function handleRequest(req, res) {
  // Step 1: Route matching and data fetching (main thread)
  const route = matchRoute(req.url);
  const pageData = await fetchPageData(route);  // All I/O here

  // Step 2: Rendering in worker (CPU-bound)
  const html = await workerPool.renderWithData({
    route: route,
    data: pageData,      // Pre-fetched data
    headers: req.headers
  });

  res.end(html);
}
```

**Phase 2: Page Restructuring**
```astro
---
// Refactored page: Only CPU work, no I/O
interface Props {
  apiData: any;  // Passed from main thread
}

const { apiData } = Astro.props;
const processed = processData(apiData);  // CPU only
---
<Component data={processed} />
```

**Phase 3: Data Fetching Layer**
```typescript
// src/server/data-layer.ts
export async function fetchPageData(pathname: string) {
  // Centralized data fetching for each route
  switch (pathname) {
    case '/test/mixed':
      return await fetch('/api/data').then(r => r.json());
    case '/test/api-heavy':
      return await Promise.all([
        fetch('/api/user'),
        fetch('/api/posts'),
        fetch('/api/comments')
      ]);
    default:
      return null;
  }
}
```

**Implementation Challenges:**
1. **Breaking Changes:** Requires restructuring all Astro pages
2. **Astro Limitations:** Framework doesn't natively support props-based data injection at this level
3. **Developer Experience:** Loses Astro's "data fetching in frontmatter" paradigm
4. **Complexity:** Requires maintaining separate data layer for each route

**Alternative Approach: Proxy Fetch (Experimental)**
```typescript
// worker-standalone.ts
// Override fetch in worker to proxy back to main thread
globalThis.fetch = async (url, options) => {
  return await mainThreadChannel.proxyFetch(url, options);
};

// All I/O transparently runs on main thread
// Rendering stays in worker
```

**Challenges with Proxy Approach:**
- Complex bidirectional communication (worker ↔ main thread)
- Request/Response serialization overhead
- Potential latency increase (worker → main → API → main → worker)
- Fragile (depends on intercepting all I/O points)

**Metrics to Compare:**
- Pure I/O routes: Should match baseline (no worker overhead)
- Pure CPU routes: Should see 5-10x improvement
- Mixed routes: Isolate exactly how much worker parallelism helps CPU portion
- Overhead measurement: Cost of data serialization main → worker

**Expected Findings:**
- Theoretical best-case scenario: I/O on main, CPU on workers
- Reality: Complexity and serialization overhead may negate benefits
- May not be practical without deeper Astro framework integration

**Success Criteria:**
If mixed workload (50% I/O, 50% CPU) shows >3x improvement over traditional, the complexity is justified.

---

### Test Methodology

All experiments will use:
- Same hardware (8-core CPU, 16GB RAM)
- Same benchmark suite (`/test/simple`, `/test/api-heavy`, `/test/cpu-intensive`, `/test/mixed`)
- Same load profiles (benchmark, stress, extreme)
- Multiple runs to account for variance
- Standardized metrics (autocannon results + system resource monitoring)

**Tools:**
- **Load testing:** Autocannon (already implemented)
- **Resource monitoring:** `htop`, `pidstat`, Node.js built-in profiler
- **Memory profiling:** `clinic.js`, `--inspect` + Chrome DevTools
- **APM simulation:** New Relic / DataDog agents for production-like overhead

## License

MIT