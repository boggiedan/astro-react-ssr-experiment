# Multi-stage build for PHP SSR application
FROM php:8.3-fpm-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/cache/apk/*

# Configure PHP-FPM for performance
RUN echo "pm = dynamic" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_children = 50" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.start_servers = 10" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.min_spare_servers = 5" >> /usr/local/etc/php-fpm.d/www.conf \
    && echo "pm.max_spare_servers = 20" >> /usr/local/etc/php-fpm.d/www.conf

# Configure PHP for production
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.interned_strings_buffer=8" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini

# Production image
FROM base AS runner

WORKDIR /var/www/html

# Copy application code
COPY . .

# Configure nginx
COPY nginx-php.conf /etc/nginx/http.d/default.conf

# Set permissions
RUN chown -R nobody:nobody /var/www/html \
    && chown -R nobody:nobody /var/log/nginx \
    && chown -R nobody:nobody /var/lib/nginx

# Expose port
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV INTERNAL_API_URL=""
ENV REPLICAS=1

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/server-info || exit 1

# Start PHP-FPM and nginx using supervisor
CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]