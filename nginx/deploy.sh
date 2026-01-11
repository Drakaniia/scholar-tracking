#!/bin/bash
# ============================================================================
# NGINX DEPLOYMENT & MANAGEMENT SCRIPT
# ============================================================================
# Helper script for deploying and managing Nginx configuration
# Usage: ./deploy.sh [command]
# ============================================================================

set -e

# Configuration
NGINX_CONFIG_DIR="/etc/nginx"
NGINX_SITES_AVAILABLE="$NGINX_CONFIG_DIR/sites-available"
NGINX_SITES_ENABLED="$NGINX_CONFIG_DIR/sites-enabled"
NGINX_CONF_D="$NGINX_CONFIG_DIR/conf.d"
APP_DIR="/var/www/scholarship-tracking-system"
BACKUP_DIR="/var/backups/nginx"
LOG_DIR="/var/log/nginx"
CACHE_DIR="/var/cache/nginx"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root or with sudo"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# INSTALLATION
# -----------------------------------------------------------------------------

install_nginx() {
    log_info "Installing Nginx..."

    # Detect package manager
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        yum install -y epel-release
        yum install -y nginx
    elif command -v dnf &> /dev/null; then
        dnf install -y nginx
    else
        log_error "Unsupported package manager"
        exit 1
    fi

    log_info "Nginx installed successfully"
}

# -----------------------------------------------------------------------------
# CONFIGURATION DEPLOYMENT
# -----------------------------------------------------------------------------

backup_config() {
    log_info "Backing up current configuration..."

    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    tar -czf "$BACKUP_DIR/nginx_backup_$TIMESTAMP.tar.gz" -C /etc nginx

    log_info "Backup saved to $BACKUP_DIR/nginx_backup_$TIMESTAMP.tar.gz"
}

deploy_config() {
    log_info "Deploying Nginx configuration..."
    check_root

    # Backup existing config
    backup_config

    # Create required directories
    mkdir -p "$NGINX_SITES_AVAILABLE"
    mkdir -p "$NGINX_SITES_ENABLED"
    mkdir -p "$NGINX_CONF_D"
    mkdir -p "$CACHE_DIR"/{proxy_cache,static_cache,api_cache,microcache}
    mkdir -p "$LOG_DIR"
    mkdir -p "$APP_DIR"

    # Copy configuration files
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Main nginx.conf
    cp "$SCRIPT_DIR/nginx.conf" "$NGINX_CONFIG_DIR/nginx.conf"

    # Additional configurations
    cp "$SCRIPT_DIR/conf.d/"*.conf "$NGINX_CONF_D/" 2>/dev/null || true

    # Site configurations
    cp "$SCRIPT_DIR/sites-available/"*.conf "$NGINX_SITES_AVAILABLE/" 2>/dev/null || true

    # Enable site (create symlink)
    ln -sf "$NGINX_SITES_AVAILABLE/scholarship.conf" "$NGINX_SITES_ENABLED/scholarship.conf"

    # Remove default site if exists
    rm -f "$NGINX_SITES_ENABLED/default"

    # Set permissions
    chown -R root:root "$NGINX_CONFIG_DIR"
    chmod -R 644 "$NGINX_CONFIG_DIR"
    find "$NGINX_CONFIG_DIR" -type d -exec chmod 755 {} \;

    # Set cache directory permissions
    chown -R nginx:nginx "$CACHE_DIR"
    chmod -R 755 "$CACHE_DIR"

    log_info "Configuration deployed successfully"
}

# -----------------------------------------------------------------------------
# TESTING & VALIDATION
# -----------------------------------------------------------------------------

test_config() {
    log_info "Testing Nginx configuration..."

    if nginx -t; then
        log_info "Configuration test passed!"
        return 0
    else
        log_error "Configuration test failed!"
        return 1
    fi
}

validate_ssl() {
    log_info "Validating SSL certificates..."

    DOMAIN="scholarship.example.com"
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

    if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
        # Check certificate expiry
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
        log_info "Certificate expires: $EXPIRY"

        # Check if certificate matches key
        CERT_MD5=$(openssl x509 -noout -modulus -in "$CERT_PATH" | md5sum)
        KEY_MD5=$(openssl rsa -noout -modulus -in "$KEY_PATH" | md5sum)

        if [ "$CERT_MD5" == "$KEY_MD5" ]; then
            log_info "Certificate and key match"
        else
            log_error "Certificate and key do not match!"
            return 1
        fi
    else
        log_warn "SSL certificates not found. Run setup_ssl first."
    fi
}

# -----------------------------------------------------------------------------
# SSL SETUP
# -----------------------------------------------------------------------------

