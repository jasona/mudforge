/**
 * Server - HTTP and WebSocket server using Fastify.
 *
 * Serves the web client and handles WebSocket connections for the MUD.
 */

import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { join, resolve } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { Connection } from './connection.js';
import { ConnectionManager, getConnectionManager } from './connection-manager.js';
import { EventEmitter } from 'events';
import type { Logger } from 'pino';
import { getDriverVersion, getGameConfig, loadGameConfig } from '../driver/version.js';
import { getAdapter } from '../driver/persistence/adapter-factory.js';

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

type EventArgs<T, K extends keyof T> = T[K] extends (...args: infer A) => void ? A : never;

/** Default heartbeat interval in milliseconds (10 seconds).
 * Reduced from 45s to catch buffer buildup and stuck connections faster.
 */
const DEFAULT_HEARTBEAT_INTERVAL_MS = 10000;

/** Default maximum missed pong responses before terminating connection.
 * At 10s heartbeat interval, 18 missed pongs = 3 minutes of tolerance.
 * This allows time for brief network hiccups while still detecting truly stuck connections.
 */
const DEFAULT_MAX_MISSED_PONGS = 18;

/**
 * MUD server handling HTTP and WebSocket connections.
 */
export class Server extends EventEmitter {
  private config: ServerConfig;
  private fastify: FastifyInstance;
  private connectionManager: ConnectionManager;
  private running: boolean = false;
  private shuttingDown: boolean = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs: number;
  private maxMissedPongs: number;
  private readonly apiRateLimitPerMinute: number;
  private readonly wsRateLimitPerMinute: number;
  private apiRateLimitMap: Map<string, { count: number; windowStart: number }> = new Map();
  private wsRateLimitMap: Map<string, { count: number; windowStart: number }> = new Map();

  onEvent<K extends keyof ServerEvents>(
    event: K,
    listener: (...args: EventArgs<ServerEvents, K>) => void
  ): this {
    this.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  emitEvent<K extends keyof ServerEvents>(
    event: K,
    ...args: EventArgs<ServerEvents, K>
  ): boolean {
    return this.emit(event as string, ...args);
  }

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
    this.apiRateLimitPerMinute = Number.parseInt(process.env['API_RATE_LIMIT_PER_MINUTE'] ?? '120', 10);
    this.wsRateLimitPerMinute = Number.parseInt(process.env['WS_CONNECT_RATE_LIMIT_PER_MINUTE'] ?? '40', 10);

    this.connectionManager = getConnectionManager();

    // Create Fastify instance
    this.fastify = Fastify({
      logger: this.config.logger ? true : false,
      disableRequestLogging: !this.config.logHttpRequests,
    });
  }

  private isValidImageKey(value: string): boolean {
    return /^[A-Za-z0-9_]+$/.test(value);
  }

  private async serveCachedImageJson(imageJsonPath: string, reply: FastifyReply): Promise<void> {
    try {
      const content = await readFile(imageJsonPath, 'utf-8');
      const parsed = JSON.parse(content) as { image?: string; mimeType?: string };
      if (!parsed.image || typeof parsed.image !== 'string') {
        reply.code(404).send({ error: 'Image data not found' });
        return;
      }

      const mimeType = typeof parsed.mimeType === 'string' && parsed.mimeType.startsWith('image/')
        ? parsed.mimeType
        : 'image/png';

      const buffer = Buffer.from(parsed.image, 'base64');
      reply
        .type(mimeType)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(buffer);
    } catch {
      reply.code(404).send({ error: 'Image not found' });
    }
  }

