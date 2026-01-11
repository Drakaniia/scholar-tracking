# Nginx Configuration Guide
## Scholarship Tracking System

This directory contains production-ready Nginx configuration for the Scholarship Tracking System.

---

## 📁 Directory Structure

```
nginx/
├── nginx.conf                    # Main configuration file
├── conf.d/
│   ├── security.conf            # Security rules & bot blocking
│   ├── upstream.conf            # Load balancing configurations
│   └── caching.conf             # Caching strategies
├── sites-available/
│   └── scholarship.conf         # Site-specific server block
├── deploy.sh                    # Deployment & management script
└── Dockerfile                   # Docker configuration
```

---

## 🚀 Quick Start

### Option 1: Direct Installation (Linux)

```bash
# 1. Install Nginx
./nginx/deploy.sh install

# 2. Deploy configuration
sudo ./nginx/deploy.sh deploy

# 3. Setup SSL (adjust domain in script first)
sudo ./nginx/deploy.sh setup-ssl

# 4. Test configuration
sudo ./nginx/deploy.sh test

# 5. Start Nginx
sudo ./nginx/deploy.sh start
```

### Option 2: Docker Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.nginx.yml up -d

# View logs
docker-compose -f docker-compose.nginx.yml logs -f nginx
```

---

## ⚙️ Configuration Files

### Main Config (`nginx.conf`)

| Setting | Value | Purpose |
|---------|-------|---------|
| `worker_processes` | auto | Match CPU cores |
| `worker_connections` | 4096 | Connections per worker |
| `keepalive_timeout` | 65s | Connection reuse |
| `gzip` | on | Compression enabled |
| `ssl_protocols` | TLSv1.2 TLSv1.3 | Modern TLS only |

### Site Config (`scholarship.conf`)

- HTTP → HTTPS redirect
- SSL/TLS with Let's Encrypt
- Reverse proxy to Next.js (port 3000)
- Static file caching (1 year for /_next/static/)
- API rate limiting (5 req/s)
- Auth rate limiting (1 req/s)
- WebSocket support for HMR
- Security headers (HSTS, CSP, etc.)

### Security (`security.conf`)

- Bot blocking patterns
- SQL injection detection
- XSS attack prevention
- Path traversal blocking
- Request method filtering

### Load Balancing (`upstream.conf`)

Strategies included:
- Round-robin (default)
- Least connections
- IP hash (sticky sessions)
- Consistent hash
- Blue-green deployment
- Canary deployment

### Caching (`caching.conf`)

Cache levels:
- `static_cache` - 7 days for assets
- `proxy_cache` - 60 min for pages
- `api_cache` - 10 min for API responses
- `microcache` - 1 second for high-traffic

---

## 🔐 SSL Setup

### Let's Encrypt (Recommended)

1. Update domain in `nginx/deploy.sh`:
   ```bash
   DOMAIN="your-domain.com"
   EMAIL="your-email@example.com"
   ```

2. Run SSL setup:
   ```bash
   sudo ./nginx/deploy.sh setup-ssl
   ```

3. Auto-renewal is configured via crontab.

### Custom Certificates

1. Place certificates in `/etc/nginx/ssl/`:
   ```
   /etc/nginx/ssl/your-domain.crt
   /etc/nginx/ssl/your-domain.key
   ```

2. Update `scholarship.conf`:
   ```nginx
   ssl_certificate /etc/nginx/ssl/your-domain.crt;
   ssl_certificate_key /etc/nginx/ssl/your-domain.key;
   ```

---

## 📊 Rate Limiting

| Zone | Rate | Purpose |
|------|------|---------|
| `general` | 10 req/s | All requests |
| `api` | 5 req/s | API endpoints |
| `auth` | 1 req/s | Login/register (brute force protection) |

To adjust, modify in `nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

---

## 🔧 Management Commands

```bash
# Configuration
./deploy.sh test           # Test configuration syntax
./deploy.sh reload         # Reload configuration (graceful)
./deploy.sh restart        # Full restart

# Monitoring
./deploy.sh status         # Service status
./deploy.sh logs           # View access & error logs
./deploy.sh errors         # View error logs only

# Maintenance
./deploy.sh clear-cache    # Clear all caches
./deploy.sh rotate-logs    # Rotate log files
./deploy.sh backup         # Backup current config

# Deployment
./deploy.sh deploy         # Deploy config files
./deploy.sh deploy-app     # Full application deployment
```

---

## 🎯 Performance Tuning

### System-Level (Linux)

Run once on server setup:
```bash
sudo ./deploy.sh tune
```

This configures:
- File descriptor limits (65535)
- TCP backlog and buffer sizes
- Connection reuse settings

### Nginx-Level

Already optimized in config:
- `sendfile on` - Efficient file transfers
- `tcp_nopush on` - Optimized packet sending
- `tcp_nodelay on` - Low latency
- `gzip` - Compression for text content
- `keepalive` - Connection pooling

---

## 🛡️ Security Headers

Headers automatically added:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (customizable)

---

## 📈 Monitoring

### Nginx Status Page

Access at `/nginx-status` (internal IPs only):
```
Active connections: 150
server accepts handled requests
 10000 10000 50000
Reading: 0 Writing: 50 Waiting: 100
```

### Health Check

Available at `/health`:
```bash
curl http://localhost/health
# Returns: healthy
```

### Log Locations

| Log | Path |
|-----|------|
| Access | `/var/log/nginx/scholarship.access.log` |
| Error | `/var/log/nginx/scholarship.error.log` |

---

## 🔄 Load Balancing Setup

For multiple Next.js instances:

1. Edit `conf.d/upstream.conf`:
   ```nginx
   upstream nextjs_cluster {
       least_conn;
       server 127.0.0.1:3000 weight=5;
       server 127.0.0.1:3001 weight=5;
       server 127.0.0.1:3002 weight=3;
       keepalive 32;
   }
   ```

2. Update `scholarship.conf` to use cluster:
   ```nginx
   proxy_pass http://nextjs_cluster;
   ```

3. Reload: `./deploy.sh reload`

---

## 🐛 Troubleshooting

### Common Issues

**Config test fails:**
```bash
nginx -t 2>&1 | head -20
```

**Permission denied:**
```bash
sudo chown -R nginx:nginx /var/cache/nginx
sudo chmod -R 755 /var/cache/nginx
```

**502 Bad Gateway:**
- Check if Next.js is running
- Verify upstream port matches
- Check firewall rules

**SSL certificate issues:**
```bash
./deploy.sh validate-ssl
```

### Debug Mode

Enable debug logging temporarily:
```nginx
error_log /var/log/nginx/error.log debug;
```

---

## 📝 Customization Checklist

Before deployment, update:

- [ ] Domain name in `scholarship.conf`
- [ ] Domain and email in `deploy.sh`
- [ ] Upstream servers in `upstream.conf`
- [ ] Content-Security-Policy in `scholarship.conf`
- [ ] Rate limits if needed
- [ ] Cache durations if needed

---

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [Nginx Security Tips](https://www.nginx.com/blog/nginx-security-tips/)
