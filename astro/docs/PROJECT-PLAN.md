# Astro React SSR Worker Performance Experiment

> **Project Goal**: Create a controlled testing environment to compare Astro React SSR performance with and without worker threads using real-world scenarios, high-load simulation, and comprehensive metrics analysis.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Inspiration & Background](#inspiration--background)
3. [Project Objectives](#project-objectives)
4. [Architecture Design](#architecture-design)
5. [Test Scenarios](#test-scenarios)
6. [Implementation Phases](#implementation-phases)
7. [Metrics & Analysis](#metrics--analysis)
8. [Expected Outcomes](#expected-outcomes)
9. [Technology Stack](#technology-stack)

---

## Project Overview

This project aims to experimentally validate the performance benefits of worker-based SSR in Astro with React, inspired by Wix Engineering's success in achieving:
- 70% reduction in server pods
- 153% improvement in requests per minute
- 20% faster p95 latency

**Key Question**: Can we achieve similar improvements in an Astro React SSR application?

### Scope

- **Build**: Dual-mode Astro app (worker-based vs traditional SSR)
- **Test**: Real-world scenarios under high load
- **Measure**: Comprehensive performance metrics
- **Analyze**: Compare results and identify optimal configurations
- **Document**: Findings, recommendations, and best practices

---

## Inspiration & Background

### Wix's Approach

Wix built a multi-threaded SSR platform using:
- **worker_threads**: Native Node.js parallel execution
- **generic-pool**: Thread pool management
- **comlink**: RPC-like communication between threads

**Results**: Handled 1M requests/minute with 70% fewer servers

### Our Hypothesis

Astro React SSR applications can benefit from worker-based rendering for:
- CPU-intensive React component rendering
- High-traffic scenarios
- Multi-core server environments
- Complex page structures

**See**: `docs/WORKER-SSR-IMPLEMENTATION.md` for detailed implementation strategy

---

## Project Objectives

### Primary Objectives

1. **Benchmark Performance Differences**
   - Throughput (requests/second)
   - Latency distribution (p50, p95, p99)
   - CPU utilization
   - Memory consumption
   - Error rates

2. **Identify Optimal Use Cases**
   - Which scenarios benefit from workers?
   - When does main thread perform better?
   - Hybrid routing strategy validation

3. **Measure Streaming Impact**
   - HTML streaming vs buffering trade-offs
   - TTFB (Time to First Byte) analysis
   - Progressive rendering behavior

4. **Determine Configuration Sweet Spots**
   - Optimal thread pool size
   - Queue depth configuration
   - Worker lifecycle settings

### Secondary Objectives

- Create reusable testing framework for SSR performance
- Document best practices for Astro worker-based SSR
- Build reference implementation for community

---

## Architecture Design

### Dual-Mode Architecture

```
┌─────────────────────────────────────────────────┐
│           Astro SSR Application                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐         ┌──────────────┐    │
│  │ Traditional  │         │   Worker     │    │
│  │     Mode     │   OR    │     Mode     │    │
│  └──────────────┘         └──────────────┘    │
│        │                         │             │
│        │                         │             │
│  ┌─────▼──────┐           ┌─────▼──────┐     │
│  │Main Thread │           │ Piscina    │     │
│  │  Rendering │           │ Pool (2-8) │     │
│  └────────────┘           └────────────┘     │
│                                               │
└───────────────────────────────────────────────┘
```

### Configuration System

**Environment Variables**:
```bash
# Mode Selection
SSR_MODE=traditional|worker|hybrid

# Worker Configuration (when SSR_MODE=worker)
WORKER_MIN_THREADS=2
WORKER_MAX_THREADS=4
WORKER_IDLE_TIMEOUT=30000
WORKER_MAX_QUEUE=64

# Hybrid Configuration (when SSR_MODE=hybrid)
WORKER_STREAMING_ROUTES=/api-heavy,/streaming-test
WORKER_STREAMING_THRESHOLD=100

# Testing
SIMULATE_SLOW_API=true
API_DELAY_MS=200
```

### Routing Strategies

#### 1. Traditional Mode
All requests handled by main thread (baseline)

#### 2. Worker Mode
All SSR requests routed to worker pool

#### 3. Hybrid Mode (Recommended)
Smart routing based on request characteristics:

```typescript
Decision Tree:
├─ Static files? → nginx/static handler
├─ API routes? → main thread (I/O bound)
├─ Server islands? → main thread (streaming)
├─ Slow page (>100ms)? → main thread (streaming)
└─ Fast SSR page? → worker pool (buffered)
```

---

## Test Scenarios

### 1. Simple SSR Page
**Purpose**: Baseline React component rendering

**Implementation**:
```tsx
// src/pages/test/simple.astro
---
import SimpleReact from '@/components/test/SimpleReact';
---
<Layout>
  <SimpleReact message="Hello World" count={100} />
</Layout>
```

**Characteristics**:
- Minimal React component
- No API calls
- No complex calculations
- Expected render time: 10-20ms

**Metrics Focus**: Pure rendering overhead

---

### 2. API-Heavy Page
**Purpose**: Simulate database/external API dependencies

**Implementation**:
```tsx
// src/pages/test/api-heavy.astro
---
import DataDisplay from '@/components/test/DataDisplay';

// Simulate 3 sequential API calls
const userData = await fetch('/api/user').then(r => r.json());
const postsData = await fetch('/api/posts').then(r => r.json());
const commentsData = await fetch('/api/comments').then(r => r.json());
---
<Layout>
  <DataDisplay
    user={userData}
    posts={postsData}
    comments={commentsData}
  />
</Layout>
```

**Characteristics**:
- 3 API calls (configurable delay: 50-500ms each)
- I/O bound (workers shouldn't help much)
- Tests hybrid routing decision
- Expected render time: 150-1500ms

**Metrics Focus**: I/O vs CPU bound comparison

---

### 3. CPU-Intensive Page
**Purpose**: Heavy computation during SSR

**Implementation**:
```tsx
// src/pages/test/cpu-intensive.astro
---
import ComplexChart from '@/components/test/ComplexChart';
import DataProcessor from '@/components/test/DataProcessor';

// Generate large dataset
const dataset = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  value: Math.random() * 100,
  label: `Item ${i}`,
}));

// Perform calculations during SSR
const processed = processData(dataset); // CPU-intensive
const chartData = generateChartData(processed); // More CPU work
---
<Layout>
  <ComplexChart data={chartData} />
  <DataProcessor items={processed} />
</Layout>
```

**Characteristics**:
- Large data processing
- Complex React component trees
- Minimal I/O
- Expected render time: 100-300ms

**Metrics Focus**: Worker parallelization benefits

---

### 4. Streaming Test Page
**Purpose**: Evaluate progressive rendering behavior

**Implementation**:
```tsx
// src/pages/test/streaming.astro
---
const fastData = "Fast content";

// Simulate slow API
await new Promise(r => setTimeout(r, 500));
const slowData = "Slow content";
---
<html>
<body>
  <!-- Fast section -->
  <div id="fast">{fastData}</div>

  <!-- Slow section -->
  <div id="slow">{slowData}</div>
</body>
</html>
```

**Characteristics**:
- Mixed fast/slow content
- Tests streaming vs buffering
- Measures TTFB impact
- Expected render time: 500ms total

**Metrics Focus**: Progressive rendering, TTFB

---

### 5. Mixed Scenario
**Purpose**: Real-world combination

**Implementation**:
```tsx
// src/pages/test/mixed.astro
---
import Header from '@/components/test/Header';
import ComplexSection from '@/components/test/ComplexSection';
import ApiSection from '@/components/test/ApiSection';

// Mix of API and CPU work
const apiData = await fetch('/api/data').then(r => r.json());
const processedData = heavyProcessing(apiData);
---
<Layout>
  <Header />
  <ComplexSection data={processedData} />
  <ApiSection data={apiData} />
</Layout>
```

**Characteristics**:
- 30% API calls, 70% CPU work
- Realistic page structure
- Variable complexity
- Expected render time: 150-400ms

**Metrics Focus**: Hybrid mode effectiveness

---

### 6. Server Islands Test
**Purpose**: Test deferred SSR components

**Implementation**:
```tsx
// src/pages/test/islands.astro
---
import DeferredWidget from '@/components/test/DeferredWidget';
---
<Layout>
  <h1>Main Content (instant)</h1>

  <DeferredWidget server:defer />
</Layout>
```

**Characteristics**:
- Server islands with encryption
- Separate rendering lifecycle
- Tests worker + streaming interaction

**Metrics Focus**: Server island rendering performance

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

#### Deliverables
- [ ] Project structure setup
- [ ] Traditional SSR baseline (current Astro)
- [ ] Test page components (6 scenarios)
- [ ] Mock API endpoints with configurable delays
- [ ] Basic metrics collection

#### Tasks
1. Create test page routes
2. Build React test components
3. Implement mock API with delay simulation
4. Set up basic logging
5. Document baseline performance

---

### Phase 2: Worker Implementation (Week 2)

#### Deliverables
- [ ] Piscina worker pool integration
- [ ] Worker render implementation
- [ ] Mode switching system (env-based)
- [ ] Serialization layer
- [ ] Worker health checks

#### Tasks
1. Install dependencies (`piscina`)
2. Create `src/server/render-worker.ts`
3. Create `src/server/worker-standalone.ts`
4. Implement request serialization
5. Add worker metrics endpoint
6. Test all scenarios in worker mode

**Reference**: `docs/WORKER-SSR-IMPLEMENTATION.md` (Phase 1)

---

### Phase 3: Load Testing Framework (Week 2-3)

#### Deliverables
- [ ] Load testing scripts (Autocannon/k6)
- [ ] Automated test runner
- [ ] Metrics collection system
- [ ] Result comparison tools
- [ ] Performance profiling integration

#### Tasks
1. Set up Autocannon for HTTP load testing
2. Create test scenarios (varying concurrency/duration)
3. Build metrics aggregation
4. Implement comparison scripts
5. Add CPU/memory profiling
6. Create automated test suite

**Test Configurations**:
```javascript
// scripts/load-tests/config.js
export const testConfigs = [
  { name: 'Low Load', connections: 10, duration: 30 },
  { name: 'Medium Load', connections: 50, duration: 60 },
  { name: 'High Load', connections: 100, duration: 60 },
  { name: 'Spike Test', connections: 200, duration: 30 },
  { name: 'Sustained Load', connections: 100, duration: 300 },
];

export const testPages = [
  '/test/simple',
  '/test/api-heavy',
  '/test/cpu-intensive',
  '/test/streaming',
  '/test/mixed',
  '/test/islands',
];
```

---

### Phase 4: Hybrid Mode (Week 3)

#### Deliverables
- [ ] Hybrid routing implementation
- [ ] Smart decision logic
- [ ] Configuration system
- [ ] Routing metrics
- [ ] A/B testing capability

#### Tasks
1. Implement `shouldStream()` logic
2. Create hybrid handler
3. Add route classification
4. Build configuration system
5. Test routing decisions
6. Validate streaming preservation

**Reference**: `docs/WORKER-SSR-STREAMING-ANALYSIS.md` (Option 2)

---

### Phase 5: Testing & Analysis (Week 4)

#### Deliverables
- [ ] Complete test runs (all modes)
- [ ] Performance comparison reports
- [ ] Streaming analysis
- [ ] Resource utilization analysis
- [ ] Recommendations document

#### Test Matrix:
```
Modes: Traditional | Worker (2T) | Worker (4T) | Worker (8T) | Hybrid
  ×
Pages: Simple | API-Heavy | CPU-Intensive | Streaming | Mixed | Islands
  ×
Loads: Low | Medium | High | Spike | Sustained
  =
150 test scenarios
```

#### Analysis Goals:
1. Identify performance improvements per scenario
2. Measure worker overhead
3. Validate streaming impact
4. Determine optimal configurations
5. Document trade-offs

---

### Phase 6: Documentation & Reporting (Week 4)

#### Deliverables
- [ ] Results documentation
- [ ] Comparison charts/tables
- [ ] Best practices guide
- [ ] Configuration recommendations
- [ ] Reference implementation

#### Documents:
- `docs/TEST-RESULTS.md` - Raw test data
- `docs/ANALYSIS.md` - Performance analysis
- `docs/RECOMMENDATIONS.md` - When to use workers
- `docs/SETUP-GUIDE.md` - How to run tests
- `README.md` - Project overview

---

## Metrics & Analysis

### Primary Metrics

#### 1. Throughput
**Measurement**: Requests per second (req/sec)

**Target Improvement**: +50-150%

**Collection**:
```javascript
// Autocannon output
{
  requests: {
    average: 250,  // req/sec
    total: 15000
  }
}
```

---

#### 2. Latency Distribution
**Measurements**:
- p50 (median)
- p95 (95th percentile)
- p99 (99th percentile)
- max

**Target Improvements**:
- p50: -10-15%
- p95: -15-20%
- p99: -20-30%

**Collection**:
```javascript
{
  latency: {
    p50: 35,    // ms
    p95: 65,
    p99: 120,
    max: 250
  }
}
```

---

#### 3. CPU Utilization
**Measurement**: Per-core usage (%)

**Target**: 70-85% (vs 25% baseline)

**Collection**:
```bash
# Using pidstat
pidstat -u -p <pid> 1 60 > cpu-usage.log
```

---

#### 4. Memory Consumption
**Measurement**: RSS, Heap Used (MB)

**Expected**: +500-1000% (due to worker processes)

**Collection**:
```javascript
// process.memoryUsage()
{
  rss: 1200,      // MB (total)
  heapUsed: 250,  // MB per worker
}
```

---

#### 5. Error Rate
**Measurement**: Failed requests / total requests (%)

**Target**: <0.1% (no increase)

**Collection**:
```javascript
{
  errors: 5,
  total: 15000,
  errorRate: 0.033  // %
}
```

---

### Secondary Metrics

#### 6. Time to First Byte (TTFB)
**Measurement**: Time until first byte received (ms)

**Critical for streaming analysis**

**Collection**:
```bash
curl -w "TTFB: %{time_starttransfer}s\n" http://localhost:4321/test/streaming
```

---

#### 7. Worker Pool Metrics
**Measurements**:
- Active workers
- Queue depth
- Task completion rate
- Worker recycling events

**Collection**:
```javascript
// GET /api/metrics
{
  threads: {
    active: 4,
    max: 8
  },
  queue: {
    size: 12,
    max: 64
  },
  tasks: {
    completed: 15234,
    pending: 8
  }
}
```

---

#### 8. Rendering Breakdown
**Measurements**:
- Serialization time
- Worker dispatch time
- Actual render time
- Deserialization time

**Collection**:
```javascript
// Custom timing
{
  serialize: 2,    // ms
  dispatch: 1,
  render: 45,
  deserialize: 1,
  total: 49
}
```

---

### Analysis Framework

#### Comparison Script
```javascript
// scripts/analyze-results.js
import { compare } from './lib/compare.js';

const baseline = readResults('traditional-mode.json');
const workerMode = readResults('worker-mode-4t.json');

compare(baseline, workerMode, {
  metrics: ['throughput', 'latency', 'cpu', 'memory'],
  pages: ['simple', 'api-heavy', 'cpu-intensive'],
  output: 'markdown',
});
```

#### Output Format
```markdown
## Performance Comparison: Traditional vs Worker (4 threads)

### Simple Page
| Metric | Traditional | Worker | Change |
|--------|-------------|--------|--------|
| Req/sec | 200 | 350 | +75% ✅ |
| p95 Latency | 65ms | 45ms | -31% ✅ |
| CPU Usage | 25% | 75% | +200% |
| Memory | 250MB | 1.2GB | +380% |

### API-Heavy Page
...
```

---

## Expected Outcomes

### Conservative Estimates

Based on Wix's results and accounting for overhead:

#### CPU-Intensive Pages
- **Throughput**: +50-80% improvement
- **Latency p95**: -15-20% improvement
- **CPU Utilization**: 25% → 70%
- **Trade-off**: Memory +500-800%

#### API-Heavy Pages (I/O Bound)
- **Throughput**: +10-20% improvement
- **Latency p95**: -5-10% improvement
- **Analysis**: Workers provide minimal benefit (I/O bound)

#### Simple Pages
- **Throughput**: +100-150% improvement
- **Latency p95**: -20-25% improvement
- **Analysis**: Excellent parallelization

#### Streaming Pages
- **Buffered Mode**: TTFB +200-500ms (terrible)
- **Hybrid Mode**: TTFB unchanged (maintained)
- **Analysis**: Hybrid approach critical

---

### Optimistic Estimates

If overhead is minimal and parallelization is ideal:

#### CPU-Intensive Pages
- **Throughput**: +150-200% improvement
- **Latency p95**: -25-30% improvement
- **CPU Utilization**: 25% → 85%

#### Hybrid Mode Overall
- **Throughput**: +80-120% improvement
- **Latency p95**: -18-22% improvement
- **CPU Utilization**: 25% → 75%
- **TTFB**: No degradation (streaming preserved)

---

### Key Findings to Validate

1. **Worker overhead is acceptable** (<10% of render time)
2. **Serialization cost is minimal** (<5ms per request)
3. **Hybrid routing is effective** (preserves streaming)
4. **Memory trade-off is worthwhile** (better throughput)
5. **Optimal thread count = CPU cores** (linear scaling)

---

## Technology Stack

### Core Framework
- **Astro**: v5.x (SSR mode, standalone adapter)
- **React**: v18.x (SSR components)
- **Node.js**: v22.x (native worker_threads)

### Worker Implementation
- **Piscina**: Worker thread pool management
- **@astrojs/node**: Standalone server adapter

### Load Testing
- **Autocannon**: HTTP load generator
- **k6** (optional): Advanced load testing scenarios

### Monitoring & Profiling
- **pidstat**: CPU/memory monitoring
- **clinic.js** (optional): Performance profiling
- **0x** (optional): CPU flamegraphs

### Analysis & Reporting
- **Custom scripts**: Node.js for data processing
- **Markdown tables**: Results formatting
- **Chart generation** (optional): D3.js or Chart.js

---

## Development Environment

### Requirements
- **CPU**: 4+ cores (to test parallelization)
- **RAM**: 8GB+ (for multiple workers)
- **OS**: Linux/macOS (worker_threads support)
- **Node.js**: v22.x (LTS)

### Setup
```bash
# Clone and install
git clone <repo>
cd astro-react-ssr-experiment
npm install

# Run in traditional mode
npm run build
npm run preview

# Run in worker mode
SSR_MODE=worker WORKER_MAX_THREADS=4 npm run preview

# Run load tests
npm run test:load

# Analyze results
npm run analyze
```

---

## Success Criteria

### Minimum Viable Success
- [ ] 50%+ throughput improvement for CPU-intensive pages
- [ ] No degradation in streaming scenarios (hybrid mode)
- [ ] Error rate remains <0.1%
- [ ] Clear documentation of when to use workers

### Ideal Success
- [ ] 100%+ throughput improvement across most scenarios
- [ ] 20%+ latency reduction (p95)
- [ ] Hybrid mode works automatically
- [ ] Reference implementation ready for production

### Failure Scenarios
- Worker overhead >20% of render time
- Streaming completely broken (no hybrid solution)
- Memory usage unsustainable (>5GB for 4 workers)
- No measurable improvement in any scenario

---

## Timeline

**Total Duration**: 4-5 weeks

| Phase | Duration | Key Deliverable |
|-------|----------|----------------|
| Phase 1: Foundation | Week 1 | Test pages + baseline |
| Phase 2: Worker Impl | Week 2 | Worker mode functional |
| Phase 3: Load Testing | Week 2-3 | Testing framework |
| Phase 4: Hybrid Mode | Week 3 | Smart routing |
| Phase 5: Testing | Week 4 | Complete test runs |
| Phase 6: Documentation | Week 4 | Final report |

---

## Related Documents

- **WORKER-SSR-IMPLEMENTATION.md**: Detailed implementation guide
- **WORKER-SSR-STREAMING-ANALYSIS.md**: Streaming compatibility analysis

---

## Next Steps

### Immediate Actions

1. **Review this plan** - Confirm approach and scope
2. **Set up project structure** - Create directories for tests, components, scripts
3. **Create test pages** - Implement 6 test scenarios
4. **Build mock APIs** - Create configurable delay endpoints
5. **Establish baseline** - Run initial performance tests

### Decision Points

Before starting implementation:
- [ ] Confirm test scenarios (add/remove/modify?)
- [ ] Choose load testing tool (Autocannon vs k6)
- [ ] Decide on profiling tools (clinic.js, 0x?)
- [ ] Agree on success metrics
- [ ] Set timeline expectations

---

**Document Version**: 1.0
**Created**: 2025-11-08
**Status**: Planning
**Next Review**: After Phase 1 completion
