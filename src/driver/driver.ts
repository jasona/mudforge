/**
 * Driver - Main orchestrator for the MUD driver.
 *
 * Coordinates all subsystems:
 * - Object Registry
 * - Script Isolation
 * - Compiler and Hot-Reload
 * - Scheduler
 * - Network (when implemented)
 */

import { loadConfig, validateConfig, type DriverConfig } from './config.js';
import { ObjectRegistry, getRegistry, resetRegistry } from './object-registry.js';
import { Scheduler, getScheduler, resetScheduler } from './scheduler.js';
import { EfunBridge, getEfunBridge, resetEfunBridge } from './efun-bridge.js';
import { Compiler } from './compiler.js';
import { HotReload } from './hot-reload.js';
import { getIsolatePool, resetIsolatePool } from '../isolation/isolate-pool.js';
import { resetScriptRunner } from '../isolation/script-runner.js';
import pino, { type Logger } from 'pino';
import type { MudObject } from './types.js';

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
  onPlayerConnect?(connection: unknown): string | Promise<string>;

  /** Called when a player disconnects */
  onPlayerDisconnect?(player: MudObject): void | Promise<void>;

  /** Validate read access to a file */
  validRead?(path: string, player: MudObject | null): boolean | Promise<boolean>;

  /** Validate write access to a file */
  validWrite?(path: string, player: MudObject | null): boolean | Promise<boolean>;

  /** Called when a runtime error occurs */
  onRuntimeError?(error: Error, object: MudObject | null): void | Promise<void>;
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
  private compiler: Compiler;
  private hotReload: HotReload;
  private master: MasterObject | null = null;
  private state: DriverState = 'stopped';

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
      // Initialize isolate pool
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

    // Compile the Master object
    const result = await this.compiler.compile(masterPath);
    if (!result.success) {
      throw new Error(`Failed to compile Master object: ${result.error}`);
    }

    // For now, we'll note that the Master loading is incomplete
    // In a full implementation, we would:
    // 1. Execute the compiled code in the sandbox
    // 2. Instantiate the Master class
    // 3. Register it in the object registry

    this.logger.info('Master object loaded (stub)');
    // this.master = instantiated master object
  }

  /**
   * Preload objects from the preload list.
   */
  private async preloadObjects(paths: string[]): Promise<void> {
    this.logger.info({ count: paths.length }, 'Preloading objects');

    for (const path of paths) {
      try {
        const result = await this.compiler.compile(path);
        if (result.success) {
          this.logger.debug({ path }, 'Preloaded object');
        } else {
          this.logger.warn({ path, error: result.error }, 'Failed to preload object');
        }
      } catch (error) {
        this.logger.warn({ path, error }, 'Error preloading object');
      }
    }
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
   * Get the logger.
   */
  getLogger(): Logger {
    return this.logger;
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
}
