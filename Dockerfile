# Multi-stage build for Astro SSR application
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Astro app and custom server
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 astro

# Copy necessary files from builder
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

# Switch to non-root user
USER astro

# Expose port
EXPOSE 4321

# Default SSR mode (can be overridden via environment variable)
ENV SSR_MODE=traditional
ENV HOST=0.0.0.0
ENV PORT=4321

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4321/api/server-info', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the appropriate server based on SSR_MODE
CMD if [ "$SSR_MODE" = "traditional" ]; then \
      node dist/server/custom-server.js; \
    elif [ "$SSR_MODE" = "worker" ]; then \
      node dist/server/custom-server.js; \
    elif [ "$SSR_MODE" = "hybrid" ]; then \
      node dist/server/custom-server.js; \
    elif [ "$SSR_MODE" = "fetch-proxy" ]; then \
      node dist/server/custom-server-fetch-proxy.js; \
    else \
      node dist/server/custom-server.js; \
    fi