  /**
   * Set up HTTP routes and WebSocket handler.
   */
  private async setupRoutes(): Promise<void> {
    this.fastify.addHook('preHandler', async (request, reply) => {
      if (!request.url.startsWith('/api/')) {
        return;
      }
      const allowed = this.consumeRateLimit(this.apiRateLimitMap, request.ip ?? 'unknown', this.apiRateLimitPerMinute);
      if (allowed) {
        return;
      }
      reply.code(429).send({ error: 'Too many requests. Please try again later.' });
    });

    // Register static file serving
    await this.fastify.register(fastifyStatic, {
      root: resolve(this.config.clientPath),
      prefix: '/',
    });

    // Register WebSocket support
    await this.fastify.register(fastifyWebsocket, {
      options: {
        maxPayload: 1024 * 1024, // 1MB max message size (for IDE saves, portraits, etc.)
        perMessageDeflate: {
          zlibDeflateOptions: { level: 6 },
          threshold: 128, // Only compress messages > 128 bytes
        },
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
      if (!this.running || this.shuttingDown) {
        throw new Error('Server not ready');
      }
      return { status: 'ready' };
    });

    // Game/driver configuration endpoint (for client branding)
    this.fastify.get('/api/config', async () => {
      const game = getGameConfig();
      const driver = getDriverVersion();
      const logoPath = resolve(this.config.mudlibPath, 'config', 'logo.png');
      let hasLogo = false;
      try {
        await readFile(logoPath);
        hasLogo = true;
      } catch {
        // no logo file
      }
      return {
        game: {
          name: game?.name ?? 'MudForge',
          tagline: game?.tagline ?? 'Your Adventure Awaits',
          version: game?.version ?? '1.0.0',
          description: game?.description ?? 'A Modern MUD Experience',
          establishedYear: game?.establishedYear ?? 2026,
          website: game?.website ?? 'https://www.mudforge.org',
          setupComplete: game?.setupComplete ?? false,
        },
        driver: {
          name: driver.name,
          version: driver.version,
        },
        logo: hasLogo,
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

    // Logo endpoint - serves the game logo if it exists
    this.fastify.get('/api/logo', async (request, reply) => {
      const logoPath = resolve(this.config.mudlibPath, 'config', 'logo.png');
      try {
        const data = await readFile(logoPath);
        reply.type('image/png').send(data);
      } catch {
        reply.code(404).send({ error: 'No logo configured' });
      }
    });

    // Object image endpoint - serves cached generated object images.
    this.fastify.get('/api/images/object/:cacheKey', async (request, reply) => {
      const params = request.params as { cacheKey?: string };
      const cacheKey = params.cacheKey ?? '';
      if (!this.isValidImageKey(cacheKey)) {
        reply.code(400).send({ error: 'Invalid image key' });
        return;
      }

      const underscoreIndex = cacheKey.indexOf('_');
      if (underscoreIndex <= 0) {
        reply.code(400).send({ error: 'Invalid object image key format' });
        return;
      }

      const objectType = cacheKey.slice(0, underscoreIndex);
      if (!this.isValidImageKey(objectType)) {
        reply.code(400).send({ error: 'Invalid object image type' });
        return;
      }

      const adapter = getAdapter();
      const imageData = await adapter.loadData<{ image?: string; mimeType?: string }>(`images-${objectType}`, cacheKey);
      if (!imageData?.image) {
        reply.code(404).send({ error: 'Image not found' });
        return;
      }
      const mimeType = typeof imageData.mimeType === 'string' && imageData.mimeType.startsWith('image/')
        ? imageData.mimeType
        : 'image/png';
      const buffer = Buffer.from(imageData.image, 'base64');
      reply
        .type(mimeType)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(buffer);
    });

    // Portrait image endpoint - serves cached NPC portraits.
    this.fastify.get('/api/images/portrait/:id', async (request, reply) => {
      const params = request.params as { id?: string };
      const id = params.id ?? '';
      if (!this.isValidImageKey(id)) {
        reply.code(400).send({ error: 'Invalid portrait key' });
        return;
      }

      const adapter = getAdapter();
      const imageData = await adapter.loadData<{ image?: string; mimeType?: string }>('portraits', id);
      if (!imageData?.image) {
        reply.code(404).send({ error: 'Image not found' });
        return;
      }
      const mimeType = typeof imageData.mimeType === 'string' && imageData.mimeType.startsWith('image/')
        ? imageData.mimeType
        : 'image/png';
      const buffer = Buffer.from(imageData.image, 'base64');
      reply
        .type(mimeType)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(buffer);
    });

    // Setup defaults endpoint - returns ConfigDaemon setting metadata
    this.fastify.get('/api/setup/defaults', async () => {
      try {
        const adapter = getAdapter();
        const savedValues: Record<string, unknown> = (await adapter.loadData<Record<string, unknown>>('config', 'settings')) ?? {};

        // Return the default settings with metadata
        // These mirror the ConfigDaemon DEFAULT_SETTINGS
        const defaults: Record<string, { value: unknown; description: string; type: string; min?: number; max?: number; category: string }> = {
          'disconnect.timeoutMinutes': { value: 15, description: 'Minutes before a disconnected player is automatically saved and quit', type: 'number', min: 1, max: 60, category: 'Disconnect' },
          'combat.playerKilling': { value: false, description: 'Allow players to attack and kill other players (PK/PvP)', type: 'boolean', category: 'Combat' },
          'corpse.playerDecayMinutes': { value: 60, description: 'Minutes before player corpses decay (0 = never)', type: 'number', min: 0, max: 480, category: 'Corpses' },
          'corpse.npcDecayMinutes': { value: 5, description: 'Minutes before NPC corpses decay', type: 'number', min: 1, max: 60, category: 'Corpses' },
          'reset.intervalMinutes': { value: 15, description: 'Minutes between room resets', type: 'number', min: 5, max: 120, category: 'Room Resets' },
          'reset.cleanupDroppedItems': { value: true, description: 'Clean up non-player-owned items during room reset', type: 'boolean', category: 'Room Resets' },
          'time.enabled': { value: true, description: 'Enable the day/night cycle (affects outdoor room lighting)', type: 'boolean', category: 'Day/Night Cycle' },
          'time.cycleDurationMinutes': { value: 60, description: 'Real minutes per game day (60 = 1 real hour per 24 game hours)', type: 'number', min: 1, max: 1440, category: 'Day/Night Cycle' },
          'giphy.enabled': { value: true, description: 'Enable Giphy GIF sharing on channels', type: 'boolean', category: 'Giphy' },
          'giphy.autoCloseSeconds': { value: 5, description: 'Seconds before GIF panel auto-closes (0 to disable, max 300 = 5 min)', type: 'number', min: 0, max: 300, category: 'Giphy' },
          'giphy.rating': { value: 'pg', description: 'Content rating filter (g, pg, pg-13, r)', type: 'string', category: 'Giphy' },
          'giphy.playerRateLimitPerMinute': { value: 3, description: 'Max GIF shares per player per minute', type: 'number', min: 1, max: 20, category: 'Giphy' },
          'discord.enabled': { value: false, description: 'Enable Discord channel bridge', type: 'boolean', category: 'Discord' },
          'discord.guildId': { value: '', description: 'Discord server (guild) ID', type: 'string', category: 'Discord' },
          'discord.channelId': { value: '', description: 'Discord channel ID to bridge', type: 'string', category: 'Discord' },
          'bots.enabled': { value: false, description: 'Enable the bot system (simulated players)', type: 'boolean', category: 'Bots' },
          'bots.maxBots': { value: 5, description: 'Maximum number of bots that can be online at once', type: 'number', min: 1, max: 50, category: 'Bots' },
          'bots.minOnlineMinutes': { value: 15, description: 'Minimum minutes a bot stays online per session', type: 'number', min: 5, max: 240, category: 'Bots' },
          'bots.maxOnlineMinutes': { value: 120, description: 'Maximum minutes a bot stays online per session', type: 'number', min: 15, max: 480, category: 'Bots' },
          'bots.minOfflineMinutes': { value: 30, description: 'Minimum minutes a bot stays offline between sessions', type: 'number', min: 5, max: 480, category: 'Bots' },
          'bots.maxOfflineMinutes': { value: 240, description: 'Maximum minutes a bot stays offline between sessions', type: 'number', min: 30, max: 1440, category: 'Bots' },
          'bots.chatFrequencyMinutes': { value: 10, description: 'Average minutes between bot channel messages', type: 'number', min: 1, max: 60, category: 'Bots' },
        };

        // Merge saved values over defaults
        for (const [key, setting] of Object.entries(defaults)) {
          if (key in savedValues) {
            setting.value = savedValues[key];
          }
        }

        return { settings: defaults };
      } catch {
        return { settings: {} };
      }
    });

    // Setup endpoint - first-run configuration wizard
    this.fastify.post('/api/setup', async (request, reply) => {
      const game = getGameConfig();
      if (game?.setupComplete) {
        reply.code(403).send({ error: 'Setup already completed' });
        return;
      }

      const body = request.body as {
        game?: { name?: string; tagline?: string; description?: string; website?: string; establishedYear?: number };
        logo?: string;
        config?: Record<string, unknown>;
      };

      if (!body?.game?.name?.trim()) {
        reply.code(400).send({ error: 'Game name is required' });
        return;
      }

      try {
        // 1. Write game.json
        const configDir = resolve(this.config.mudlibPath, 'config');
        await mkdir(configDir, { recursive: true });

        const gameConfigPath = resolve(configDir, 'game.json');
        let existingGameConfig: Record<string, unknown> = {};
        try {
          const content = await readFile(gameConfigPath, 'utf-8');
          existingGameConfig = JSON.parse(content);
        } catch {
          // No existing config
        }

        const newGameConfig = {
          ...existingGameConfig,
          name: body.game.name.trim(),
          tagline: body.game.tagline?.trim() || 'Your Adventure Awaits',
          description: body.game.description?.trim() || 'A Modern MUD Experience',
          website: body.game.website?.trim() || '',
          establishedYear: body.game.establishedYear || new Date().getFullYear(),
          setupComplete: true,
        };

        await writeFile(gameConfigPath, JSON.stringify(newGameConfig, null, 2));

        // 2. Write logo if provided
        if (body.logo) {
          const match = body.logo.match(/^data:image\/[^;]+;base64,(.+)$/);
          if (match?.[1]) {
            const buffer = Buffer.from(match[1], 'base64');
            if (buffer.length <= 256 * 1024) {
              const logoPath = resolve(configDir, 'logo.png');
              await writeFile(logoPath, buffer);
            }
          }
        }

        // 3. Write config settings
        if (body.config && typeof body.config === 'object') {
          const settingsDir = resolve(this.config.mudlibPath, 'data', 'config');
          await mkdir(settingsDir, { recursive: true });

          const settingsPath = resolve(settingsDir, 'settings.json');
          let existingSettings: Record<string, unknown> = {};
          try {
            const content = await readFile(settingsPath, 'utf-8');
            existingSettings = JSON.parse(content);
          } catch {
            // No existing settings
          }

          const newSettings = { ...existingSettings, ...body.config };
          await writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
        }

        // 4. Reload cached game config
        loadGameConfig(this.config.mudlibPath);

        return { success: true };
      } catch (error) {
        this.config.logger?.error({ error }, 'Failed to save setup');
        reply.code(500).send({ error: 'Failed to save configuration' });
        return;
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
    if (this.shuttingDown) {
      socket.close(1001, 'Server shutting down');
      return;
    }
    const id = this.connectionManager.generateId();
    const remoteAddress = request.ip || 'unknown';
    const allowed = this.consumeRateLimit(this.wsRateLimitMap, remoteAddress, this.wsRateLimitPerMinute);
    if (!allowed) {
      socket.close(1013, 'Rate limit exceeded');
      return;
    }

    const connection = new Connection(socket, id, remoteAddress);
    this.connectionManager.add(connection);

    // Forward events with error boundaries to prevent exceptions from affecting other connections
    connection.onEvent('message', (message: string) => {
      try {
        this.emitEvent('message', connection, message);
      } catch (error) {
        this.config.logger?.error({ connectionId: connection.id, error }, 'Error in message handler');
      }
    });

    connection.onEvent('close', (code: number, reason: string) => {
      try {
        this.emitEvent('disconnect', connection, code, reason);
      } catch (error) {
        this.config.logger?.error({ connectionId: connection.id, error }, 'Error in disconnect handler');
      }
    });

    connection.onEvent('error', (error: Error) => {
      try {
        this.emitEvent('error', error);
      } catch (emitError) {
        this.config.logger?.error({ connectionId: connection.id, error, emitError }, 'Error in error handler');
      }
    });

    // Emit connection event
    this.emitEvent('connection', connection);
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

      this.shuttingDown = false;
      this.running = true;
      this.startHeartbeat();
      console.log(`Server listening on ${this.config.host}:${this.config.port}`);
      console.log(`[WS-CONFIG] heartbeatIntervalMs=${this.heartbeatIntervalMs}, maxMissedPongs=${this.maxMissedPongs}`);
    } catch (error) {
      this.emitEvent('error', error as Error);
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
    let lastHeartbeatAt = Date.now();

    this.heartbeatInterval = setInterval(() => {
      heartbeatCount++;
      const now = Date.now();
      // Measure per-tick scheduler delay rather than cumulative drift since startup.
      // Cumulative drift grows forever from normal callback overhead and causes false alarms.
      const delayMs = Math.max(0, now - lastHeartbeatAt - this.heartbeatIntervalMs);
      lastHeartbeatAt = now;

      const connections = this.connectionManager.getAll();

      // Log heartbeat execution only when there's an issue or periodically (every 100 heartbeats ~= 40 minutes)
      if (delayMs > 1000) {
        console.warn(`[HEARTBEAT #${heartbeatCount}] DELAYED by ${delayMs}ms - checking ${connections.length} connections`);
      } else if (heartbeatCount % 100 === 0) {
        // Periodic health check log
        console.log(`[HEARTBEAT #${heartbeatCount}] Checking ${connections.length} connections (delay: ${delayMs}ms)`);
      }

      for (const connection of connections) {
        try {
          const playerName = connection.player?.name || 'no-player';

          // Skip connections that are already closed or closing
          // This prevents repeatedly processing terminated connections
          if (connection.state === 'closed' || connection.state === 'closing') {
            console.log(`[HEARTBEAT] ${connection.id} (${playerName}): SKIPPING - state=${connection.state}, removing from manager`);
            // Clean up: remove from connection manager and emit disconnect
            this.connectionManager.remove(connection.id);
            this.emitEvent('disconnect', connection, 1006, 'Connection already closed');
            continue;
          }

          // Check for critically large buffer - this indicates the client can't receive data
          // (e.g., network issue, suspended browser tab, laptop sleeping).
          // Terminate these connections immediately to prevent unbounded memory growth
          // and allow the player to reconnect when their connection is restored.
          const bufferedAmount = connection.bufferedAmount;
          if (connection.hasCriticalBackpressure) {
            this.config.logger?.warn(
              {
                id: connection.id,
                bufferedAmount,
                bufferedMB: (bufferedAmount / (1024 * 1024)).toFixed(2),
              },
              'Connection terminated: critical buffer backlog (client cannot receive data)'
            );
            console.error(`[HEARTBEAT] ${connection.id} (${playerName}): TERMINATING - critical buffer backlog ${(bufferedAmount / (1024 * 1024)).toFixed(2)}MB (client cannot receive data, allowing reconnect)`);
            connection.terminate();
            this.connectionManager.remove(connection.id);
            this.emitEvent('disconnect', connection, 1006, 'Buffer backlog exceeded');
            continue;
          }

          // Get metrics for potential logging
          const metrics = connection.getHealthMetrics();

          // Only log connection status when there's something concerning
          // (missed pongs, high lastActivity, etc.)
          if (metrics.missedPongs > 0 || metrics.lastActivity > this.heartbeatIntervalMs * 2) {
            console.log(`[HEARTBEAT] ${connection.id} (${playerName}): missedPongs=${metrics.missedPongs}, state=${metrics.state}, lastActivity=${metrics.lastActivity}ms ago`);
          }

          // If connection has significant backpressure, skip ping - it would just queue behind
          // the existing data and never reach the client anyway. The buffer check above will
          // catch connections that are truly stuck.
          if (connection.hasBackpressure) {
            console.warn(`[HEARTBEAT] ${connection.id} (${playerName}): SKIPPING ping - backpressure (buffer=${(bufferedAmount / 1024).toFixed(0)}KB)`);
            // Still increment missed pongs since we're not sending a ping the client could respond to
            connection.incrementMissedPongs();
            continue;
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
            this.emitEvent('disconnect', connection, 1006, 'Heartbeat timeout');
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

  private consumeRateLimit(
    map: Map<string, { count: number; windowStart: number }>,
    key: string,
    limitPerMinute: number
  ): boolean {
    const now = Date.now();
    const existing = map.get(key);

    if (!existing || now - existing.windowStart >= 60_000) {
      map.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (existing.count >= limitPerMinute) {
      return false;
    }

    existing.count += 1;
    map.set(key, existing);
    return true;
  }

  /**
   * Stop the server.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.shuttingDown = true;

    // Stop heartbeat
    this.stopHeartbeat();

    // Close all connections
    this.connectionManager.closeAll(1001, 'Server shutting down');

    // Stop Fastify
    await this.fastify.close();

    this.running = false;
    console.log('Server stopped');
  }

  beginShutdown(): void {
    this.shuttingDown = true;
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
