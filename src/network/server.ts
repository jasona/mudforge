/**
 * Server - HTTP and WebSocket server using Fastify.
 *
 * Serves the web client and handles WebSocket connections for the MUD.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { join, resolve } from 'path';
import { readFile } from 'fs/promises';
import { Connection } from './connection.js';
import { ConnectionManager, getConnectionManager } from './connection-manager.js';
import { EventEmitter } from 'events';
import type { Logger } from 'pino';
import { getDriverVersion, getGameConfig } from '../driver/version.js';

/**
 * Server configuration.
 */
export interface ServerConfig {
  /** HTTP port */
  port: number;
  /** Bind address */
  host: string;
  /** Path to static client files */
  clientPath: string;
  /** Path to mudlib directory */
  mudlibPath: string;
  /** Logger instance */
  logger?: Logger;
  /** Enable HTTP request logging (default: false) */
  logHttpRequests?: boolean;
  /** WebSocket heartbeat interval in milliseconds (default: 45000) */
  wsHeartbeatIntervalMs?: number;
  /** Maximum missed pong responses before terminating connection (default: 2) */
  wsMaxMissedPongs?: number;
}

/**
 * Server events.
 */
export interface ServerEvents {
  connection: (connection: Connection) => void;
  disconnect: (connection: Connection, code: number, reason: string) => void;
  message: (connection: Connection, message: string) => void;
  error: (error: Error) => void;
}

/** Default heartbeat interval in milliseconds (45 seconds) */
const DEFAULT_HEARTBEAT_INTERVAL_MS = 45000;

/** Default maximum missed pong responses before terminating connection.
 * Set high to allow connections to survive browser tab suspension and device sleep.
 * At 45s heartbeat interval, 100 missed pongs = ~75 minutes of tolerance.
 */
const DEFAULT_MAX_MISSED_PONGS = 100;

/**
 * MUD server handling HTTP and WebSocket connections.
 */
export class Server extends EventEmitter {
  private config: ServerConfig;
  private fastify: FastifyInstance;
  private connectionManager: ConnectionManager;
  private running: boolean = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs: number;
  private maxMissedPongs: number;

  constructor(config: Partial<ServerConfig> = {}) {
    super();

    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? '0.0.0.0',
      clientPath: config.clientPath ?? join(process.cwd(), 'dist', 'client'),
      mudlibPath: config.mudlibPath ?? join(process.cwd(), 'mudlib'),
      ...(config.logger ? { logger: config.logger } : {}),
    };

    // Initialize WebSocket heartbeat settings from config
    this.heartbeatIntervalMs = config.wsHeartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.maxMissedPongs = config.wsMaxMissedPongs ?? DEFAULT_MAX_MISSED_PONGS;

    this.connectionManager = getConnectionManager();

