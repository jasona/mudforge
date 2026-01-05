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
import { CommandManager, getCommandManager, resetCommandManager, PermissionLevel } from './command-manager.js';
import { Compiler } from './compiler.js';
import { HotReload } from './hot-reload.js';
import { getIsolatePool, resetIsolatePool } from '../isolation/isolate-pool.js';
import { resetScriptRunner } from '../isolation/script-runner.js';
import pino, { type Logger } from 'pino';
import type { MudObject } from './types.js';
import type { Connection } from '../network/connection.js';
import { join } from 'path';

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
 * Login daemon interface.
 */
export interface LoginDaemon extends MudObject {
  startSession(connection: Connection): void;
  processInput(connection: Connection, input: string): void | Promise<void>;
  handleDisconnect(connection: Connection): void;
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
  private master: MasterObject | null = null;
  private loginDaemon: LoginDaemon | null = null;
  private state: DriverState = 'stopped';

  // Track connections to their handlers (login daemon or player)
  private connectionHandlers: Map<Connection, MudObject> = new Map();

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

    // Set up the bind player callback so login daemon can bind players
    this.efunBridge.setBindPlayerCallback((connection, player) => {
      this.bindPlayerToConnection(connection as Connection, player);
    });

    // Set up the all players callback so mudlib can get connected players
    this.efunBridge.setAllPlayersCallback(() => {
      return this.getAllPlayers();
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
      return this.commandManager.execute(player, input, level);
    });

    this.compiler = new Compiler({
      mudlibPath: this.config.mudlibPath,
    });
    this.hotReload = new HotReload(
      {
        mudlibPath: this.config.mudlibPath,
        watchEnabled: this.config.hotReload,
      },
      this.registry
    );
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

      // Start scheduler
      this.scheduler.start();

      // Start file watcher if enabled
      if (this.config.hotReload) {
        this.hotReload.startWatching();
        this.logger.info('Hot-reload enabled');
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

      // Stop file watcher
      this.hotReload.stopWatching();

      // Stop scheduler
      this.scheduler.stop();

      // Clean up
      this.scheduler.clear();
      this.connectionHandlers.clear();

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
      // Check if handler is login daemon
      if (handler === this.loginDaemon) {
        await this.loginDaemon.processInput(connection, input);
      } else {
        // Handler is a player object - process input
        const player = handler as MudObject & {
          processInput?: (input: string) => void | Promise<void>;
        };
        if (player.processInput) {
          await player.processInput(input);
        }
      }
    } catch (error) {
      this.logger.error({ error, id: connection.id }, 'Error processing input');
      await this.handleError(error as Error, handler);
    }
  }

  /**
   * Handle player disconnect.
   */
  async onPlayerDisconnect(connection: Connection): Promise<void> {
    this.logger.info({ id: connection.id }, 'Player disconnected');

    const handler = this.connectionHandlers.get(connection);

    if (handler) {
      if (handler === this.loginDaemon) {
        // Disconnect during login
        this.loginDaemon.handleDisconnect(connection);
      } else {
        // Player disconnected - save their data first (only if they have a valid location)
        const player = handler;
        const playerWithName = player as MudObject & { name?: string };

        // Only save if player still has an environment (wasn't properly quit)
        // If environment is null, they already quit properly and were saved
        if (player.environment) {
          try {
            await this.efunBridge.savePlayer(player);
            this.logger.info({ name: playerWithName.name }, 'Player data saved on disconnect');
          } catch (error) {
            this.logger.error({ error, name: playerWithName.name }, 'Failed to save player on disconnect');
          }
        }

        if (this.master?.onPlayerDisconnect) {
          await this.master.onPlayerDisconnect(player);
        }

        // Call player's onDisconnect if available
        const playerWithHook = player as MudObject & {
          onDisconnect?: () => void | Promise<void>;
        };
        if (playerWithHook.onDisconnect) {
          await playerWithHook.onDisconnect();
        }
      }
    }

    this.connectionHandlers.delete(connection);
  }

  /**
   * Bind a player object to a connection (called after successful login).
   */
  bindPlayerToConnection(connection: Connection, player: MudObject): void {
    this.connectionHandlers.set(connection, player);
    connection.bindPlayer(player);
  }

  /**
   * Get all connected players (not including login daemon sessions).
   */
  getAllPlayers(): MudObject[] {
    const players: MudObject[] = [];
    for (const handler of this.connectionHandlers.values()) {
      // Skip the login daemon - only include actual players
      if (handler !== this.loginDaemon) {
        players.push(handler);
      }
    }
    return players;
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
}
