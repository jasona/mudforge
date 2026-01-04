/**
 * PM2 Ecosystem Configuration
 *
 * Use: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [{
    name: 'mudforge',
    script: 'dist/driver/index.js',

    // Node.js options
    node_args: '--enable-source-maps',

    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug',
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info',
    },

    // Cluster mode (optional)
    instances: 1, // Set to 'max' for cluster mode
    exec_mode: 'fork', // Change to 'cluster' for multiple instances

    // Auto restart
    watch: false, // Set to true for development auto-restart
    max_memory_restart: '1G',

    // Restart configuration
    autorestart: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s',

    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/mudforge-error.log',
    out_file: './logs/mudforge-out.log',
    merge_logs: true,
    log_file: './logs/mudforge-combined.log',

    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,

    // Source maps for error tracking
    source_map_support: true,
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/mudforge.git',
      path: '/opt/mudforge',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
