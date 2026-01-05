/**
 * EfunBridge - Exposes driver APIs (efuns) to mudlib code.
 *
 * Efuns (external functions) are the interface between the driver
 * and the mudlib. They provide access to driver functionality that
 * mudlib code cannot implement itself.
 */

import { getRegistry, type ObjectRegistry } from './object-registry.js';
import { getScheduler, type Scheduler } from './scheduler.js';
import { getPermissions, resetPermissions, type Permissions } from './permissions.js';
import { getFileStore } from './persistence/file-store.js';
import type { PlayerSaveData } from './persistence/serializer.js';
import type { MudObject } from './types.js';
import { readFile, writeFile, access, readdir, stat, mkdir } from 'fs/promises';
import { dirname, normalize, resolve } from 'path';
import { constants } from 'fs';

export interface EfunBridgeConfig {
  /** Root path for file operations */
  mudlibPath: string;
}

/**
 * The current execution context for efuns.
 */
export interface EfunContext {
  /** The object executing the code (this_object) */
  thisObject: MudObject | null;
  /** The player causing the action (this_player) */
  thisPlayer: MudObject | null;
}

/**
 * Bridge providing efuns to mudlib code.
 */
/**
 * Callback to bind a player to a connection (set by Driver).
 */
type BindPlayerCallback = (connection: unknown, player: MudObject) => void;

/**
 * Callback to execute a command (set by Driver).
 */
type ExecuteCommandCallback = (player: MudObject, input: string, level: number) => Promise<boolean>;

export class EfunBridge {
  private config: EfunBridgeConfig;
  private registry: ObjectRegistry;
  private scheduler: Scheduler;
  private permissions: Permissions;
  private context: EfunContext = { thisObject: null, thisPlayer: null };
  private bindPlayerCallback: BindPlayerCallback | null = null;
  private executeCommandCallback: ExecuteCommandCallback | null = null;

  constructor(config: Partial<EfunBridgeConfig> = {}) {
    this.config = {
      mudlibPath: config.mudlibPath ?? './mudlib',
    };
    this.registry = getRegistry();
    this.scheduler = getScheduler();
    this.permissions = getPermissions();
  }

  /**
   * Set the callback for binding players to connections.
   * Called by the Driver after initialization.
   */
  setBindPlayerCallback(callback: BindPlayerCallback): void {
    this.bindPlayerCallback = callback;
  }

  /**
   * Set the callback for executing commands.
   * Called by the Driver after initialization.
   */
  setExecuteCommandCallback(callback: ExecuteCommandCallback): void {
    this.executeCommandCallback = callback;
  }

  /**
   * Set the current execution context.
   */
  setContext(context: Partial<EfunContext>): void {
    if (context.thisObject !== undefined) {
      this.context.thisObject = context.thisObject;
    }
    if (context.thisPlayer !== undefined) {
      this.context.thisPlayer = context.thisPlayer;
    }
  }

  /**
   * Clear the execution context.
   */
  clearContext(): void {
    this.context = { thisObject: null, thisPlayer: null };
  }

  // ========== Object Efuns ==========

  /**
   * Clone an object from a blueprint.
   * @param path The blueprint path
   */
  async cloneObject(path: string): Promise<MudObject | undefined> {
    return this.registry.clone(path);
  }

  /**
   * Destroy an object.
   * @param object The object to destroy
   */
  async destruct(object: MudObject): Promise<void> {
    await this.registry.destroy(object);
  }

  /**
   * Load an object (get blueprint).
   * @param path The object path
   */
  loadObject(path: string): MudObject | undefined {
    return this.registry.find(path);
  }

  /**
   * Find an object by path or ID.
   * @param pathOrId The object path or clone ID
   */
  findObject(pathOrId: string): MudObject | undefined {
    return this.registry.find(pathOrId);
  }

  // ========== Hierarchy Efuns ==========

  /**
   * Get all objects in an object's inventory.
   * @param object The container object
   */
  allInventory(object: MudObject): MudObject[] {
    return [...object.inventory];
  }

