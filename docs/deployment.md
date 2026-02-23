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

See `.env.example` for the full list with comments. Key variables grouped by category:

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | HTTP/WebSocket port |
| `HOST` | 0.0.0.0 | Bind address |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |
| `MUDLIB_PATH` | ./mudlib | Path to mudlib directory |
| `SHUTDOWN_TIMEOUT_MS` | 15000 | Max time for graceful shutdown before force exit |

### Sandbox

| Variable | Default | Description |
|----------|---------|-------------|
| `ISOLATE_MEMORY_MB` | 128 | V8 isolate memory limit |
| `SCRIPT_TIMEOUT_MS` | 5000 | Script execution timeout |
| `HEARTBEAT_INTERVAL_MS` | 2000 | Scheduler heartbeat interval |

### Persistence

| Variable | Default | Description |
|----------|---------|-------------|
| `PERSISTENCE_ADAPTER` | filesystem | Storage backend (`filesystem` or `supabase`) |
| `AUTO_SAVE_INTERVAL_MS` | 300000 | Auto-save interval (5 minutes) |
| `DATA_PATH` | ./mudlib/data | Data directory (filesystem adapter) |
| `SUPABASE_URL` | *(none)* | Supabase project URL (required for supabase adapter) |
| `SUPABASE_SERVICE_KEY` | *(none)* | Supabase service role key (required for supabase adapter) |

### AI Integration

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_API_KEY` | *(none)* | Anthropic API key for AI features |
| `CLAUDE_MODEL` | claude-sonnet-4-20250514 | Claude model to use |
| `CLAUDE_MAX_TOKENS` | 1024 | Max tokens per AI response |
| `CLAUDE_RATE_LIMIT` | 20 | Max AI requests per minute |
| `GEMINI_API_KEY` | *(none)* | Google Gemini key for image generation |

### External Integrations

| Variable | Default | Description |
|----------|---------|-------------|
| `GIPHY_API_KEY` | *(none)* | Giphy API key for GIF sharing |
| `DISCORD_BOT_TOKEN` | *(none)* | Discord bot token for channel bridge |
| `GITHUB_TOKEN` | *(none)* | GitHub token for in-game bug reports |
| `GITHUB_OWNER` | *(none)* | GitHub repo owner |
| `GITHUB_REPO` | *(none)* | GitHub repo name |

### Session Security

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_SESSION_SECRET` | *(none)* | HMAC secret for session tokens (required in production) |
| `WS_SESSION_TOKEN_TTL_MS` | 900000 | Session token TTL (15 minutes) |
| `API_RATE_LIMIT_PER_MINUTE` | 120 | HTTP rate limit |
| `WS_CONNECT_RATE_LIMIT_PER_MINUTE` | 40 | WebSocket connection rate limit |

## Graceful Shutdown

MudForge handles `SIGINT` and `SIGTERM` signals with a graceful shutdown sequence:

1. All active players are saved to persistence
2. The master object's `onShutdown()` hook is called
3. External connections (Intermud, Discord, Grapevine) are disconnected
4. The process exits cleanly

If graceful shutdown takes longer than `SHUTDOWN_TIMEOUT_MS` (default 15 seconds), the process force-exits. This ensures no player data is lost during deployments or server restarts.

## Health Checks

MudForge exposes health endpoints:

- `GET /health` - Basic health check (returns 200 OK)
- `GET /ready` - Readiness check (returns server readiness)

Example health check response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "players": 5,
  "connections": 8
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

### Backing Up Data (Filesystem Adapter)

Important directories to back up:
- `/mudlib/` - All game content
- `/mudlib/data/` - Player saves, world state, permissions, moderation data

```bash
# Create backup
tar -czf mudforge-backup-$(date +%Y%m%d).tar.gz mudlib/ mudlib/data/

# Restore backup
tar -xzf mudforge-backup-20240101.tar.gz
```

### Backing Up Data (Supabase Adapter)

When using the Supabase persistence adapter, data is stored in PostgreSQL tables and Supabase Storage. Use Supabase's built-in backup tools or `pg_dump` for database backups. See [Persistence Adapter](persistence-adapter.md) for table schema details.

### Automated Backups

Add to crontab (filesystem adapter):
```bash
0 */6 * * * cd /path/to/mudforge && tar -czf /backups/mudforge-$(date +\%Y\%m\%d-\%H\%M).tar.gz mudlib/ mudlib/data/
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
