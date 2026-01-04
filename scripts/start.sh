#!/bin/bash
# MudForge Start Script
# Production startup script for MudForge MUD driver

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting MudForge MUD Driver${NC}"

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
  echo -e "${YELLOW}Warning: Running as root is not recommended${NC}"
fi

# Set environment defaults
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export LOG_LEVEL=${LOG_LEVEL:-info}
export MUDLIB_PATH=${MUDLIB_PATH:-./mudlib}

# Check if dist exists
if [ ! -d "dist" ]; then
  echo -e "${YELLOW}Dist folder not found. Building...${NC}"
  npm run build
fi

# Create log directory
mkdir -p logs

# Create data directories
mkdir -p mudlib/data/players

echo -e "${GREEN}Environment: ${NODE_ENV}${NC}"
echo -e "${GREEN}Port: ${PORT}${NC}"
echo -e "${GREEN}Log Level: ${LOG_LEVEL}${NC}"

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
  echo -e "${GREEN}Starting with PM2...${NC}"
  pm2 start ecosystem.config.js --env production
  pm2 save
  echo -e "${GREEN}MudForge started with PM2${NC}"
  echo "Use 'pm2 logs mudforge' to view logs"
  echo "Use 'pm2 stop mudforge' to stop"
else
  echo -e "${YELLOW}PM2 not found. Starting directly...${NC}"
  echo "Consider installing PM2 for production: npm install -g pm2"

  # Run directly with node
  exec node --enable-source-maps dist/driver/index.js
fi
