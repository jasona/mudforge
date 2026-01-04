# Deployment Guide

This guide covers deploying MudForge in production environments.

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev
```

### Production

```bash
# Build the project
npm run build

# Start in production mode
npm start
```

## Docker Deployment

### Building the Image

```bash
docker build -t mudforge:latest .
```

### Running with Docker

```bash
docker run -d \
  --name mudforge \
  -p 3000:3000 \
  -v $(pwd)/mudlib:/app/mudlib:rw \
  -v $(pwd)/data:/app/data:rw \
  mudforge:latest
```

### Docker Compose (Development)

```bash
docker-compose up -d
```

This mounts the source code for live development with hot reload.

### Docker Compose (Production)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Production configuration includes:
- Resource limits (512MB memory, 0.5 CPU)
- Auto-restart on failure
- Persistent volumes for mudlib and data
- Health checks

## PM2 Deployment

PM2 provides process management with automatic restarts and log management.

### Install PM2

```bash
npm install -g pm2
```

### Start with PM2

```bash
pm2 start ecosystem.config.js
```

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs mudforge

# Restart
pm2 restart mudforge

# Stop
pm2 stop mudforge

# Enable startup on boot
pm2 startup
pm2 save
```

### Cluster Mode

For multi-core systems, uncomment the cluster settings in `ecosystem.config.js`:

```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster',
```

Note: Cluster mode requires additional configuration for shared state.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | HTTP/WebSocket port |
| `HOST` | 0.0.0.0 | Bind address |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |
| `MUDLIB_PATH` | ./mudlib | Path to mudlib directory |

## Health Checks

MudForge exposes health endpoints:

- `GET /health` - Basic health check (returns 200 OK)
- `GET /health/ready` - Readiness check (returns driver status)

Example health check response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "objects": 150,
  "players": 5
}
```

## Logging

### Log Levels

- `debug` - Detailed debugging information
- `info` - General operational information
- `warn` - Warning conditions
- `error` - Error conditions

### Log Output

In development, logs are formatted for readability. In production, logs are JSON for parsing by log aggregators.

### PM2 Logging

PM2 logs are stored in:
- `logs/mudforge-out.log` - Standard output
- `logs/mudforge-error.log` - Error output

Logs are rotated automatically (max 10 files, 10MB each).

## Reverse Proxy Setup

### Nginx Configuration

```nginx
upstream mudforge {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name mud.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mud.example.com;

    ssl_certificate /etc/letsencrypt/live/mud.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mud.example.com/privkey.pem;

    location / {
        proxy_pass http://mudforge;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### Caddy Configuration

```
mud.example.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically handles SSL certificates.

## Backup and Recovery

### Backing Up Data

Important directories to back up:
- `/mudlib/` - All game content
- `/data/` - Player saves and world state

```bash
# Create backup
tar -czf mudforge-backup-$(date +%Y%m%d).tar.gz mudlib/ data/

# Restore backup
tar -xzf mudforge-backup-20240101.tar.gz
```

### Automated Backups

Add to crontab:
```bash
0 */6 * * * cd /path/to/mudforge && tar -czf /backups/mudforge-$(date +\%Y\%m\%d-\%H\%M).tar.gz mudlib/ data/
```

## Security Considerations

### Firewall

Only expose the necessary port:
```bash
# Allow port 3000 (or your chosen port)
ufw allow 3000/tcp
```

### Non-Root User

The Docker image runs as a non-root user by default. For bare metal:
```bash
# Create dedicated user
useradd -r -s /bin/false mudforge

# Set ownership
chown -R mudforge:mudforge /path/to/mudforge

# Run as mudforge user
sudo -u mudforge npm start
```

### Rate Limiting

Configure rate limiting in your reverse proxy to prevent abuse.

## Monitoring

### Health Check Monitoring

Use tools like Uptime Robot or Pingdom to monitor the `/health` endpoint.

### Resource Monitoring

Monitor with PM2:
```bash
pm2 monit
```

Or use system tools:
```bash
# CPU and memory usage
top -p $(pgrep -f mudforge)

# Open connections
netstat -an | grep 3000 | wc -l
```

## Scaling

### Vertical Scaling

Increase resources on a single server:
- More CPU cores (enable PM2 cluster mode)
- More RAM (increase V8 heap size)

### Horizontal Scaling

For multiple servers:
1. Use a load balancer with sticky sessions
2. Implement shared session storage (Redis)
3. Use a shared database for persistence

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Out of memory:**
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

**Permission denied:**
```bash
# Check file ownership
ls -la mudlib/
chown -R $USER:$USER mudlib/
```

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Getting Help

- Check logs: `pm2 logs mudforge` or `docker logs mudforge`
- Review health endpoint: `curl http://localhost:3000/health`
- Check process status: `pm2 status` or `docker ps`