    // Create Fastify instance
    this.fastify = Fastify({
      logger: this.config.logger ? true : false,
      disableRequestLogging: !this.config.logHttpRequests,
    });
  }

  /**
   * Set up HTTP routes and WebSocket handler.
   */
  private async setupRoutes(): Promise<void> {
    // Register static file serving
    await this.fastify.register(fastifyStatic, {
      root: resolve(this.config.clientPath),
      prefix: '/',
    });

    // Register WebSocket support
    await this.fastify.register(fastifyWebsocket, {
      options: {
        maxPayload: 1024 * 1024, // 1MB max message size (for IDE saves, portraits, etc.)
      },
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return {
        status: 'ok',
        uptime: process.uptime(),
        players: this.connectionManager.playerCount,
        connections: this.connectionManager.count,
      };
    });

    // Readiness check endpoint
    this.fastify.get('/ready', async () => {
      if (!this.running) {
        throw new Error('Server not ready');
      }
      return { status: 'ready' };
    });

    // Game/driver configuration endpoint (for client branding)
    this.fastify.get('/api/config', async () => {
      const game = getGameConfig();
      const driver = getDriverVersion();
      return {
        game: {
          name: game?.name ?? 'MudForge',
          tagline: game?.tagline ?? 'Your Adventure Awaits',
          version: game?.version ?? '1.0.0',
          description: game?.description ?? 'A Modern MUD Experience',
          establishedYear: game?.establishedYear ?? 2026,
          website: game?.website ?? 'https://www.mudforge.org',
        },
        driver: {
          name: driver.name,
          version: driver.version,
        },
        // Indicate if GitHub bug reports are configured
        hasBugReports: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO),
      };
    });

    // Playable races endpoint (for registration)
    // Data is generated by the race daemon from mudlib/std/race/definitions.ts
    this.fastify.get('/api/races', async () => {
      try {
        const racesPath = resolve(this.config.mudlibPath, 'data', 'races.json');
        const content = await readFile(racesPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        // Fallback if races.json doesn't exist yet (first startup)
        return [
          { id: 'human', name: 'Human', shortDescription: 'Versatile and adaptable', statBonuses: {}, abilities: [] }
        ];
      }
    });

    // Announcements endpoint (for login screen)
    this.fastify.get('/api/announcements', async () => {
      try {
        const announcementsPath = resolve(this.config.mudlibPath, 'data', 'announcements', 'announcements.json');
        const content = await readFile(announcementsPath, 'utf-8');
        const data = JSON.parse(content);
        // Sort by createdAt descending (newest first)
        const sorted = (data.announcements || []).sort(
          (a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt
        );
        return {
          latest: sorted[0] || null,
          all: sorted,
        };
      } catch {
        // Fallback if announcements.json doesn't exist yet
        return {
          latest: null,
          all: [],
        };
      }
    });

    // WebSocket endpoint
    this.fastify.get('/ws', { websocket: true }, (socket: WebSocket, request) => {
      this.handleWebSocketConnection(socket, request);
    });
  }

  /**
   * Handle a new WebSocket connection.
   */
  private handleWebSocketConnection(socket: WebSocket, request: { ip?: string }): void {
    const id = this.connectionManager.generateId();
    const remoteAddress = request.ip || 'unknown';

    const connection = new Connection(socket, id, remoteAddress);
    this.connectionManager.add(connection);

    // Forward events with error boundaries to prevent exceptions from affecting other connections
    connection.on('message', (message: string) => {
      try {
        this.emit('message', connection, message);
      } catch (error) {
        this.config.logger?.error({ connectionId: connection.id, error }, 'Error in message handler');
      }
    });

    connection.on('close', (code: number, reason: string) => {
      try {
        this.emit('disconnect', connection, code, reason);
      } catch (error) {
        this.config.logger?.error({ connectionId: connection.id, error }, 'Error in disconnect handler');
      }
    });

    connection.on('error', (error: Error) => {
      try {
        this.emit('error', error);
      } catch (emitError) {
        this.config.logger?.error({ connectionId: connection.id, error, emitError }, 'Error in error handler');
      }
    });

    // Emit connection event
    this.emit('connection', connection);
  }

  /**
   * Start the server.
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      await this.setupRoutes();
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });

      this.running = true;
      this.startHeartbeat();
      console.log(`Server listening on ${this.config.host}:${this.config.port}`);
      console.log(`[WS-CONFIG] heartbeatIntervalMs=${this.heartbeatIntervalMs}, maxMissedPongs=${this.maxMissedPongs}`);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Start the WebSocket heartbeat interval.
   * Sends ping frames to all connections periodically to keep them alive.
   * Allows up to maxMissedPongs missed responses before terminating.
   * Also sends data-frame keep-alives to satisfy load balancer idle timeouts.
   */
  private startHeartbeat(): void {
    let heartbeatCount = 0;
    const startTime = Date.now();

    this.heartbeatInterval = setInterval(() => {
      heartbeatCount++;
      const expectedTime = startTime + (heartbeatCount * this.heartbeatIntervalMs);
      const drift = Date.now() - expectedTime;

      const connections = this.connectionManager.getAll();

      // Log heartbeat execution only when there's an issue or periodically (every 100 heartbeats ~= 40 minutes)
      if (drift > 1000) {
        console.warn(`[HEARTBEAT #${heartbeatCount}] DELAYED by ${drift}ms - checking ${connections.length} connections`);
      } else if (heartbeatCount % 100 === 0) {
        // Periodic health check log
        console.log(`[HEARTBEAT #${heartbeatCount}] Checking ${connections.length} connections (drift: ${drift}ms)`);
      }

      for (const connection of connections) {
        try {
          const playerName = connection.player ? (connection.player as { name?: string }).name || 'unknown' : 'no-player';

          // Skip connections that are already closed or closing
          // This prevents repeatedly processing terminated connections
          if (connection.state === 'closed' || connection.state === 'closing') {
            console.log(`[HEARTBEAT] ${connection.id} (${playerName}): SKIPPING - state=${connection.state}, removing from manager`);
            // Clean up: remove from connection manager and emit disconnect
            this.connectionManager.remove(connection.id);
            this.emit('disconnect', connection, 1006, 'Connection already closed');
            continue;
          }

          // Get metrics for potential logging
          const metrics = connection.getHealthMetrics();

          // Only log connection status when there's something concerning
          // (missed pongs, high lastActivity, etc.)
          if (metrics.missedPongs > 0 || metrics.lastActivity > this.heartbeatIntervalMs * 2) {
            console.log(`[HEARTBEAT] ${connection.id} (${playerName}): missedPongs=${metrics.missedPongs}, state=${metrics.state}, lastActivity=${metrics.lastActivity}ms ago`);
          }

          // Increment missed pongs counter before sending new ping
          const missedPongs = connection.incrementMissedPongs();

          if (missedPongs > this.maxMissedPongs) {
            // Connection has missed too many heartbeats - terminate it
            this.config.logger?.warn(
              {
                id: connection.id,
                ...metrics,
              },
              'Connection terminated: missed too many heartbeats'
            );
            console.warn(`[HEARTBEAT] ${connection.id} (${playerName}): TERMINATING - missedPongs ${missedPongs} > max ${this.maxMissedPongs}`);
            connection.terminate();

            // IMPORTANT: terminate() calls cleanup() which removes listeners before socket.terminate()
            // This means the normal close event won't fire, so we must manually clean up:
            // 1. Remove from connection manager
            this.connectionManager.remove(connection.id);
            // 2. Emit disconnect event so driver can clean up connectionHandlers
            this.emit('disconnect', connection, 1006, 'Heartbeat timeout');
            continue;
          }

          // Send WebSocket ping frame (application-level heartbeat)
          connection.ping();

          // Also send a time message with server timestamp
          // This creates actual WebSocket data frames that load balancers/proxies
          // recognize as "activity", preventing idle connection timeouts
          // The client displays this as a clock in the header
          // Include game version for cache invalidation detection
          const gameVersion = getGameConfig()?.version;
          connection.sendTime(gameVersion);
        } catch (error) {
          this.config.logger?.error({ connectionId: connection.id, error }, 'Error in heartbeat for connection');
          console.error(`[HEARTBEAT] Error for connection ${connection.id}:`, error);
        }
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop the WebSocket heartbeat interval.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Stop the server.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Close all connections
    this.connectionManager.closeAll(1001, 'Server shutting down');

    // Stop Fastify
    await this.fastify.close();

    this.running = false;
    console.log('Server stopped');
  }

  /**
   * Check if the server is running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the connection manager.
   */
  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  /**
   * Get the Fastify instance.
   */
  getFastify(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Get the server port.
   */
  get port(): number {
    return this.config.port;
  }

  /**
   * Get the server host.
   */
  get host(): string {
    return this.config.host;
  }
}

export default Server;
