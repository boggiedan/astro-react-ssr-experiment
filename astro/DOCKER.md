# Docker Deployment Guide

This guide explains how to deploy the Astro SSR application with load balancing using Docker and nginx.

## Architecture

```
Internet → nginx (Port 80) → Load Balancer
                              ↓
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
         Replica 1       Replica 2       Replica 3       Replica 4
         (4 cores)       (4 cores)       (4 cores)       (4 cores)
```

## Quick Start

### 1. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` based on your CPU cores:

**For 16-core machine:**
```bash
SSR_MODE=traditional
REPLICAS=4
CPU_PER_REPLICA=4.0
CPU_RESERVATION=2.0
MEMORY_LIMIT=512M
```

**For 8-core machine:**
```bash
SSR_MODE=traditional
REPLICAS=2
CPU_PER_REPLICA=4.0
CPU_RESERVATION=2.0
MEMORY_LIMIT=512M
```

### 2. Build and Run

```bash
# Build the Docker image
docker-compose build

# Start the application (detached mode)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### 3. Access the Application

- **Application:** http://localhost
- **nginx Health Check:** http://localhost/nginx-health
- **App Server Info:** http://localhost/api/server-info

## SSR Modes

You can switch between different SSR modes by changing the `SSR_MODE` environment variable:

### Traditional (Single-threaded per replica)
```bash
SSR_MODE=traditional docker-compose up -d
```
- Each replica uses 1 CPU core
- Load distributed across replicas

### Worker (Multi-threaded per replica)
```bash
SSR_MODE=worker docker-compose up -d
```
- Each replica spawns worker threads
- Best CPU utilization with replicas

### Hybrid (Mixed single + worker threads)
```bash
SSR_MODE=hybrid docker-compose up -d
```
- API routes on main thread
- CPU-intensive on workers

### Fetch-Proxy (Experimental)
```bash
SSR_MODE=fetch-proxy docker-compose up -d
```
- Internal fetches routed to other workers
- Parallel rendering of internal API calls

## Scaling

### Scale replicas up
```bash
docker-compose up -d --scale astro-app=8
```

### Scale replicas down
```bash
docker-compose up -d --scale astro-app=2
```

**Note:** nginx will automatically detect and route to all replicas.

## CPU Configuration Strategy

The default configuration uses **no CPU limits** to allow maximum performance:

```yaml
REPLICAS=4
# No CPU limits - containers can burst to 100% CPU usage
# Kernel scheduler balances load across all replicas
```

**Benefits:**
- Containers can use 100% of available CPU when needed
- Better handling of traffic spikes and bursty workloads
- Linux kernel scheduler efficiently balances load across replicas
- Maximum throughput under heavy load

**How it works:**
- Each replica has a minimum CPU reservation (2.0 cores by default)
- No upper limit on CPU usage - replicas can burst to use all available cores
- nginx load balancer distributes requests evenly
- Kernel scheduler ensures fair CPU allocation

**Alternative: CPU Limits (if needed)**
If you need strict CPU isolation, you can add limits back to docker-compose.yml:
```yaml
resources:
  limits:
    cpus: '${CPU_PER_REPLICA:-4.0}'  # Uncomment and adjust as needed
```

## Monitoring

### Check replica status
```bash
docker-compose ps
```

### View specific replica logs
```bash
docker-compose logs astro-app
```

### Monitor resource usage
```bash
docker stats
```

### Health checks
```bash
# Check nginx
curl http://localhost/nginx-health

# Check app replicas (nginx adds upstream server header)
curl -I http://localhost/
```

## Benchmarking

Run benchmarks against the load-balanced setup:

```bash
# From host machine
npm run benchmark:peak -- --url http://localhost

# Or with autocannon directly
npx autocannon -c 50 -d 30 http://localhost/test/mixed
```

## Production Deployment

For production, consider:

1. **Use a reverse proxy with SSL:**
   - Cloudflare, AWS ALB, or nginx with Let's Encrypt

2. **Add monitoring:**
   - Prometheus + Grafana for metrics
   - ELK stack for logs

3. **Auto-scaling:**
   - Use Kubernetes for automatic scaling
   - Or PM2 with ecosystem.config.js

4. **Resource optimization:**
   - Adjust `CPU_PER_REPLICA` based on actual load
   - Monitor memory usage and adjust `MEMORY_LIMIT`

## Troubleshooting

### Replica not starting
```bash
# Check logs
docker-compose logs astro-app

# Check health
docker inspect <container-id> | grep Health
```

### nginx not routing
```bash
# Check nginx config
docker-compose exec nginx nginx -t

# Reload nginx
docker-compose exec nginx nginx -s reload
```

### High CPU usage
```bash
# Check which replica
docker stats

# Scale down if needed
docker-compose up -d --scale astro-app=2
```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove images
docker-compose down --rmi all

# Remove volumes (if any)
docker-compose down -v
```