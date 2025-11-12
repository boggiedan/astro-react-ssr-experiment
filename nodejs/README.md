# Node.js + React SSR (Vanilla)

Minimal Node.js HTTP server with React SSR using abstract 3-layer architecture.

This is part of a larger SSR performance comparison project testing:
- **PHP** with traditional SSR
- **Astro** with custom worker pool and traditional SSR modes
- **Vanilla Node.js + React** with worker pool and traditional SSR modes

All implementations are tested with Docker replicas and load balancing to compare performance under various workloads.

## Architecture

**3-Layer Design:**
1. **Route Registry** - Maps URLs to data fetchers + renderers (no hardcoded pages)
2. **Data Fetching Layer** - Executes I/O operations on main thread
3. **Rendering Layer** - Pure functions (data → HTML) that can run in workers

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start server in traditional mode (default)
npm start

# Start server in worker mode
SSR_MODE=worker npm start

# Or run in dev mode (with watch)
npm run dev
```

## SSR Modes

The server supports two SSR modes:

### Traditional Mode (default)
- All rendering happens on the main thread
- Simple, predictable execution model
- Good for low-traffic scenarios

```bash
npm start
# or
SSR_MODE=traditional npm start
```

### Worker Mode
- Rendering offloaded to worker thread pool (Piscina)
- Data fetching stays on main thread (optimal for I/O)
- Auto-detects CPU cores and respects Docker limits
- Better throughput under high load

```bash
SSR_MODE=worker npm start
```

**Worker Pool Configuration:**
- Min threads: CPU cores / 2
- Max threads: CPU cores
- Auto-detects Docker CPU quotas (cgroups v1 & v2)
- Manual override: `WORKER_THREADS=4 SSR_MODE=worker npm start`

## Project Status

✅ **Completed:**
- 3-layer architecture foundation
- Route registry system
- Data fetching engine
- Rendering engine (traditional & worker modes)
- Worker pool with Piscina (Docker-aware CPU detection)
- HTTP server with static file serving
- All 6 API endpoints (/api/server-info, /api/user, /api/posts, /api/comments, /api/data, /api/metrics)
- React components (Header, SimpleReact, DataDisplay, ComplexChart, DataProcessor)
- All page renderers (Home, Simple, API-Heavy, CPU-Intensive, Mixed)
- Data processing library
- TailwindCSS styling
- Docker deployment with nginx load balancer and multi-replica support
- Benchmark integration with autocannon

🔮 **Future:**
- Performance optimization
- Additional test scenarios

## Testing

```bash
# Test API endpoints
curl http://localhost:3000/api/server-info
curl "http://localhost:3000/api/user?delay=100"
curl "http://localhost:3000/api/posts?count=5"

# Test pages
curl http://localhost:3000/                    # Home page
curl http://localhost:3000/test/simple         # Simple test (0 API calls)
curl http://localhost:3000/test/api-heavy      # API-heavy test (3 parallel API calls)
curl http://localhost:3000/test/cpu-intensive  # CPU-intensive test (2500 items processing)
curl http://localhost:3000/test/mixed          # Mixed test (API + CPU work)
```

## Performance Characteristics

Based on testing, here are the observed performance metrics:

- **Simple Test**: ~1-2ms render time (no data fetching)
- **API-Heavy Test**: ~204ms total (204ms I/O, 0-1ms render)
- **CPU-Intensive Test**: ~22ms total (17ms data processing, 5ms render)
- **Mixed Test**: ~157ms total (154ms I/O, 3ms CPU)

## Adding New Routes

Just register in `src/routes/registry.ts`:

```typescript
routes.push({
  name: 'My Page',
  pattern: /^\/my-page$/,
  dataFetcher: async (url, ctx) => {
    // Fetch data on main thread (I/O)
    return await fetchData();
  },
  renderer: (data, ctx) => {
    // Render HTML (can run in worker - pure function)
    return renderMyPage(data);
  },
  meta: { type: 'mixed' }
});
```

No server.ts modifications needed!