setup_ssl() {
    log_info "Setting up SSL certificates with Let's Encrypt..."
    check_root

    DOMAIN="scholarship.example.com"
    EMAIL="admin@example.com"

    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        if command -v apt-get &> /dev/null; then
            apt-get install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            yum install -y certbot python3-certbot-nginx
        fi
    fi

    # Create webroot directory for ACME challenge
    mkdir -p /var/www/certbot

    # Obtain certificate
    certbot certonly \
        --webroot \
        -w /var/www/certbot \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive

    # Generate DH parameters
    if [ ! -f "$NGINX_CONFIG_DIR/ssl/dhparam.pem" ]; then
        log_info "Generating DH parameters (this may take a while)..."
        mkdir -p "$NGINX_CONFIG_DIR/ssl"
        openssl dhparam -out "$NGINX_CONFIG_DIR/ssl/dhparam.pem" 4096
    fi

    # Setup auto-renewal
    echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" >> /etc/crontab

    log_info "SSL setup complete"
}

# -----------------------------------------------------------------------------
# SERVICE MANAGEMENT
# -----------------------------------------------------------------------------

start_nginx() {
    log_info "Starting Nginx..."
    systemctl start nginx
    log_info "Nginx started"
}

stop_nginx() {
    log_info "Stopping Nginx..."
    systemctl stop nginx
    log_info "Nginx stopped"
}

reload_nginx() {
    log_info "Reloading Nginx configuration..."

    if test_config; then
        nginx -s reload
        log_info "Nginx reloaded successfully"
    else
        log_error "Reload aborted due to configuration errors"
        return 1
    fi
}

restart_nginx() {
    log_info "Restarting Nginx..."

    if test_config; then
        systemctl restart nginx
        log_info "Nginx restarted successfully"
    else
        log_error "Restart aborted due to configuration errors"
        return 1
    fi
}

status_nginx() {
    systemctl status nginx
}

# -----------------------------------------------------------------------------
# CACHE MANAGEMENT
# -----------------------------------------------------------------------------

clear_cache() {
    log_info "Clearing Nginx cache..."
    check_root

    rm -rf "$CACHE_DIR"/*
    mkdir -p "$CACHE_DIR"/{proxy_cache,static_cache,api_cache,microcache}
    chown -R nginx:nginx "$CACHE_DIR"

    log_info "Cache cleared"
}

# -----------------------------------------------------------------------------
# LOG MANAGEMENT
# -----------------------------------------------------------------------------

rotate_logs() {
    log_info "Rotating Nginx logs..."

    # Send USR1 signal to reopen log files
    nginx -s reopen

    log_info "Logs rotated"
}

view_logs() {
    tail -f "$LOG_DIR/scholarship.access.log" "$LOG_DIR/scholarship.error.log"
}

view_errors() {
    tail -f "$LOG_DIR/scholarship.error.log"
}

# -----------------------------------------------------------------------------
# APPLICATION DEPLOYMENT
# -----------------------------------------------------------------------------

deploy_app() {
    log_info "Deploying Next.js application..."

    cd "$APP_DIR"

    # Pull latest code
    git pull origin main

    # Install dependencies
    npm ci --production

    # Build application
    npm run build

    # Restart PM2 processes
    pm2 reload all

    # Clear nginx cache
    clear_cache

    # Reload nginx
    reload_nginx

    log_info "Application deployed successfully"
}

# -----------------------------------------------------------------------------
# PERFORMANCE TUNING
# -----------------------------------------------------------------------------

tune_system() {
    log_info "Applying system tuning for Nginx..."
    check_root

    # Increase file descriptor limits
    cat >> /etc/security/limits.conf << EOF
nginx soft nofile 65535
nginx hard nofile 65535
* soft nofile 65535
* hard nofile 65535
EOF

    # Kernel parameters for high-performance networking
    cat >> /etc/sysctl.conf << EOF
# Nginx performance tuning
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_local_port_range = 1024 65535
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
EOF

    sysctl -p

    log_info "System tuning applied"
}

# -----------------------------------------------------------------------------
# MAIN COMMAND HANDLER
# -----------------------------------------------------------------------------

show_help() {
    echo "
Nginx Deployment Script for Scholarship Tracking System

Usage: $0 [command]

Commands:
  install         Install Nginx
  deploy          Deploy configuration files
  test            Test configuration syntax
  validate-ssl    Validate SSL certificates
  setup-ssl       Setup Let's Encrypt SSL

  start           Start Nginx
  stop            Stop Nginx
  reload          Reload configuration (graceful)
  restart         Full restart
  status          Show service status

  clear-cache     Clear all Nginx caches
  rotate-logs     Rotate log files
  logs            View access and error logs
  errors          View error logs only

  deploy-app      Full application deployment
  tune            Apply system tuning
  backup          Backup current configuration

  help            Show this help message
"
}

case "$1" in
    install)      install_nginx ;;
    deploy)       deploy_config ;;
    test)         test_config ;;
    validate-ssl) validate_ssl ;;
    setup-ssl)    setup_ssl ;;
    start)        start_nginx ;;
    stop)         stop_nginx ;;
    reload)       reload_nginx ;;
    restart)      restart_nginx ;;
    status)       status_nginx ;;
    clear-cache)  clear_cache ;;
    rotate-logs)  rotate_logs ;;
    logs)         view_logs ;;
    errors)       view_errors ;;
    deploy-app)   deploy_app ;;
    tune)         tune_system ;;
    backup)       backup_config ;;
    help|*)       show_help ;;
esac