  /**
   * Get an object's environment.
   * @param object The object
   */
  environment(object: MudObject): MudObject | null {
    return object.environment;
  }

  /**
   * Move an object to a new environment.
   * @param object The object to move
   * @param destination The new environment
   */
  async move(object: MudObject, destination: MudObject | null): Promise<boolean> {
    return object.moveTo(destination);
  }

  // ========== Player Efuns ==========

  /**
   * Get the current "this object" from context.
   */
  thisObject(): MudObject | null {
    return this.context.thisObject;
  }

  /**
   * Get the current "this player" from context.
   */
  thisPlayer(): MudObject | null {
    return this.context.thisPlayer;
  }

  /**
   * Get all connected players.
   * This will be implemented when the network layer is added.
   */
  allPlayers(): MudObject[] {
    // TODO: Implement when network layer is added
    return [];
  }

  /**
   * Send a message to an object (typically a player).
   * @param target The target object
   * @param message The message to send
   */
  send(target: MudObject, message: string): void {
    // Call receive on the target if it has it
    const objWithReceive = target as MudObject & {
      receive?: (message: string) => void;
    };
    if (typeof objWithReceive.receive === 'function') {
      objWithReceive.receive(message);
    }
  }

  // ========== File Efuns ==========

  /**
   * Resolve a mudlib path to an absolute filesystem path.
   * Validates that the path is within mudlib.
   */
  private resolveMudlibPath(path: string): string {
    // Normalize and resolve the path
    const normalized = normalize(path).replace(/\\/g, '/');
    const fullPath = resolve(this.config.mudlibPath, normalized.replace(/^\//, ''));

    // Security check: ensure path is within mudlib
    const mudlibAbs = resolve(this.config.mudlibPath);
    if (!fullPath.startsWith(mudlibAbs)) {
      throw new Error('Path traversal attempt detected');
    }

    return fullPath;
  }

  /**
   * Read a file's contents.
   * @param path The file path (relative to mudlib)
   */
  async readFile(path: string): Promise<string> {
    // Check read permission
    const player = this.context.thisPlayer;
    if (!this.permissions.canRead(player, path)) {
      throw new Error(`Permission denied: cannot read ${path}`);
    }
    const fullPath = this.resolveMudlibPath(path);
    return readFile(fullPath, 'utf-8');
  }

  /**
   * Write content to a file.
   * @param path The file path (relative to mudlib)
   * @param content The content to write
   */
  async writeFile(path: string, content: string): Promise<void> {
    // Check write permission
    const player = this.context.thisPlayer;
    if (!this.permissions.canWrite(player, path)) {
      throw new Error(`Permission denied: cannot write ${path}`);
    }
    const fullPath = this.resolveMudlibPath(path);
    // Ensure directory exists
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  }

  /**
   * Check if a file exists.
   * @param path The file path (relative to mudlib)
   */
  async fileExists(path: string): Promise<boolean> {
    // Check read permission
    const player = this.context.thisPlayer;
    if (!this.permissions.canRead(player, path)) {
      return false;
    }
    try {
      const fullPath = this.resolveMudlibPath(path);
      await access(fullPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a directory's contents.
   * @param path The directory path (relative to mudlib)
   */
  async readDir(path: string): Promise<string[]> {
    // Check read permission
    const player = this.context.thisPlayer;
    if (!this.permissions.canRead(player, path)) {
      throw new Error(`Permission denied: cannot read ${path}`);
    }
    const fullPath = this.resolveMudlibPath(path);
    return readdir(fullPath);
  }

  /**
   * Get file information.
   * @param path The file path (relative to mudlib)
   */
  async fileStat(
    path: string
  ): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }> {
    const fullPath = this.resolveMudlibPath(path);
    const stats = await stat(fullPath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  // ========== Utility Efuns ==========

  /**
   * Get current timestamp.
   */
  time(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Get current timestamp in milliseconds.
   */
  timeMs(): number {
    return Date.now();
  }

  /**
   * Generate a random integer.
   * @param max Upper bound (exclusive)
   */
  random(max: number): number {
    return Math.floor(Math.random() * max);
  }

  /**
   * Capitalize a string.
   * @param str The string to capitalize
   */
  capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Split a string into an array.
   * @param str The string to split
   * @param delimiter The delimiter
   */
  explode(str: string, delimiter: string): string[] {
    return str.split(delimiter);
  }

  /**
   * Join an array into a string.
   * @param arr The array to join
   * @param delimiter The delimiter
   */
  implode(arr: string[], delimiter: string): string {
    return arr.join(delimiter);
  }

  /**
   * Trim whitespace from a string.
   * @param str The string to trim
   */
  trim(str: string): string {
    return str.trim();
  }

  /**
   * Convert string to lowercase.
   * @param str The string to convert
   */
  lower(str: string): string {
    return str.toLowerCase();
  }

  /**
   * Convert string to uppercase.
   * @param str The string to convert
   */
  upper(str: string): string {
    return str.toUpperCase();
  }

  // ========== Permission Efuns ==========

  /**
   * Check if a player can read a path.
   * @param path The file path
   */
  checkReadPermission(path: string): boolean {
    return this.permissions.canRead(this.context.thisPlayer, path);
  }

  /**
   * Check if a player can write to a path.
   * @param path The file path
   */
  checkWritePermission(path: string): boolean {
    return this.permissions.canWrite(this.context.thisPlayer, path);
  }

  /**
   * Check if the current player is an administrator.
   */
  isAdmin(): boolean {
    const player = this.context.thisPlayer;
    if (!player) return false;
    return this.permissions.isAdmin(player);
  }

  /**
   * Check if the current player is a builder.
   */
  isBuilder(): boolean {
    const player = this.context.thisPlayer;
    if (!player) return false;
    return this.permissions.isBuilder(player);
  }

  /**
   * Get the current player's permission level.
   */
  getPermissionLevel(): number {
    const player = this.context.thisPlayer;
    if (!player) return 0;
    return this.permissions.getLevel(player);
  }

  /**
   * Get the current player's domains.
   */
  getDomains(): string[] {
    const player = this.context.thisPlayer;
    if (!player) return [];
    const p = player as MudObject & { name?: string };
    if (!p.name) return [];
    return this.permissions.getDomains(p.name);
  }

  // ========== Scheduler Efuns ==========

  /**
   * Set heartbeat for an object.
   * @param object The object
   * @param enable Whether to enable heartbeat
   */
  setHeartbeat(object: MudObject, enable: boolean): void {
    this.scheduler.setHeartbeat(object, enable);
  }

  /**
   * Schedule a delayed callback.
   * @param callback The function to call
   * @param delayMs Delay in milliseconds
   */
  callOut(callback: () => void | Promise<void>, delayMs: number): number {
    return this.scheduler.callOut(callback, delayMs);
  }

  /**
   * Cancel a scheduled callback.
   * @param id The callOut ID
   */
  removeCallOut(id: number): boolean {
    return this.scheduler.removeCallOut(id);
  }

  // ========== Connection Efuns ==========

  /**
   * Bind a player object to a connection.
   * Called by login daemon after successful login.
   * @param connection The connection object
   * @param player The player object
   */
  bindPlayerToConnection(connection: unknown, player: MudObject): void {
    if (this.bindPlayerCallback) {
      this.bindPlayerCallback(connection, player);
    }
  }

  /**
   * Execute a command through the command manager.
   * @param player The player executing the command
   * @param input The command input string
   * @param level The player's permission level (0=player, 1=builder, 2=senior, 3=admin)
   * @returns true if command was found and executed
   */
  async executeCommand(player: MudObject, input: string, level: number = 0): Promise<boolean> {
    if (this.executeCommandCallback) {
      return this.executeCommandCallback(player, input, level);
    }
    return false;
  }

  // ========== Persistence Efuns ==========

  /**
   * Save a player to disk.
   * @param player The player object to save
   */
  async savePlayer(player: MudObject): Promise<void> {
    const fileStore = getFileStore({ dataPath: this.config.mudlibPath + '/data' });
    await fileStore.savePlayer(player);
  }

  /**
   * Load a player's saved data.
   * @param name The player's name
   * @returns The player save data, or null if not found
   */
  async loadPlayerData(name: string): Promise<PlayerSaveData | null> {
    const fileStore = getFileStore({ dataPath: this.config.mudlibPath + '/data' });
    return fileStore.loadPlayer(name);
  }

  /**
   * Check if a player save exists.
   * @param name The player's name
   */
  async playerExists(name: string): Promise<boolean> {
    const fileStore = getFileStore({ dataPath: this.config.mudlibPath + '/data' });
    return fileStore.playerExists(name);
  }

  /**
   * List all saved player names.
   * @returns Array of player names
   */
  async listPlayers(): Promise<string[]> {
    const fileStore = getFileStore({ dataPath: this.config.mudlibPath + '/data' });
    return fileStore.listPlayers();
  }

  /**
   * Get all efuns as an object for exposing to sandbox.
   */
  getEfuns(): Record<string, unknown> {
    return {
      // Object
      cloneObject: this.cloneObject.bind(this),
      destruct: this.destruct.bind(this),
      loadObject: this.loadObject.bind(this),
      findObject: this.findObject.bind(this),

      // Hierarchy
      allInventory: this.allInventory.bind(this),
      environment: this.environment.bind(this),
      move: this.move.bind(this),

      // Player
      thisObject: this.thisObject.bind(this),
      thisPlayer: this.thisPlayer.bind(this),
      allPlayers: this.allPlayers.bind(this),
      send: this.send.bind(this),

      // File
      readFile: this.readFile.bind(this),
      writeFile: this.writeFile.bind(this),
      fileExists: this.fileExists.bind(this),
      readDir: this.readDir.bind(this),
      fileStat: this.fileStat.bind(this),

      // Utility
      time: this.time.bind(this),
      timeMs: this.timeMs.bind(this),
      random: this.random.bind(this),
      capitalize: this.capitalize.bind(this),
      explode: this.explode.bind(this),
      implode: this.implode.bind(this),
      trim: this.trim.bind(this),
      lower: this.lower.bind(this),
      upper: this.upper.bind(this),

      // Permission
      checkReadPermission: this.checkReadPermission.bind(this),
      checkWritePermission: this.checkWritePermission.bind(this),
      isAdmin: this.isAdmin.bind(this),
      isBuilder: this.isBuilder.bind(this),
      getPermissionLevel: this.getPermissionLevel.bind(this),
      getDomains: this.getDomains.bind(this),

      // Scheduler
      setHeartbeat: this.setHeartbeat.bind(this),
      callOut: this.callOut.bind(this),
      removeCallOut: this.removeCallOut.bind(this),

      // Connection
      bindPlayerToConnection: this.bindPlayerToConnection.bind(this),
      executeCommand: this.executeCommand.bind(this),

      // Persistence
      savePlayer: this.savePlayer.bind(this),
      loadPlayerData: this.loadPlayerData.bind(this),
      playerExists: this.playerExists.bind(this),
      listPlayers: this.listPlayers.bind(this),
    };
  }
}

// Singleton instance
let bridgeInstance: EfunBridge | null = null;

/**
 * Get the global EfunBridge instance.
 */
export function getEfunBridge(config?: Partial<EfunBridgeConfig>): EfunBridge {
  if (!bridgeInstance) {
    bridgeInstance = new EfunBridge(config);
  }
  return bridgeInstance;
}

/**
 * Reset the global bridge. Used for testing.
 */
export function resetEfunBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.clearContext();
  }
  bridgeInstance = null;
  resetPermissions();
}
