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
        // Clear context after command execution
        this.efunBridge.clearContext();
      }
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
      this.activePlayers.clear();

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
      // Check for GUI message prefix
      if (input.startsWith('\x00[GUI]')) {
        await this.handleGUIMessage(handler, input.slice(6));
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
      };

      if (player.onGUIResponse) {
        // Set efun context
        this.efunBridge.setContext({ thisPlayer: player, thisObject: player });
        try {
          await player.onGUIResponse(message);
        } finally {
          this.efunBridge.clearContext();
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to parse GUI message');
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
   */
  transferConnection(newConnection: Connection, existingPlayer: MudObject): void {
    // Find and disconnect the old connection
    for (const [oldConnection, handler] of this.connectionHandlers.entries()) {
      if (handler === existingPlayer) {
        // Notify the old connection
        oldConnection.send('\nAnother connection has taken over this session.\n');
        // Remove the old connection binding
        this.connectionHandlers.delete(oldConnection);
        // Close the old connection
        oldConnection.close();
        break;
      }
    }

    // Bind the new connection to the existing player
    this.connectionHandlers.set(newConnection, existingPlayer);
    newConnection.bindPlayer(existingPlayer);

    // Update the player's connection reference
    const playerWithBind = existingPlayer as MudObject & {
      bindConnection?: (conn: Connection) => void;
    };
    if (playerWithBind.bindConnection) {
      playerWithBind.bindConnection(newConnection);
    }
  }

  /**
   * Find an active player by name (in the game world, possibly disconnected).
   * @param name The player name to search for (case-insensitive)
   * @returns The player object if found, undefined otherwise
   */
  findActivePlayer(name: string): MudObject | undefined {
    return this.activePlayers.get(name.toLowerCase());
  }

  /**
   * Register a player as active in the game world.
   * Called when a player successfully logs in.
   */
  registerActivePlayer(player: MudObject): void {
    const p = player as MudObject & { name?: string };
    if (p.name) {
      this.activePlayers.set(p.name.toLowerCase(), player);
    }
  }

  /**
   * Unregister a player from the active players list.
   * Called when a player quits properly.
   */
  unregisterActivePlayer(player: MudObject): void {
    const p = player as MudObject & { name?: string };
    if (p.name) {
      this.activePlayers.delete(p.name.toLowerCase());
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
