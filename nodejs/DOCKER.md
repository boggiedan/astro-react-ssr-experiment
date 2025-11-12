# Docker Deployment for Node.js + React SSR

This document describes how to build and run the Node.js SSR application with Docker and docker-compose.

## Quick Start

```bash
# Build and start with default settings (traditional mode, 4 replicas)
docker-compose up --build

# Access the application
curl http://localhost:3000
```

## SSR Modes

### Traditional Mode (Default)
Rendering on main thread. Good for development and low-traffic scenarios.

```bash
docker-compose up --build
```

### Worker Mode
Rendering offloaded to worker threads. Better throughput under load.

```bash
SSR_MODE=worker docker-compose up --build
```

## Scaling Configuration

The setup uses nginx as a load balancer with multiple app replicas.

### Default Configuration (16 CPU cores)
```bash
# 4 replicas × 2 CPUs each = 8 cores reserved (50% utilization)
REPLICAS=4 CPU_RESERVATION=2.0 docker-compose up --build
```

### 8 CPU cores
```bash
# 2 replicas × 2 CPUs each = 4 cores reserved (50% utilization)
REPLICAS=2 CPU_RESERVATION=2.0 docker-compose up --build
```

### 4 CPU cores
```bash
# 1 replica × 2 CPUs = 2 cores reserved (50% utilization)
REPLICAS=1 CPU_RESERVATION=2.0 docker-compose up --build
```

### High Load Configuration
```bash
# 4 replicas × 4 CPUs each = 16 cores reserved (100% utilization)
REPLICAS=4 CPU_RESERVATION=4.0 docker-compose up --build
```

## Worker Thread Configuration

In worker mode, the app auto-detects Docker CPU quotas via cgroups.

### Auto-detection (Recommended)
```bash
# Workers = CPU quota detected from cgroups
SSR_MODE=worker REPLICAS=4 CPU_RESERVATION=2.0 docker-compose up --build
# Result: 2 workers per container × 4 replicas = 8 total workers
```

### Manual Override
```bash
# Force specific number of workers per container
SSR_MODE=worker REPLICAS=4 WORKER_THREADS=4 docker-compose up --build
# Result: 4 workers per container × 4 replicas = 16 total workers
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SSR_MODE` | `traditional` | SSR mode: `traditional` or `worker` |
| `REPLICAS` | `4` | Number of app replicas |
| `CPU_RESERVATION` | `2.0` | CPU cores reserved per replica |
| `MEMORY_LIMIT` | `512M` | Memory limit per replica |
| `MEMORY_RESERVATION` | `256M` | Memory reservation per replica |
| `WORKER_THREADS` | Auto-detect | Manual worker thread override |
| `NGINX_PORT` | `3000` | External port for nginx |

## Development Commands

```bash
# Build the Docker image
docker-compose build

# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f nodejs-app
docker-compose logs -f nginx

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build --force-recreate

# Scale manually (overrides compose file)
docker-compose up --scale nodejs-app=8

# View running containers
docker-compose ps

# Execute command in container
docker-compose exec nodejs-app sh
```

## Health Checks

The setup includes health checks at multiple levels:

### Application Health
```bash
curl http://localhost:3000/api/server-info
```

### Nginx Health
```bash
curl http://localhost:3000/nginx-health
```

### Docker Health Status
```bash
docker-compose ps
# Look for "healthy" status
```

## Performance Testing

```bash
# From project root
npm run benchmark:nodejs           # Light load
npm run benchmark:nodejs:peak      # Peak load (30s, 50 connections)
npm run benchmark:nodejs:stress    # Stress test
npm run benchmark:nodejs:extreme   # Extreme stress
```

## Monitoring

### View Resource Usage
```bash
# All containers
docker stats

# Specific service
docker stats $(docker ps -q -f name=nodejs-app)
```

### View Worker Pool Metrics
```bash
# Check logs for worker pool initialization
docker-compose logs nodejs-app | grep "Worker"

# Example output:
# [Worker 1] Loading route registry...
# [Worker 1] Loaded 5 routes
```

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Port already in use
```bash
# Use different port
NGINX_PORT=3001 docker-compose up
```

### Out of memory
```bash
# Increase memory limits
MEMORY_LIMIT=1G MEMORY_RESERVATION=512M docker-compose up
```

### Workers not starting
```bash
# Check SSR mode is set correctly
docker-compose exec nodejs-app env | grep SSR_MODE

# Check worker thread detection
docker-compose logs nodejs-app | grep "CPU cores"
```

## Production Considerations

1. **Resource Limits**: Adjust `CPU_RESERVATION` and `MEMORY_LIMIT` based on your hardware
2. **Replica Count**: Formula: `REPLICAS = CPU_CORES / CPU_RESERVATION`
3. **Worker Threads**: In worker mode, auto-detection is recommended
4. **Health Checks**: Monitor `/api/server-info` for application health
5. **Logging**: Use `docker-compose logs -f` to monitor application behavior
6. **Graceful Shutdown**: The app handles SIGTERM for graceful worker pool shutdown

## Architecture

```
┌─────────────┐
│   Nginx     │  Load Balancer (port 3000)
│ (least_conn)│
└──────┬──────┘
       │
   ┌───┴────────────────┬─────────────┬─────────────┐
   │                    │             │             │
┌──▼───────────┐ ┌──────▼────┐ ┌─────▼─────┐ ┌────▼──────┐
│ Node.js App  │ │ Node.js   │ │ Node.js   │ │ Node.js   │
│  (Replica 1) │ │(Replica 2)│ │(Replica 3)│ │(Replica 4)│
│              │ │           │ │           │ │           │
│ 2 CPUs       │ │ 2 CPUs    │ │ 2 CPUs    │ │ 2 CPUs    │
│ 256-512 MB   │ │ 256-512 MB│ │ 256-512 MB│ │ 256-512 MB│
└──────────────┘ └───────────┘ └───────────┘ └───────────┘

Traditional Mode: Each replica renders on main thread
Worker Mode: Each replica has 2 workers (auto-detected from CPU quota)
```