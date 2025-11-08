# Performance Benchmarking

This directory contains scripts for performance testing and monitoring of the Astro SSR application.

## Prerequisites

Make sure the dev server is running:
```bash
npm run dev
```

## Available Scripts

### 1. Baseline Performance Test (`baseline.js`)

Runs load tests against all test pages and collects comprehensive metrics.

**Usage:**
```bash
# Run all tests with default config (30s duration, 10 connections)
node benchmark/baseline.js

# Custom configuration
node benchmark/baseline.js --duration 60 --connections 50

# Test specific URL
node benchmark/baseline.js --url http://localhost:4321/test/cpu-intensive
```

**Options:**
- `--url` - Base URL (default: http://localhost:4321)
- `--duration` - Test duration in seconds (default: 30)
- `--connections` - Concurrent connections (default: 10)

**Output:**
- Console results with real-time progress
- JSON file saved to `benchmark/results/baseline-[timestamp].json`
- Summary table comparing all scenarios

**Metrics Collected:**
- Requests per second (mean, average, total)
- Latency (mean, p50, p75, p90, p95, p99, p999, min, max)
- Throughput (bytes/sec)
- Error count and timeouts

### 2. Resource Monitor (`monitor.js`)

Monitors CPU and memory usage of the Node.js process during testing.

**Usage:**
```bash
# Auto-detect Astro dev server process
node benchmark/monitor.js

# Monitor specific process
node benchmark/monitor.js --pid 12345

# Custom interval and duration
node benchmark/monitor.js --interval 500 --duration 120
```

**Options:**
- `--pid` - Process ID to monitor (auto-detected if not provided)
- `--interval` - Sampling interval in ms (default: 1000)
- `--duration` - Monitoring duration in seconds (default: 60)

**Output:**
- Real-time console updates showing CPU/Memory
- JSON file saved to `benchmark/results/monitor-[pid]-[timestamp].json`
- Statistical summary (mean, min, max, p50, p95, p99)

### 3. Combined Testing Workflow

Run baseline tests with monitoring:

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
# Start monitoring (will auto-detect the dev server PID)
node benchmark/monitor.js --duration 180
```

**Terminal 3:**
```bash
# Wait a few seconds, then run baseline tests
node benchmark/baseline.js --duration 30 --connections 20
```

## Test Scenarios

The baseline script tests 5 scenarios:

1. **Simple SSR** - Minimal overhead baseline
   - Expected: 10-20ms response time
   - Tests basic SSR performance

2. **API-Heavy** - I/O bound workload
   - Expected: 150-450ms response time
   - 3 parallel API calls with delays
   - Tests how workers handle I/O-bound pages

3. **CPU-Intensive** - CPU bound workload
   - Expected: 100-300ms response time
   - Heavy data processing (1000 items)
   - Tests worker effectiveness for CPU work

4. **Streaming** - Progressive rendering
   - Expected: 5-50ms TTFB
   - Tests HTML streaming behavior
   - Important for worker compatibility analysis

5. **Mixed** - Real-world scenario
   - Expected: 150-400ms response time
   - Combination of API calls (30%) and CPU work (70%)
   - Simulates typical production workload

## Results Directory

All results are saved to `benchmark/results/`:
- `baseline-[timestamp].json` - Load test results
- `monitor-[pid]-[timestamp].json` - Resource monitoring data

Results include:
- Full configuration
- All metrics and statistics
- Raw sample data (for monitor)
- Timestamp for correlation

## Example Output

### Baseline Test Results
```
📊 Performance Comparison
──────────────────────────────────────────────────────────────────────────────────────
Scenario            Req/s       Mean(ms)    P95(ms)     P99(ms)     Errors
──────────────────────────────────────────────────────────────────────────────────────
Simple SSR          524.12      18.45       23.12       28.56       0
API-Heavy           23.45       425.67      512.34      587.23      0
CPU-Intensive       42.67       234.12      289.45      345.67      0
Streaming           612.34      15.23       19.45       24.12       0
Mixed               31.23       320.45      398.12      456.78      0
──────────────────────────────────────────────────────────────────────────────────────
```

### Monitor Results
```
📊 Summary Statistics
══════════════════════════════════════════════════

CPU Usage (%)
  Mean:  45.23%
  Min:   12.34%
  Max:   89.56%
  p50:   42.12%
  p95:   78.45%
  p99:   85.23%

Memory Usage (MB)
  Mean:  234.56 MB
  Min:   198.23 MB
  Max:   287.45 MB
  p50:   231.12 MB
  p95:   268.34 MB
  p99:   278.92 MB

Total samples: 120
```

## Next Steps

After collecting baseline metrics:

1. Review results to establish performance baseline
2. Implement worker-based SSR (Phase 2)
3. Run same tests with workers enabled
4. Compare results to measure improvement
5. Analyze specific scenarios for optimization

## Troubleshooting

**"Cannot connect to server"**
- Ensure `npm run dev` is running
- Check that port 4321 is accessible
- Verify URL with `--url` parameter if using different port

**"No process to monitor"**
- Make sure dev server is running
- Try specifying PID manually with `--pid`
- Check process list: `ps aux | grep node`

**High error rates**
- Reduce connection count: `--connections 5`
- Increase test duration: `--duration 60`
- Check server logs for errors