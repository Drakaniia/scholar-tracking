# ============================================================================
# NGINX DOCKER CONFIGURATION
# ============================================================================
# Production-ready Nginx Docker setup for Scholarship Tracking System
# ============================================================================

FROM nginx:1.27-alpine

# Labels
LABEL maintainer="admin@example.com"
LABEL description="Nginx reverse proxy for Scholarship Tracking System"
LABEL version="1.0.0"

# Install additional tools
RUN apk add --no-cache \
    curl \
    openssl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Asia/Manila

# Create required directories
RUN mkdir -p \
    /var/cache/nginx/proxy_cache \
    /var/cache/nginx/static_cache \
    /var/cache/nginx/api_cache \
    /var/cache/nginx/microcache \
    /var/log/nginx \
    /etc/nginx/sites-available \
    /etc/nginx/sites-enabled \
    /etc/nginx/ssl \
    /var/www/certbot

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/*.conf /etc/nginx/conf.d/
COPY sites-available/*.conf /etc/nginx/sites-available/

# Enable site configuration
RUN ln -sf /etc/nginx/sites-available/scholarship.conf /etc/nginx/sites-enabled/

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /var/cache/nginx \
    && chmod -R 755 /var/cache/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Nginx will run in foreground
CMD ["nginx", "-g", "daemon off;"]
