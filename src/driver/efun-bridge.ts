/**
 * EfunBridge - Exposes driver APIs (efuns) to mudlib code.
 *
 * Efuns (external functions) are the interface between the driver
 * and the mudlib. They provide access to driver functionality that
 * mudlib code cannot implement itself.
 */

import { getRegistry, type ObjectRegistry } from './object-registry.js';
import { getScheduler, type Scheduler } from './scheduler.js';
import type { MudObject } from './types.js';
import { readFile, writeFile, access, readdir, stat, mkdir } from 'fs/promises';
import { join, dirname, normalize, resolve } from 'path';
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
export class EfunBridge {
  private config: EfunBridgeConfig;
  private registry: ObjectRegistry;
  private scheduler: Scheduler;
  private context: EfunContext = { thisObject: null, thisPlayer: null };

  constructor(config: Partial<EfunBridgeConfig> = {}) {
    this.config = {
      mudlibPath: config.mudlibPath ?? './mudlib',
    };
    this.registry = getRegistry();
    this.scheduler = getScheduler();
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
    const fullPath = this.resolveMudlibPath(path);
    return readFile(fullPath, 'utf-8');
  }

  /**
   * Write content to a file.
   * @param path The file path (relative to mudlib)
   * @param content The content to write
   */
  async writeFile(path: string, content: string): Promise<void> {
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

      // Scheduler
      setHeartbeat: this.setHeartbeat.bind(this),
      callOut: this.callOut.bind(this),
      removeCallOut: this.removeCallOut.bind(this),
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
}
