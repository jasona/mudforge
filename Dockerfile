# MudForge Driver Dockerfile
# Builds and runs the MUD server

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY tsconfig*.json ./
COPY src/ ./src/
COPY mudlib/ ./mudlib/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S mudforge && adduser -S mudforge -G mudforge

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy mudlib (needed at runtime)
COPY mudlib/ ./mudlib/

# Create data directories
RUN mkdir -p mudlib/data/players && chown -R mudforge:mudforge /app

# Switch to non-root user
USER mudforge

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Start the server
CMD ["node", "dist/driver/index.js"]
