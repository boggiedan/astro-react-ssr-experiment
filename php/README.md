# PHP SSR Performance Test

This PHP application replicates the Astro+React SSR test scenarios to enable direct performance comparison between PHP and Node.js-based server-side rendering.

## Structure

```
php/
├── public/              # Web root
│   └── index.php       # Front controller
├── src/
│   ├── Api/            # API endpoints
│   ├── Pages/          # Test pages
│   ├── Lib/            # Data processing & utilities
│   └── Views/          # HTML templates
├── Dockerfile          # Docker container
├── docker-compose.yml  # Multi-replica deployment
└── nginx-*.conf        # Nginx configurations
```

## Quick Start

### Development (without Docker)

1. Ensure PHP 8.3+ is installed
2. Start PHP built-in server:
   ```bash
   cd php/public
   php -S localhost:8080
   ```
3. Access: http://localhost:8080

### Production (with Docker)

1. Build and run:
   ```bash
   cd php
   docker-compose up --build
   ```
2. Access: http://localhost:8080

### Multi-replica deployment

```bash
REPLICAS=4 docker-compose up --build
```

## Running Benchmarks

From the project root:

```bash
# Benchmark PHP (default port 8080)
npm run benchmark -- --url http://localhost:8080

# Custom configuration
npm run benchmark:peak -- --url http://localhost:8080
```

Results are saved to `/benchmark/results/` and can be viewed in the Astro benchmark viewer at `http://localhost:4321/benchmark-results`.

## Test Scenarios

- **`/`** - Homepage with links to all tests
- **`/test/simple`** - Baseline rendering (10-20ms expected)
- **`/test/api-heavy`** - I/O bound with 3 API calls (150-450ms expected)
- **`/test/cpu-intensive`** - CPU bound with 2500 items (200-500ms expected)
- **`/test/mixed`** - Real-world mix of API + CPU work (150-400ms expected)

## API Endpoints

- **`/api/server-info`** - Server configuration (identifies as PHP)
- **`/api/user`** - Mock user data
- **`/api/posts`** - Mock posts array
- **`/api/comments`** - Mock comments array
- **`/api/data`** - Large dataset for processing
- **`/api/metrics`** - PHP runtime metrics

## Configuration

Environment variables:

- `INTERNAL_API_URL` - Internal API URL for Docker (default: http://localhost:8080)
- `REPLICAS` - Number of replicas in Docker (default: 4)
- `PORT` - Server port (default: 8080)
- `API_DELAY_MS` - Default API delay in milliseconds (default: varies by endpoint)

## Performance Optimizations

- OPcache enabled with optimized settings
- PHP-FPM process manager tuned for concurrency
- Nginx load balancing with `least_conn` algorithm
- Connection pooling and keep-alive enabled

## Comparison with Astro

| Feature | PHP | Astro+React |
|---------|-----|-------------|
| Runtime | PHP 8.3+ | Node.js 22+ |
| Rendering | Server-side (traditional) | SSR with optional workers |
| Concurrency | Process-based (PHP-FPM) | Event loop + optional workers |
| HTML Output | Pure HTML | HTML + React hydration |
| Parallelism | Multi-process | Single-threaded or multi-threaded |

Both implementations:
- Use the same test logic and data processing algorithms
- Make the same API calls with identical delays
- Generate similar HTML output
- Run in Docker with comparable resource limits
- Save results in the same benchmark format

## Troubleshooting

**Port already in use:**
```bash
# Change port in docker-compose.yml or use:
docker-compose down
```

**Permission errors:**
```bash
# Ensure proper ownership
chown -R $(whoami):$(whoami) php/
```

**API calls failing:**
- Check `INTERNAL_API_URL` is set correctly in Docker
- Verify all containers are running: `docker-compose ps`