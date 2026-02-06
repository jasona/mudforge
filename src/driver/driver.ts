/**
 * Driver - Main orchestrator for the MUD driver.
 *
 * Coordinates all subsystems:
 * - Object Registry
 * - Mudlib Loading
 * - Scheduler
 * - Network connections
 */

import { loadConfig, validateConfig, type DriverConfig } from './config.js';
import { ObjectRegistry, getRegistry, resetRegistry } from './object-registry.js';
import { Scheduler, getScheduler, resetScheduler } from './scheduler.js';
import { EfunBridge, getEfunBridge, resetEfunBridge } from './efun-bridge.js';
import { MudlibLoader, getMudlibLoader, resetMudlibLoader } from './mudlib-loader.js';
import { initializeClaudeClient } from './claude-client.js';
import { initializeGeminiClient } from './gemini-client.js';
import { initializeGitHubClient } from './github-client.js';
import { initializeGiphyClient } from './giphy-client.js';
import { CommandManager, getCommandManager, resetCommandManager } from './command-manager.js';
import { getPermissions } from './permissions.js';
import { getFileStore } from './persistence/file-store.js';
import { Compiler } from './compiler.js';
import { HotReload } from './hot-reload.js';
import { getIsolatePool, resetIsolatePool } from '../isolation/isolate-pool.js';
import { resetScriptRunner } from '../isolation/script-runner.js';
import { createI3Client, destroyI3Client } from '../network/i3-client.js';
import { createI2Client, destroyI2Client } from '../network/i2-client.js';
import { createGrapevineClient, destroyGrapevineClient } from '../network/grapevine-client.js';
import { createDiscordClient, destroyDiscordClient } from '../network/discord-client.js';
import { getSessionManager, resetSessionManager, type SessionManager } from '../network/session-manager.js';
import pino, { type Logger } from 'pino';
import type { MudObject } from './types.js';
import type { Connection } from '../network/connection.js';
import { join } from 'path';
import { loadGameConfig } from './version.js';

/**
 * Master object interface.
 * The Master object is the central authority in the mudlib.
 */
export interface MasterObject extends MudObject {
  /** Called when the driver starts */
  onDriverStart?(): void | Promise<void>;

  /** Called to get list of objects to preload */
  onPreload?(): string[] | Promise<string[]>;

  /** Called when the driver shuts down */
  onShutdown?(): void | Promise<void>;

  /** Called when a new player connects */
  onPlayerConnect?(connection: Connection): string | Promise<string>;

  /** Called when a player disconnects */
  onPlayerDisconnect?(player: MudObject): void | Promise<void>;

  /** Validate read access to a file */
  validRead?(path: string, player: MudObject | null): boolean | Promise<boolean>;

  /** Validate write access to a file */
  validWrite?(path: string, player: MudObject | null): boolean | Promise<boolean>;

  /** Called when a runtime error occurs */
  onRuntimeError?(error: Error, object: MudObject | null): void | Promise<void>;
}

/**
 * Auth request from GUI launcher.
 */
export interface AuthRequest {
  type: 'login' | 'register';
  name?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  gender?: string;
}

/**
 * Login daemon interface.
 */
export interface LoginDaemon extends MudObject {
  startSession(connection: Connection): void;
  processInput(connection: Connection, input: string): void | Promise<void>;
  handleDisconnect(connection: Connection): void;
  handleAuthRequest?(connection: Connection, request: AuthRequest): void | Promise<void>;
}

export type DriverState = 'stopped' | 'starting' | 'running' | 'stopping';

/**
 * Main MUD driver class.
 */
export class Driver {
  private config: DriverConfig;
  private logger: Logger;
  private registry: ObjectRegistry;
  private scheduler: Scheduler;
  private efunBridge: EfunBridge;
  private mudlibLoader: MudlibLoader;
  private commandManager: CommandManager;
  private compiler: Compiler;
  private hotReload: HotReload;
  private sessionManager: SessionManager;
  private master: MasterObject | null = null;
  private loginDaemon: LoginDaemon | null = null;
  private state: DriverState = 'stopped';

  // Track connections to their handlers (login daemon or player)
  private connectionHandlers: Map<Connection, MudObject> = new Map();

  // Track active players in the game world (by lowercase name)
  // Players remain here even when disconnected, until they quit properly
  private activePlayers: Map<string, MudObject> = new Map();

  constructor(config?: Partial<DriverConfig>) {
    this.config = config ? { ...loadConfig(), ...config } : loadConfig();

    // Validate configuration
    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Configuration errors: ${errors.join(', ')}`);
    }

    // Initialize logger
    this.logger = this.config.logPretty
      ? pino({
          level: this.config.logLevel,
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        })
      : pino({ level: this.config.logLevel });

    // Initialize subsystems
    this.registry = getRegistry();
    this.scheduler = getScheduler({
      heartbeatIntervalMs: this.config.heartbeatIntervalMs,
    });
    this.efunBridge = getEfunBridge({
      mudlibPath: this.config.mudlibPath,
    });

    // Load game configuration (name, version, tagline)
    const gameConfig = loadGameConfig(this.config.mudlibPath);
    this.logger.info({ game: gameConfig.name, version: gameConfig.version }, 'Game config loaded');

    // Initialize Claude AI client if configured
    if (this.config.claudeApiKey) {
      initializeClaudeClient({
        apiKey: this.config.claudeApiKey,
        model: this.config.claudeModel,
        maxTokens: this.config.claudeMaxTokens,
        rateLimitPerMinute: this.config.claudeRateLimitPerMinute,
        cacheTtlMs: this.config.claudeCacheTtlMs,
      });
      this.logger.info('Claude AI client initialized');
    }

    // Initialize Gemini AI client if configured (for image generation)
    if (this.config.geminiApiKey) {
      initializeGeminiClient({
        apiKey: this.config.geminiApiKey,
        model: this.config.geminiModel,
        rateLimitPerMinute: this.config.geminiRateLimitPerMinute,
        cacheTtlMs: this.config.geminiCacheTtlMs,
      });
      this.logger.info('Gemini AI client initialized (Nano Banana image generation)');
    }

    // Initialize GitHub client if configured (for bug reports)
    if (this.config.githubToken && this.config.githubOwner && this.config.githubRepo) {
      initializeGitHubClient({
        token: this.config.githubToken,
        owner: this.config.githubOwner,
        repo: this.config.githubRepo,
      });
      this.logger.info('GitHub client initialized (bug reports)');
    }

    // Initialize Giphy client if configured (for GIF sharing on channels)
    if (this.config.giphyApiKey) {
      initializeGiphyClient({
        apiKey: this.config.giphyApiKey,
      });
      this.logger.info('Giphy client initialized (GIF sharing)');
    }

    // Set up the bind player callback so login daemon can bind players
    this.efunBridge.setBindPlayerCallback((connection, player) => {
      this.bindPlayerToConnection(connection as Connection, player);
    });

    // Set up the all players callback so mudlib can get connected players
    this.efunBridge.setAllPlayersCallback(() => {
      return this.getAllPlayers();
    });

    // Set up the find connected player callback for session takeover
    this.efunBridge.setFindConnectedPlayerCallback((name) => {
      return this.findConnectedPlayer(name);
    });

    // Set up the transfer connection callback for session takeover
    this.efunBridge.setTransferConnectionCallback((connection, player) => {
      this.transferConnection(connection as Connection, player);
    });

    // Set up the find active player callback for reconnection
    this.efunBridge.setFindActivePlayerCallback((name) => {
      return this.findActivePlayer(name);
    });

    // Set up the register/unregister active player callbacks
    this.efunBridge.setRegisterActivePlayerCallback((player) => {
      this.registerActivePlayer(player);
    });
    this.efunBridge.setUnregisterActivePlayerCallback((player) => {
      this.unregisterActivePlayer(player);
    });

    this.mudlibLoader = getMudlibLoader({
      mudlibPath: this.config.mudlibPath,
    });
    this.commandManager = getCommandManager({
      cmdsPath: join(this.config.mudlibPath, 'cmds'),
      logger: this.logger,
      watchEnabled: this.config.hotReload,
      savePlayer: (player) => this.efunBridge.savePlayer(player),
    });

    // Set up the execute command callback so mudlib can use the command system
    this.efunBridge.setExecuteCommandCallback(async (player, input, level) => {
      // Save current context so we can restore it after command execution
      // This is important when executeCommand is called from within another context (e.g., GUI handlers)
      const savedContext = this.efunBridge.getContext();

      // Set efun context so commands can use efuns that need player context
      this.efunBridge.setContext({ thisPlayer: player, thisObject: player });
      try {
        // Resolve aliases before executing (but not for alias/unalias commands)
        const resolvedInput = this.resolveAlias(player, input);

        // First try normal commands
        const handled = await this.commandManager.execute(player, resolvedInput, level);
        if (handled) return true;

        // Fall back to emotes (soul daemon)
        return await this.tryEmote(player, resolvedInput);
      } finally {
        // Restore previous context (or clear if there wasn't one)
        if (savedContext.thisPlayer || savedContext.thisObject) {
          this.efunBridge.setContext(savedContext);
        } else {
          this.efunBridge.clearContext();
        }
      }
    });

    this.compiler = new Compiler({
      mudlibPath: this.config.mudlibPath,
    });
    this.hotReload = new HotReload(
      {
        mudlibPath: this.config.mudlibPath,
        watchEnabled: this.config.hotReload,
        safelist: ['/std/player', '/master', '/daemons/login'],
      },
      this.registry
    );

    // Initialize session manager for WebSocket reconnection
    this.sessionManager = getSessionManager({
      secret: this.config.wsSessionSecret || undefined,
      ttlMs: this.config.wsSessionTokenTtlMs,
      validateIp: this.config.wsSessionValidateIp,
    } as { secret?: string; ttlMs?: number; validateIp?: boolean });
  }

  /**
   * Start the driver.
   */
  async start(): Promise<void> {
    if (this.state !== 'stopped') {
      throw new Error(`Cannot start driver in state: ${this.state}`);
    }

    this.state = 'starting';
    this.logger.info('Starting MudForge Driver...');

    try {
      // Initialize isolate pool (for future sandbox use)
      getIsolatePool({
        memoryLimitMb: this.config.isolateMemoryMb,
        maxIsolates: this.config.maxIsolates,
      });

      // Load Master object
      await this.loadMaster();

      // Call onDriverStart hook
      if (this.master?.onDriverStart) {
        await this.master.onDriverStart();
      }

      // Get preload list and load objects
      if (this.master?.onPreload) {
        const preloadList = await this.master.onPreload();
        await this.preloadObjects(preloadList);
      }

      // Load login daemon
      await this.loadLoginDaemon();

      // Initialize command manager
      await this.commandManager.initialize();

      // Load permissions from disk
      await this.loadPermissions();

      // Start scheduler
      this.scheduler.start();

      // Initialize I3 if enabled
      if (this.config.i3Enabled) {
        await this.initializeI3();
      }

      // Initialize I2 if enabled
      if (this.config.i2Enabled) {
        await this.initializeI2();
      }

      // Initialize Grapevine if enabled
      if (this.config.grapevineEnabled) {
        await this.initializeGrapevine();
      }

      // Initialize Discord if enabled (check both env var and persisted config)
      if (this.config.discordEnabled) {
        await this.initializeDiscord();
      } else {
        // Check if Discord was previously enabled via in-game command
        await this.checkDiscordPersistedConfig();
      }

      // Initialize Bot system if previously enabled
      await this.checkBotsPersistedConfig();

      // Enable file deletion cleanup for mudlib objects
      // Note: File modifications still require manual 'update' command - only deletions are automatic
      if (this.config.hotReload) {
        this.hotReload.startWatching();
        this.logger.info('Mudlib file watcher enabled for deletion cleanup');
      }

      this.state = 'running';
      this.logger.info('MudForge Driver started successfully');
    } catch (error) {
      this.state = 'stopped';
      this.logger.error({ error }, 'Failed to start driver');
      throw error;
    }
  }

  /**
   * Stop the driver.
   */
  async stop(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'stopping';
    this.logger.info('Stopping MudForge Driver...');

    try {
      // Call onShutdown hook
      if (this.master?.onShutdown) {
        await this.master.onShutdown();
      }

      // Disconnect I3 if enabled
      if (this.config.i3Enabled) {
        destroyI3Client();
        this.logger.info('I3 client disconnected');
      }

      // Disconnect I2 if enabled
      if (this.config.i2Enabled) {
        destroyI2Client();
        this.logger.info('I2 client disconnected');
      }

      // Disconnect Grapevine if enabled
      if (this.config.grapevineEnabled) {
        destroyGrapevineClient();
        this.logger.info('Grapevine client disconnected');
      }

      // Disconnect Discord if enabled
      if (this.config.discordEnabled) {
        destroyDiscordClient();
        this.logger.info('Discord client disconnected');
      }

      // Stop file watcher
      this.hotReload.stopWatching();

      // Stop scheduler
      this.scheduler.stop();

      // Clean up
      this.scheduler.clear();
      this.connectionHandlers.clear();
      this.activePlayers.clear();
      this.sessionManager.stop();

      this.state = 'stopped';
      this.logger.info('MudForge Driver stopped');
    } catch (error) {
      this.logger.error({ error }, 'Error during shutdown');
      this.state = 'stopped';
      throw error;
    }
  }

  /**
   * Load the Master object.
   */
  private async loadMaster(): Promise<void> {
    const masterPath = this.config.masterObject;
    this.logger.info({ masterPath }, 'Loading Master object');

    try {
      this.master = await this.mudlibLoader.loadObject<MasterObject>(masterPath);
      this.logger.info('Master object loaded successfully');
    } catch (error) {
      throw new Error(
        `Failed to load Master object: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load the login daemon.
   */
  private async loadLoginDaemon(): Promise<void> {
    this.logger.info('Loading login daemon');

    try {
      this.loginDaemon = await this.mudlibLoader.loadObject<LoginDaemon>('/daemons/login');
      this.logger.info('Login daemon loaded successfully');
    } catch (error) {
      throw new Error(
        `Failed to load login daemon: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load permissions from disk.
   */
  private async loadPermissions(): Promise<void> {
    this.logger.info('Loading permissions');

    try {
      const fileStore = getFileStore({ dataPath: this.config.mudlibPath + '/data' });
      const data = await fileStore.loadPermissions();

      if (data) {
        const permissions = getPermissions();
        permissions.import(data);
        this.logger.info(
          { levels: Object.keys(data.levels || {}).length, domains: Object.keys(data.domains || {}).length },
          'Permissions loaded'
        );
      } else {
        this.logger.info('No permissions file found, starting with defaults');
      }
    } catch (error) {
      this.logger.warn({ error }, 'Failed to load permissions, starting with defaults');
    }
  }

  /**
   * Initialize Intermud 3 connection.
   */
  private async initializeI3(): Promise<void> {
    this.logger.info('Initializing Intermud 3...');

    try {
      // Load the intermud daemon first
      const intermudObj = await this.mudlibLoader.loadObject('/daemons/intermud');

      if (!intermudObj) {
        this.logger.error('Failed to load intermud daemon');
        return;
      }

      // Cast to the daemon interface for type safety
      const intermudDaemon = intermudObj as MudObject & {
        initialize(config: {
          mudName: string;
          adminEmail: string;
          playerPort: number;
          routerName: string;
        }): Promise<void>;
        sendStartupRequest(): boolean;
      };

      // Initialize the daemon with config
      await intermudDaemon.initialize({
        mudName: this.config.i3MudName,
        adminEmail: this.config.i3AdminEmail,
        playerPort: this.config.port,
        routerName: '*dalet',
      });

      // Create the I3 client
      const client = createI3Client({
        mudName: this.config.i3MudName,
        routers: [
          { name: '*dalet', host: this.config.i3RouterHost, port: this.config.i3RouterPort },
          { name: '*i4', host: '204.209.44.3', port: 8080 },
        ],
        reconnectDelay: 30000,
        maxReconnectAttempts: 0, // Infinite retries
        logger: this.logger,
      });

      // Wire up packet events to efun bridge
      client.on('packet', (packet) => {
        this.efunBridge.handleI3Packet(packet);
      });

      client.on('connect', () => {
        this.logger.info('Connected to I3 router, sending startup request...');
        // Send the startup-req-3 packet
        intermudDaemon.sendStartupRequest();
      });

      client.on('disconnect', (reason) => {
        this.logger.info({ reason }, 'Disconnected from I3 router');
      });

      client.on('error', (error) => {
        this.logger.error({ error: error.message }, 'I3 client error');
      });

      // Connect to I3 network
      await client.connect();

      this.logger.info('I3 client initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize I3');
      // Don't throw - I3 failure shouldn't prevent driver from starting
    }
  }

  /**
   * Initialize Intermud 2 connection.
   */
  private async initializeI2(): Promise<void> {
    this.logger.info('Initializing Intermud 2...');

    try {
      // Load the intermud2 daemon first
      const intermud2Obj = await this.mudlibLoader.loadObject('/daemons/intermud2');

      if (!intermud2Obj) {
        this.logger.error('Failed to load intermud2 daemon');
        return;
      }

      // Cast to the daemon interface for type safety
      const intermud2Daemon = intermud2Obj as MudObject & {
        initialize(config: {
          mudName: string;
          host: string;
          gamePort: number;
          udpPort: number;
        }): Promise<void>;
      };

      // Calculate UDP port (default to game port + 4)
      const udpPort = this.config.i2UdpPort || this.config.port + 4;

      // Initialize the daemon with config
      await intermud2Daemon.initialize({
        mudName: this.config.i2MudName,
        host: this.config.i2Host,
        gamePort: this.config.port,
        udpPort: udpPort,
      });

      // Create the I2 client
      const client = createI2Client({
        mudName: this.config.i2MudName,
        host: this.config.i2Host,
        udpPort: udpPort,
        gamePort: this.config.port,
        logger: this.logger,
      });

      // Wire up message events to efun bridge
      client.on('message', (message, rinfo) => {
        this.efunBridge.handleI2Message(message, rinfo);
      });

      client.on('error', (error) => {
        this.logger.error({ error: error.message }, 'I2 client error');
      });

      // Start the I2 client (binds UDP socket)
      await client.start();

      this.logger.info({ udpPort }, 'I2 client initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize I2');
      // Don't throw - I2 failure shouldn't prevent driver from starting
    }
  }

  /**
   * Initialize Grapevine chat connection.
   */
  private async initializeGrapevine(): Promise<void> {
    this.logger.info('Initializing Grapevine...');

    try {
      // Load the grapevine daemon first
      const grapevineObj = await this.mudlibLoader.loadObject('/daemons/grapevine');

      if (!grapevineObj) {
        this.logger.error('Failed to load grapevine daemon');
        return;
      }

      // Cast to the daemon interface for type safety
      const grapevineDaemon = grapevineObj as MudObject & {
        initialize(config: {
          clientId: string;
          clientSecret: string;
          gameName: string;
          defaultChannels: string[];
        }): Promise<void>;
      };

      // Initialize the daemon with config
      await grapevineDaemon.initialize({
        clientId: this.config.grapevineClientId,
        clientSecret: this.config.grapevineClientSecret,
        gameName: this.config.grapevineGameName,
        defaultChannels: this.config.grapevineDefaultChannels,
      });

      // Create the Grapevine client
      const client = createGrapevineClient({
        clientId: this.config.grapevineClientId,
        clientSecret: this.config.grapevineClientSecret,
        channels: this.config.grapevineDefaultChannels,
        gameName: this.config.grapevineGameName,
        logger: this.logger,
        getOnlinePlayers: () => {
          // Get list of online player names for heartbeat
          const players = this.efunBridge.allPlayers();
          return players.map((p) => {
            const player = p as MudObject & { name?: string };
            return player.name ?? 'Unknown';
          });
        },
      });

      // Wire up message events to efun bridge
      client.on('message', (event) => {
        this.efunBridge.handleGrapevineMessage(event);
      });

      client.on('connect', () => {
        this.logger.info('Connected to Grapevine');
      });

      client.on('authenticated', () => {
        this.logger.info('Authenticated with Grapevine');
        // Notify daemon to register channels
        const daemon = grapevineDaemon as MudObject & { onAuthenticated?: () => void };
        this.logger.info({ hasMethod: typeof daemon.onAuthenticated }, 'Checking onAuthenticated');
        if (typeof daemon.onAuthenticated === 'function') {
          this.logger.info('Calling daemon.onAuthenticated()');
          try {
            daemon.onAuthenticated();
            this.logger.info('daemon.onAuthenticated() completed');
          } catch (err) {
            this.logger.error({ err }, 'Error calling onAuthenticated');
          }
        } else {
          this.logger.warn('daemon.onAuthenticated is not a function');
        }
      });

      client.on('disconnect', (reason) => {
        this.logger.info({ reason }, 'Disconnected from Grapevine');
      });

      client.on('error', (error) => {
        this.logger.error({ error: error.message }, 'Grapevine client error');
      });

      // Connect to Grapevine
      await client.connect();

      this.logger.info('Grapevine client initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize Grapevine');
      // Don't throw - Grapevine failure shouldn't prevent driver from starting
    }
  }

  /**
   * Initialize Discord channel bridge.
   */
  private async initializeDiscord(): Promise<void> {
    this.logger.info('Initializing Discord...');

    try {
      // Load the discord daemon first
      const discordObj = await this.mudlibLoader.loadObject('/daemons/discord');

      if (!discordObj) {
        this.logger.error('Failed to load discord daemon');
        return;
      }

      // Cast to the daemon interface for type safety
      const discordDaemon = discordObj as MudObject & {
        initialize(config: {
          token: string;
          guildId: string;
          channelId: string;
        }): Promise<void>;
      };

      // Create the Discord client
      createDiscordClient();

      // Initialize the daemon with config
      await discordDaemon.initialize({
        token: this.config.discordBotToken,
        guildId: this.config.discordGuildId,
        channelId: this.config.discordChannelId,
      });

      this.logger.info('Discord client initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize Discord');
      // Don't throw - Discord failure shouldn't prevent driver from starting
    }
  }

  /**
   * Check persisted config for Discord settings.
   * This handles the case where Discord was enabled via in-game command.
   */
  private async checkDiscordPersistedConfig(): Promise<void> {
    try {
      // Read the persisted config file
      const configPath = join(this.config.mudlibPath, 'data', 'config', 'settings.json');
      const fs = await import('fs/promises');

      this.logger.info({ configPath }, 'Checking Discord persisted config');

      const content = await fs.readFile(configPath, 'utf-8');
      const settings = JSON.parse(content) as Record<string, unknown>;

      const enabled = settings['discord.enabled'];
      const guildId = settings['discord.guildId'] as string | undefined;
      const channelId = settings['discord.channelId'] as string | undefined;
      const hasToken = !!this.config.discordBotToken;

      this.logger.info({ enabled, guildId, channelId, hasToken }, 'Discord persisted settings');

      if (enabled && guildId && channelId && hasToken) {
        this.logger.info('Discord was previously enabled, auto-connecting...');

        // Override config with persisted values
        this.config.discordEnabled = true;
        this.config.discordGuildId = guildId;
        this.config.discordChannelId = channelId;

        await this.initializeDiscord();
      } else {
        this.logger.info('Discord auto-connect skipped (missing config or token)');
      }
    } catch (error) {
      this.logger.info({ error }, 'Could not check Discord persisted config');
    }
  }

  /**
   * Check persisted config for Bot system settings.
   * This handles the case where bots were enabled via in-game command.
   */
  private async checkBotsPersistedConfig(): Promise<void> {
    try {
      // Read the persisted config file
      const configPath = join(this.config.mudlibPath, 'data', 'config', 'settings.json');
      const fs = await import('fs/promises');

      const content = await fs.readFile(configPath, 'utf-8');
      const settings = JSON.parse(content) as Record<string, unknown>;

      const enabled = settings['bots.enabled'];

      if (enabled) {
        this.logger.info('Bot system was previously enabled, initializing...');

        // Load the bots daemon
        const botsObj = await this.mudlibLoader.loadObject('/daemons/bots');

        if (botsObj) {
          const botsDaemon = botsObj as MudObject & {
            loadPersonalities(): Promise<void>;
            enable(): Promise<{ success: boolean; error?: string }>;
          };

          // Load personalities first, then explicitly enable
          // (Don't rely on initialize() checking ConfigDaemon since it may not be loaded yet)
          await botsDaemon.loadPersonalities();
          await botsDaemon.enable();
          this.logger.info('Bot system initialized and enabled');
        }
      }
    } catch {
      // Config file doesn't exist or bots not enabled - that's fine
    }
  }

  /**
   * Preload objects from the preload list.
   */
  private async preloadObjects(paths: string[]): Promise<void> {
    this.logger.info({ count: paths.length }, 'Preloading objects');

    for (const path of paths) {
      try {
        await this.mudlibLoader.loadObject(path);
        this.logger.debug({ path }, 'Preloaded object');
      } catch (error) {
        this.logger.warn({ path, error }, 'Failed to preload object');
      }
    }
  }

  /**
   * Handle a new player connection.
   */
  async onPlayerConnect(connection: Connection): Promise<void> {
    this.logger.info(
      { id: connection.id, address: connection.getRemoteAddress() },
      'New player connection'
    );

    // Call master's onPlayerConnect if available
    if (this.master?.onPlayerConnect) {
      await this.master.onPlayerConnect(connection);
    }

    // Start login session
    if (this.loginDaemon) {
      this.connectionHandlers.set(connection, this.loginDaemon);
      this.loginDaemon.startSession(connection);
    } else {
      this.logger.error('No login daemon available');
      connection.send('Server error: Login system not available.\n');
      connection.close();
    }
  }

  /**
   * Handle player input.
   */
  async onPlayerInput(connection: Connection, input: string): Promise<void> {
    const handler = this.connectionHandlers.get(connection);

    if (!handler) {
      this.logger.warn({ id: connection.id }, 'Input from connection with no handler');
      return;
    }

    try {
      // Check for GUI auth request prefix (launcher login/registration)
      if (input.startsWith('\x00[AUTH_REQ]')) {
        await this.handleAuthRequest(connection, input.slice(11));
        return;
      }

      // Check for session resume request
      if (input.startsWith('\x00[SESSION]')) {
        await this.handleSessionMessage(connection, input.slice(10));
        return;
      }

      // Check for GUI message prefix
      if (input.startsWith('\x00[GUI]')) {
        await this.handleGUIMessage(handler, input.slice(6));
        return;
      }

      // Check for completion request prefix
      if (input.startsWith('\x00[COMPLETE]')) {
        await this.handleCompletionRequest(connection, handler, input.slice(11));
        return;
      }

      // Check for bug report prefix
      if (input.startsWith('\x00[BUG_REPORT]')) {
        await this.handleBugReport(connection, input.slice(13));
        return;
      }

      // Check if handler is login daemon
      if (handler === this.loginDaemon) {
        await this.loginDaemon.processInput(connection, input);
      } else {
        // Handler is a player object - process input
        const player = handler as MudObject & {
          processInput?: (input: string) => void | Promise<void>;
        };
        if (player.processInput) {
          // Set efun context so input handlers can use efuns that need player context
          this.efunBridge.setContext({ thisPlayer: player, thisObject: player });
          try {
            await player.processInput(input);
          } finally {
            this.efunBridge.clearContext();
          }
        }
      }
    } catch (error) {
      this.logger.error({ error, id: connection.id }, 'Error processing input');
      await this.handleError(error as Error, handler);
    }
  }

  /**
   * Handle an authentication request from the GUI launcher.
   * Routes the request to the login daemon's handleAuthRequest method.
   */
  private async handleAuthRequest(connection: Connection, jsonStr: string): Promise<void> {
    if (!this.loginDaemon) {
      this.logger.error('No login daemon available for auth request');
      connection.sendAuthResponse({
        success: false,
        error: 'Login system not available',
        errorCode: 'validation_error',
      });
      return;
    }

    if (!this.loginDaemon.handleAuthRequest) {
      this.logger.error('Login daemon does not support handleAuthRequest');
      connection.sendAuthResponse({
        success: false,
        error: 'Login system does not support GUI authentication',
        errorCode: 'validation_error',
      });
      return;
    }

    try {
      const request = JSON.parse(jsonStr) as AuthRequest;
      await this.loginDaemon.handleAuthRequest(connection, request);
    } catch (error) {
      this.logger.error({ error }, 'Failed to parse auth request');
      connection.sendAuthResponse({
        success: false,
        error: 'Invalid authentication request',
        errorCode: 'validation_error',
      });
    }
  }

  /**
   * Handle a session message from the client.
   * Used for session resume attempts during reconnection.
   */
  private async handleSessionMessage(connection: Connection, jsonStr: string): Promise<void> {
    try {
      const message = JSON.parse(jsonStr) as { type: string; token?: string };

      if (message.type === 'session_resume' && message.token) {
        await this.handleSessionResume(connection, message.token);
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to parse session message');
      connection.sendSession({
        type: 'session_invalid',
        error: 'Invalid session message',
      });
    }
  }

  /**
   * Handle a session resume attempt.
   * Validates the token and reconnects the player if valid.
   */
  private async handleSessionResume(connection: Connection, token: string): Promise<void> {
    const remoteAddress = connection.getRemoteAddress();
    const result = this.sessionManager.validateToken(token, remoteAddress);

    if (!result.valid || !result.session) {
      this.logger.info({ error: result.error }, 'Session resume failed');
      connection.sendSession({
        type: 'session_invalid',
        error: result.error || 'Invalid session',
      });
      return;
    }

    // Find the player in active players
    const player = this.findActivePlayer(result.session.playerName);

    if (!player) {
      this.logger.info({ playerName: result.session.playerName }, 'Session resume: player not found');
      connection.sendSession({
        type: 'session_invalid',
        error: 'Player session not found',
      });
      // Invalidate the token since player is gone
      this.sessionManager.invalidateToken(token);
      return;
    }

    // Check if player is in the void (disconnected state)
    const playerWithEnv = player as MudObject & {
      environment?: MudObject;
      previousLocation?: string | null;
      disconnectTimerId?: number | null;
      name?: string;
    };

    // Cancel any pending disconnect timeout
    if (playerWithEnv.disconnectTimerId !== null && playerWithEnv.disconnectTimerId !== undefined) {
      this.scheduler.removeCallOut(playerWithEnv.disconnectTimerId);
      playerWithEnv.disconnectTimerId = null;
    }

    // Transfer connection to this player (handles old connection cleanup)
    // Capture buffered messages from old connection for replay
    const bufferedMessages = this.transferConnection(connection, player);

    // Restore player to previous location if in void
    if (playerWithEnv.previousLocation && playerWithEnv.environment?.objectPath === '/areas/void/void') {
      try {
        const previousRoom = this.efunBridge.findObject(playerWithEnv.previousLocation);
        if (previousRoom) {
          await player.moveTo(previousRoom);
          this.logger.info(
            { name: playerWithEnv.name, location: playerWithEnv.previousLocation },
            'Session resume: player restored to previous location'
          );
        }
      } catch (error) {
        this.logger.error({ error }, 'Failed to restore player location on session resume');
      }
      playerWithEnv.previousLocation = null;
    }

    // Issue a new session token (old one is invalidated)
    this.sessionManager.invalidateToken(token);
    const { token: newToken, expiresAt } = this.issueSessionToken(player, connection);

    // Notify client of successful resume
    connection.sendSession({
      type: 'session_resume',
      success: true,
    });

    // Send the new token
    connection.sendSession({
      type: 'session_token',
      token: newToken,
      expiresAt,
    });

    // Replay buffered messages from the old connection (if any)
    if (bufferedMessages.length > 0) {
      // Limit to last 20 messages to avoid overwhelming the client
      const replayMessages = bufferedMessages.slice(-20);
      this.logger.info(
        { count: replayMessages.length, total: bufferedMessages.length },
        'Replaying buffered messages on session resume'
      );
      // Send a "catching up" indicator
      connection.send('{dim}--- Replaying missed messages ---{/}\n');
      for (const msg of replayMessages) {
        connection.send(msg);
      }
      connection.send('{dim}--- End of replay ---{/}\n');
    }

    // Send a welcome back message
    const playerWithReceive = player as MudObject & { receive?: (msg: string) => void };
    if (playerWithReceive.receive) {
      playerWithReceive.receive('\n{green}Session restored. Welcome back!{/}\n');
    }

    // Send a look command to refresh the room
    const playerWithInput = player as MudObject & { processInput?: (input: string) => void | Promise<void> };
    if (playerWithInput.processInput) {
      this.efunBridge.setContext({ thisPlayer: player, thisObject: player });
      try {
        await playerWithInput.processInput('look');
      } finally {
        this.efunBridge.clearContext();
      }
    }

    this.logger.info(
      { name: playerWithEnv.name, connectionId: connection.id, bufferedMessages: bufferedMessages.length },
      'Session resumed successfully'
    );
  }

  /**
   * Issue a session token for a player.
   * Called after successful login.
   */
  issueSessionToken(player: MudObject, connection: Connection): { token: string; expiresAt: number } {
    const playerWithName = player as MudObject & { name?: string };
    const playerName = playerWithName.name || 'unknown';
    const remoteAddress = connection.getRemoteAddress();

    // Use the runtime disconnect timeout as the session TTL so they stay aligned.
    // If someone changes disconnect.timeoutMinutes via the config command, new tokens
    // will automatically use the updated value.
    const disconnectMinutes = this.efunBridge.getMudConfig<number>('disconnect.timeoutMinutes') ?? 15;
    const sessionTtlMs = disconnectMinutes * 60 * 1000;

    const { token, expiresAt } = this.sessionManager.createToken(
      playerName,
      connection.id,
      remoteAddress,
      sessionTtlMs,
    );

    // Send token to client
    connection.sendSession({
      type: 'session_token',
      token,
      expiresAt,
    });

    return { token, expiresAt };
  }

  /**
   * Handle a bug report from the client debug console.
   * Creates a GitHub issue with full details.
   */
  private async handleBugReport(connection: Connection, jsonStr: string): Promise<void> {
    try {
      const report = JSON.parse(jsonStr);
      const githubToken = process.env.GITHUB_TOKEN;
      const githubOwner = process.env.GITHUB_OWNER;
      const githubRepo = process.env.GITHUB_REPO;

      if (!githubToken || !githubOwner || !githubRepo) {
        this.logger.info('Bug report received but GitHub not configured');
        return;
      }

      // Get player name if available
      const handler = this.connectionHandlers.get(connection);
      let playerName = 'Unknown';
      if (handler && handler !== this.loginDaemon) {
        const player = handler as MudObject & { name?: string };
        playerName = player.name || 'Unknown';
      }

      // Format logs for the issue body
      const allLogs = (report.recentLogs || [])
        .map((log: { timestamp: number; level: string; message: string }) => {
          const time = new Date(log.timestamp).toISOString();
          return `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
        })
        .join('\n');

      // Build the issue body with full details
      const issueBody = `## Bug Report

**Reported by:** ${playerName}
**Timestamp:** ${report.timestamp || new Date().toISOString()}

### Environment

| Property | Value |
|----------|-------|
| Game Version | ${report.gameVersion || 'Unknown'} |
| Driver Version | ${report.driverVersion || 'Unknown'} |
| Platform | ${report.platform || 'Unknown'} |
| Session Uptime | ${Math.floor((report.uptime || 0) / 60)} minutes |

### Browser

\`\`\`
${report.browser || 'Unknown'}
\`\`\`

### Console Logs

<details>
<summary>Full log output (${(report.recentLogs || []).length} entries)</summary>

\`\`\`
${allLogs || 'No logs captured'}
\`\`\`

</details>

---
*This issue was automatically created from the in-game debug console.*`;

      // Create GitHub issue
      const response = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            title: `[Bug Report] From ${playerName} - ${new Date().toLocaleDateString()}`,
            body: issueBody,
            labels: ['bug', 'client-report'],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { status: response.status, statusText: response.statusText, error: errorText },
          'Failed to create GitHub issue'
        );
      } else {
        const issue = await response.json() as { number: number; html_url: string };
        this.logger.info({ playerName, issueNumber: issue.number, issueUrl: issue.html_url }, 'Bug report created as GitHub issue');
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to process bug report');
    }
  }

  /**
   * Handle a GUI message from the client.
   * Routes the message to the player's onGUIResponse handler if set.
   */
  private async handleGUIMessage(handler: MudObject, jsonStr: string): Promise<void> {
    // Only process for logged-in players (not login daemon)
    if (handler === this.loginDaemon) {
      return;
    }

    try {
      const message = JSON.parse(jsonStr);
      const player = handler as MudObject & {
        onGUIResponse?: (message: unknown) => void | Promise<void>;
        handleGUIResponse?: (message: unknown) => void | Promise<void>;
      };

      // Set efun context
      this.efunBridge.setContext({ thisPlayer: player, thisObject: player });
      try {
        if (player.onGUIResponse) {
          // Use modal-specific handler if set
          await player.onGUIResponse(message);
        } else if (player.handleGUIResponse) {
          // Fall back to default player handler
          await player.handleGUIResponse(message);
        }
      } finally {
        this.efunBridge.clearContext();
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to parse GUI message');
    }
  }

  /**
   * Handle a tab completion request from the client.
   * Only works for builders and above, completes file paths in the player's cwd.
   */
  private async handleCompletionRequest(
    connection: Connection,
    handler: MudObject,
    jsonStr: string
  ): Promise<void> {
    // Only process for logged-in players (not login daemon)
    if (handler === this.loginDaemon) {
      return;
    }

    try {
      const request = JSON.parse(jsonStr) as { prefix: string };
      const player = handler as MudObject & {
        getPermissionLevel?: () => number;
        getCwd?: () => string;
      };

      // Only builders (level 1+) get tab completion
      const permLevel = player.getPermissionLevel?.() ?? 0;
      if (permLevel < 1) {
        return;
      }

      const cwd = player.getCwd?.() ?? '/';
      const prefix = request.prefix || '';

      // Get completions from the file system
      const completions = await this.getFileCompletions(cwd, prefix);

      // Send response
      connection.sendCompletion({
        type: 'completion',
        prefix,
        completions,
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to handle completion request');
    }
  }

  /**
   * Get file completions for a prefix in a directory.
   */
  private async getFileCompletions(cwd: string, prefix: string): Promise<string[]> {
    try {
      // Determine the directory to search and the filename prefix
      let searchDir = cwd;
      let filePrefix = prefix;
      let pathPrefix = ''; // Track the path prefix to prepend to completions

      // If prefix contains a path separator, split it
      const lastSlash = prefix.lastIndexOf('/');
      if (lastSlash >= 0) {
        const pathPart = prefix.substring(0, lastSlash + 1);
        filePrefix = prefix.substring(lastSlash + 1);
        pathPrefix = pathPart; // Store the path prefix for completions

        // Handle absolute vs relative paths
        if (pathPart.startsWith('/')) {
          searchDir = pathPart;
        } else {
          searchDir = cwd.endsWith('/') ? cwd + pathPart : cwd + '/' + pathPart;
        }
      }

      // Normalize the search directory
      searchDir = searchDir.replace(/\/+/g, '/');
      if (!searchDir.startsWith('/')) {
        searchDir = '/' + searchDir;
      }

      // Read directory contents
      const entries = await this.efunBridge.readDir(searchDir);

      // Filter by prefix and get file info
      const completions: string[] = [];
      const lowerPrefix = filePrefix.toLowerCase();

      for (const entry of entries) {
        if (entry.toLowerCase().startsWith(lowerPrefix)) {
          try {
            const entryPath = searchDir.endsWith('/')
              ? searchDir + entry
              : searchDir + '/' + entry;
            const stat = await this.efunBridge.fileStat(entryPath);

            // Add trailing slash for directories, prepend path prefix
            if (stat.isDirectory) {
              completions.push(pathPrefix + entry + '/');
            } else {
              completions.push(pathPrefix + entry);
            }
          } catch {
            // Skip entries we can't stat
            completions.push(pathPrefix + entry);
          }
        }
      }

      // Sort completions
      completions.sort();

      return completions;
    } catch {
      // Directory doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Handle player disconnect.
   * Moves the player to void and starts a disconnect timer.
   */
  async onPlayerDisconnect(connection: Connection): Promise<void> {
    this.logger.info({ id: connection.id }, 'Player disconnected');

    const handler = this.connectionHandlers.get(connection);

    if (handler) {
      if (handler === this.loginDaemon) {
        // Disconnect during login
        this.loginDaemon.handleDisconnect(connection);
      } else {
        // Player disconnected unexpectedly
        const player = handler as MudObject & {
          name?: string;
          previousLocation: string | null;
          disconnectTime: number;
          disconnectTimerId: number | null;
          unbindConnection?: () => void;
          onDisconnect?: () => void | Promise<void>;
        };

        // Only process if player has an environment (wasn't properly quit)
        if (player.environment) {
          const currentRoom = player.environment;
          const currentRoomPath = currentRoom?.objectPath || '/areas/town/center';

          // Store previous location for reconnection
          player.previousLocation = currentRoomPath;
          player.disconnectTime = Math.floor(Date.now() / 1000);

          // Notify the room with a memorable fade message
          const roomWithBroadcast = currentRoom as MudObject & {
            broadcast?: (msg: string, opts?: { exclude?: MudObject[] }) => void;
          };
          if (roomWithBroadcast.broadcast) {
            const displayName = player.name || player.shortDesc || 'Someone';
            roomWithBroadcast.broadcast(
              `{dim}${displayName}'s form flickers and slowly fades from view...{/}`,
              { exclude: [player] }
            );
          }

          // Move player to void
          try {
            const voidRoom = this.efunBridge.findObject('/areas/void/void');
            if (voidRoom) {
              await player.moveTo(voidRoom);
              this.logger.info({ name: player.name }, 'Player moved to void on disconnect');
            }
          } catch (error) {
            this.logger.error({ error, name: player.name }, 'Failed to move player to void');
          }

          // Start disconnect timer
          const timeoutMinutes = this.efunBridge.getMudConfig<number>('disconnect.timeoutMinutes') ?? 15;
          const timeoutMs = timeoutMinutes * 60 * 1000;

          const timerId = this.scheduler.callOut(async () => {
            await this.handleDisconnectTimeout(player);
          }, timeoutMs);
          player.disconnectTimerId = timerId;

          this.logger.info(
            { name: player.name, timeoutMinutes },
            'Disconnect timer started'
          );

          // Unbind connection from player
          if (player.unbindConnection) {
            player.unbindConnection();
          }

          // Save player data
          try {
            await this.efunBridge.savePlayer(player);
            this.logger.info({ name: player.name }, 'Player data saved on disconnect');
          } catch (error) {
            this.logger.error({ error, name: player.name }, 'Failed to save player on disconnect');
          }
        }

        // Call master hook
        if (this.master?.onPlayerDisconnect) {
          await this.master.onPlayerDisconnect(player);
        }

        // Call player's onDisconnect hook
        if (player.onDisconnect) {
          await player.onDisconnect();
        }

        // Note: Player stays in activePlayers for reconnection
      }
    }

    this.connectionHandlers.delete(connection);
  }

  /**
   * Handle disconnect timeout - force quit the player.
   */
  private async handleDisconnectTimeout(player: MudObject & {
    name?: string;
    previousLocation: string | null;
    disconnectTimerId: number | null;
  }): Promise<void> {
    this.logger.info({ name: player.name }, 'Disconnect timeout - force quitting player');

    // Clear timer reference
    player.disconnectTimerId = null;
    player.previousLocation = null;

    // Save final state
    try {
      await this.efunBridge.savePlayer(player);
    } catch (error) {
      this.logger.error({ error, name: player.name }, 'Failed to save player on timeout');
    }

    // Unregister from active players
    const lowerName = (player.name || '').toLowerCase();
    this.activePlayers.delete(lowerName);

    // Send notification via channel daemon from registry
    const channelDaemon = this.registry.find('/daemons/channels') as {
      sendNotification?: (channel: string, message: string) => void;
    } | undefined;
    if (channelDaemon?.sendNotification) {
      channelDaemon.sendNotification(
        'notify',
        `{dim}${player.name} has been disconnected due to inactivity.{/}`
      );
    }

    // Remove from void
    await player.moveTo(null);

    this.logger.info({ name: player.name }, 'Player force quit after disconnect timeout');
  }

  /**
   * Bind a player object to a connection (called after successful login).
   */
  bindPlayerToConnection(connection: Connection, player: MudObject): void {
    this.connectionHandlers.set(connection, player);
    connection.bindPlayer(player);

    // Issue session token for reconnection support
    this.issueSessionToken(player, connection);
  }

  /**
   * Get all connected players (not including login daemon sessions).
   * Also includes active bots from the bot daemon.
   */
  getAllPlayers(): MudObject[] {
    const players: MudObject[] = [];
    const playerNames: string[] = [];

    for (const [connection, handler] of this.connectionHandlers.entries()) {
      // Skip the login daemon - only include actual players
      if (handler !== this.loginDaemon) {
        players.push(handler);
        const name = (handler as MudObject & { name?: string }).name || 'unnamed';
        playerNames.push(`${name}(${handler.objectId}@${connection.id})`);
      }
    }

    // Also include active bots from the bot daemon
    const botDaemon = this.registry.find('/daemons/bots') as {
      getActiveBots?: () => MudObject[];
    } | undefined;
    if (botDaemon?.getActiveBots) {
      const bots = botDaemon.getActiveBots();
      for (const bot of bots) {
        players.push(bot);
        const name = (bot as MudObject & { name?: string }).name || 'unnamed-bot';
        playerNames.push(`${name}(${bot.objectId}@bot)`);
      }
    }

    // Check for duplicate names (potential bug indicator)
    const names = playerNames.map(p => (p.split('(')[0] ?? '').toLowerCase());
    const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
    if (duplicates.length > 0) {
      console.error(`[PLAYER-LIST] DUPLICATE PLAYERS DETECTED: ${duplicates.join(', ')}`);
      console.error(`[PLAYER-LIST] Full list: ${playerNames.join(', ')}`);
      console.error(`[PLAYER-LIST] connectionHandlers has ${this.connectionHandlers.size} entries`);
    }

    return players;
  }

  /**
   * Find a connected player by name.
   * @param name The player name to search for (case-insensitive)
   * @returns The player object if found, undefined otherwise
   */
  findConnectedPlayer(name: string): MudObject | undefined {
    const lowerName = name.toLowerCase();
    for (const handler of this.connectionHandlers.values()) {
      if (handler === this.loginDaemon) continue;
      const player = handler as MudObject & { name?: string };
      if (player.name?.toLowerCase() === lowerName) {
        return handler;
      }
    }
    return undefined;
  }

  /**
   * Transfer a connection to a different player, disconnecting the old connection.
   * Used for session takeover when a player reconnects.
   * @returns Buffered messages from the old connection for replay
   */
  transferConnection(newConnection: Connection, existingPlayer: MudObject): string[] {
    let bufferedMessages: string[] = [];
    const playerName = (existingPlayer as MudObject & { name?: string }).name || 'unknown';
    let foundOldConnection = false;

    console.log(`[CONN-TRANSFER] Transferring "${playerName}" (${existingPlayer.objectId}) to new connection ${newConnection.id}`);
    console.log(`[CONN-TRANSFER] connectionHandlers has ${this.connectionHandlers.size} entries before transfer`);

    // Find and disconnect the old connection
    for (const [oldConnection, handler] of this.connectionHandlers.entries()) {
      if (handler === existingPlayer) {
        foundOldConnection = true;
        console.log(`[CONN-TRANSFER] Found old connection ${oldConnection.id} for player "${playerName}"`);

        // Capture buffered messages before closing
        bufferedMessages = oldConnection.getBufferedMessages();
        // Clear the buffer on the old connection to free memory
        oldConnection.clearMessageBuffer();

        // Notify the old connection
        oldConnection.send('\nAnother connection has taken over this session.\n');
        // Remove the old connection binding
        this.connectionHandlers.delete(oldConnection);
        // Close the old connection
        oldConnection.close();
        break;
      }
    }

    if (!foundOldConnection) {
      console.log(`[CONN-TRANSFER] No old connection found for player "${playerName}" - this is expected for reconnect after disconnect`);
    }

    // Bind the new connection to the existing player
    this.connectionHandlers.set(newConnection, existingPlayer);
    newConnection.bindPlayer(existingPlayer);

    console.log(`[CONN-TRANSFER] connectionHandlers has ${this.connectionHandlers.size} entries after transfer`);

    // Update the player's connection reference
    const playerWithBind = existingPlayer as MudObject & {
      bindConnection?: (conn: Connection) => void;
    };
    if (playerWithBind.bindConnection) {
      playerWithBind.bindConnection(newConnection);
    }

    return bufferedMessages;
  }

  /**
   * Find an active player by name (in the game world, possibly disconnected).
   * @param name The player name to search for (case-insensitive)
   * @returns The player object if found, undefined otherwise
   */
  findActivePlayer(name: string): MudObject | undefined {
    const lowerName = name.toLowerCase();
    const player = this.activePlayers.get(lowerName);
    console.log(`[PLAYER-FIND] Looking for "${name}" (key: "${lowerName}") - found: ${player ? `yes (${player.objectId})` : 'no'}`);
    console.log(`[PLAYER-FIND] activePlayers has ${this.activePlayers.size} entries: [${Array.from(this.activePlayers.keys()).join(', ')}]`);
    return player;
  }

  /**
   * Register a player as active in the game world.
   * Called when a player successfully logs in.
   */
  registerActivePlayer(player: MudObject): void {
    const p = player as MudObject & { name?: string };
    if (p.name) {
      const lowerName = p.name.toLowerCase();
      const existing = this.activePlayers.get(lowerName);
      if (existing && existing !== player) {
        console.warn(`[PLAYER-REG] WARNING: Replacing existing player "${p.name}" (${existing.objectId}) with new player (${player.objectId})`);
        console.warn(`[PLAYER-REG] This may cause duplicate player issues!`);
        console.warn(`[PLAYER-REG] Stack:`, new Error('registerActivePlayer trace').stack);
      }
      console.log(`[PLAYER-REG] Registering "${p.name}" (${player.objectId}) - activePlayers now has ${this.activePlayers.size + (existing ? 0 : 1)} entries`);
      this.activePlayers.set(lowerName, player);
    } else {
      console.warn(`[PLAYER-REG] WARNING: Attempted to register player with no name!`);
      console.warn(`[PLAYER-REG] Stack:`, new Error('registerActivePlayer trace').stack);
    }
  }

  /**
   * Unregister a player from the active players list.
   * Called when a player quits properly.
   */
  unregisterActivePlayer(player: MudObject): void {
    const p = player as MudObject & { name?: string };
    if (p.name) {
      const lowerName = p.name.toLowerCase();
      const existing = this.activePlayers.get(lowerName);
      if (existing !== player) {
        console.warn(`[PLAYER-UNREG] WARNING: Unregistering "${p.name}" but stored player is different! stored=${existing?.objectId}, unregistering=${player.objectId}`);
      }
      console.log(`[PLAYER-UNREG] Unregistering "${p.name}" (${player.objectId}) - activePlayers will have ${this.activePlayers.size - 1} entries`);
      this.activePlayers.delete(lowerName);
    }
  }

  /**
   * Try to execute input as an emote via the soul daemon.
   * Called as a fallback when no command matches.
   *
   * Supports remote emotes with @player syntax:
   *   smile @bob  -> remote emote to bob
   *
   * @param player The player executing the emote
   * @param input The full input string
   * @returns true if an emote was executed, false otherwise
   */
  /**
   * Resolve an alias to its command.
   * Returns the original input if no alias matches or if the command is alias/unalias.
   */
  private resolveAlias(player: MudObject, input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return input;

    // Parse verb
    const spaceIndex = trimmed.indexOf(' ');
    const verb = (spaceIndex > 0 ? trimmed.substring(0, spaceIndex) : trimmed).toLowerCase();

    // Don't resolve aliases for alias management commands (prevents confusion)
    if (verb === 'alias' || verb === 'unalias' || verb === 'aliases') {
      return input;
    }

    // Get player's aliases
    const playerWithProps = player as MudObject & { getProperty?: (key: string) => unknown };
    if (!playerWithProps.getProperty) {
      return input;
    }

    const aliases = playerWithProps.getProperty('aliases') as Record<string, string> | undefined;
    if (!aliases || !aliases[verb]) {
      return input;
    }

    // Found an alias - replace the verb with the aliased command
    const aliasedCommand = aliases[verb];
    if (spaceIndex > 0) {
      // Append any additional arguments
      const args = trimmed.substring(spaceIndex + 1);
      return `${aliasedCommand} ${args}`;
    }
    return aliasedCommand;
  }

  private async tryEmote(player: MudObject, input: string): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed) return false;

    // Parse verb and args
    const spaceIndex = trimmed.indexOf(' ');
    const verb = spaceIndex > 0 ? trimmed.substring(0, spaceIndex) : trimmed;
    const args = spaceIndex > 0 ? trimmed.substring(spaceIndex + 1).trim() : '';

    // Find the soul daemon
    const soulDaemon = this.registry.find('/daemons/soul') as {
      hasEmote?: (verb: string) => boolean;
      executeEmote?: (
        actor: MudObject,
        verb: string,
        args: string
      ) => Promise<{ success: boolean; error?: string }>;
      executeRemoteEmote?: (
        actor: MudObject,
        verb: string,
        targetName: string
      ) => Promise<{ success: boolean; error?: string }>;
    } | undefined;

    if (!soulDaemon || !soulDaemon.hasEmote || !soulDaemon.executeEmote) {
      return false;
    }

    // Check if this verb is a known emote
    if (!soulDaemon.hasEmote(verb)) {
      return false;
    }

    // Check for @player syntax for remote emotes
    const isRemote = args.startsWith('@');
    let result: { success: boolean; error?: string };

    if (isRemote && soulDaemon.executeRemoteEmote) {
      // Remote emote: smile @bob
      const targetName = args.substring(1).split(/\s+/)[0] || '';
      if (!targetName) {
        result = { success: false, error: 'Remote emote requires a target: emote @player' };
      } else {
        result = await soulDaemon.executeRemoteEmote(player, verb, targetName);
      }
    } else {
      // Normal emote
      result = await soulDaemon.executeEmote(player, verb, args);
    }

    if (!result.success && result.error) {
      // Send error message to player
      const playerWithReceive = player as MudObject & { receive?: (msg: string) => void };
      if (playerWithReceive.receive) {
        playerWithReceive.receive(result.error + '\n');
      }
    }

    // Return true since the emote verb was recognized (even if execution failed)
    return true;
  }

  /**
   * Handle a runtime error.
   */
  async handleError(error: Error, object: MudObject | null): Promise<void> {
    this.logger.error({ error, objectId: object?.objectId }, 'Runtime error');

    if (this.master?.onRuntimeError) {
      try {
        await this.master.onRuntimeError(error, object);
      } catch (masterError) {
        this.logger.error({ masterError }, 'Error in Master.onRuntimeError');
      }
    }
  }

  /**
   * Get the current driver state.
   */
  getState(): DriverState {
    return this.state;
  }

  /**
   * Get the driver configuration.
   */
  getConfig(): DriverConfig {
    return this.config;
  }

  /**
   * Get the object registry.
   */
  getRegistry(): ObjectRegistry {
    return this.registry;
  }

  /**
   * Get the scheduler.
   */
  getScheduler(): Scheduler {
    return this.scheduler;
  }

  /**
   * Get the efun bridge.
   */
  getEfunBridge(): EfunBridge {
    return this.efunBridge;
  }

  /**
   * Get the mudlib loader.
   */
  getMudlibLoader(): MudlibLoader {
    return this.mudlibLoader;
  }

  /**
   * Get the compiler.
   */
  getCompiler(): Compiler {
    return this.compiler;
  }

  /**
   * Get the hot-reload manager.
   */
  getHotReload(): HotReload {
    return this.hotReload;
  }

  /**
   * Get the command manager.
   */
  getCommandManager(): CommandManager {
    return this.commandManager;
  }

  /**
   * Get the logger.
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get the master object.
   */
  getMaster(): MasterObject | null {
    return this.master;
  }

  /**
   * Get the session manager.
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}

// Singleton instance
let driverInstance: Driver | null = null;

/**
 * Get the global Driver instance.
 */
export function getDriver(config?: Partial<DriverConfig>): Driver {
  if (!driverInstance) {
    driverInstance = new Driver(config);
  }
  return driverInstance;
}

/**
 * Reset the global driver. Used for testing.
 */
export function resetDriver(): void {
  if (driverInstance) {
    // Note: Don't call stop() here as it might be async
    // Just reset the instance
  }
  driverInstance = null;

  // Reset all subsystems
  resetRegistry();
  resetScheduler();
  resetEfunBridge();
  resetIsolatePool();
  resetScriptRunner();
  resetMudlibLoader();
  resetCommandManager();
  resetSessionManager();
}
