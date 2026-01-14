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
import { getMudlibLoader, type MudlibLoader } from './mudlib-loader.js';
import { getCommandManager } from './command-manager.js';
import { getClaudeClient, type ClaudeMessage } from './claude-client.js';
import type { PlayerSaveData } from './persistence/serializer.js';
import type { MudObject } from './types.js';
import { readFile, writeFile, access, readdir, stat, mkdir, rm, rename, copyFile } from 'fs/promises';
import { dirname, normalize, resolve } from 'path';
import { constants } from 'fs';

/**
 * Pager options for the page efun.
 */
export interface PageOptions {
  /** Lines per page (default: 20) */
  linesPerPage?: number;
  /** Title to display at top */
  title?: string;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Callback when pager exits */
  onExit?: () => void;
}

/**
 * IDE message types for client communication.
 */
export interface IdeMessage {
  action: 'open' | 'save-result' | 'error';
  path?: string;
  content?: string;
  readOnly?: boolean;
  language?: string;
  success?: boolean;
  errors?: Array<{ line: number; column: number; message: string }>;
  message?: string;
}

/**
 * GUI message types for modal dialogs.
 * Full types are in mudlib/lib/gui-types.ts
 */
export interface GUIMessage {
  action: string;
  [key: string]: unknown;
}

/**
 * NPC AI context for configuring AI-powered dialogue.
 */
export interface NPCAIContext {
  name: string;
  personality: string;
  background: string;
  currentMood?: string;
  knowledgeScope?: {
    worldLore?: string[];
    localKnowledge?: string[];
    topics?: string[];
    forbidden?: string[];
  };
  speakingStyle?: {
    formality?: 'casual' | 'formal' | 'archaic';
    verbosity?: 'terse' | 'normal' | 'verbose';
    accent?: string;
  };
  maxResponseLength?: number;
}

/**
 * AI generation options.
 */
export interface AIGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;
  /** If true, will continue generating if response is truncated (for long-form content) */
  useContinuation?: boolean;
  /** Maximum continuation requests (default: 2) */
  maxContinuations?: number;
}

/**
 * AI description details.
 */
export interface AIDescribeDetails {
  name: string;
  keywords?: string[];
  theme?: string;
  existing?: string;
}

/**
 * AI generation result.
 */
export interface AIGenerateResult {
  success: boolean;
  text?: string;
  error?: string;
  cached?: boolean;
}

/**
 * AI description result.
 */
export interface AIDescribeResult {
  success: boolean;
  shortDesc?: string;
  longDesc?: string;
  error?: string;
}

/**
 * AI NPC response result.
 */
export interface AINpcResponseResult {
  success: boolean;
  response?: string;
  error?: string;
  fallback?: boolean;
}

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

/**
 * Callback to get all connected players (set by Driver).
 */
type AllPlayersCallback = () => MudObject[];

/**
 * Callback to find a connected player by name (set by Driver).
 */
type FindConnectedPlayerCallback = (name: string) => MudObject | undefined;

/**
 * Callback to transfer a connection to an existing player (set by Driver).
 */
type TransferConnectionCallback = (connection: unknown, player: MudObject) => void;

/**
 * Callback to find an active player by name (in game world, possibly disconnected).
 */
type FindActivePlayerCallback = (name: string) => MudObject | undefined;

/**
 * Callback to register/unregister active players.
 */
type RegisterActivePlayerCallback = (player: MudObject) => void;

export class EfunBridge {
  private config: EfunBridgeConfig;
  private registry: ObjectRegistry;
  private scheduler: Scheduler;
  private permissions: Permissions;
  private context: EfunContext = { thisObject: null, thisPlayer: null };
  private bindPlayerCallback: BindPlayerCallback | null = null;
  private executeCommandCallback: ExecuteCommandCallback | null = null;
  private allPlayersCallback: AllPlayersCallback | null = null;
  private findConnectedPlayerCallback: FindConnectedPlayerCallback | null = null;
  private transferConnectionCallback: TransferConnectionCallback | null = null;
  private findActivePlayerCallback: FindActivePlayerCallback | null = null;
  private registerActivePlayerCallback: RegisterActivePlayerCallback | null = null;
  private unregisterActivePlayerCallback: RegisterActivePlayerCallback | null = null;

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
   * Set the callback for getting all connected players.
   * Called by the Driver after initialization.
   */
  setAllPlayersCallback(callback: AllPlayersCallback): void {
    this.allPlayersCallback = callback;
  }

  /**
   * Set the callback for finding a connected player by name.
   * Called by the Driver after initialization.
   */
  setFindConnectedPlayerCallback(callback: FindConnectedPlayerCallback): void {
    this.findConnectedPlayerCallback = callback;
  }

  /**
   * Set the callback for transferring a connection to an existing player.
   * Called by the Driver after initialization.
   */
  setTransferConnectionCallback(callback: TransferConnectionCallback): void {
    this.transferConnectionCallback = callback;
  }

  /**
   * Set the callback for finding an active player (in game world, possibly disconnected).
   * Called by the Driver after initialization.
   */
  setFindActivePlayerCallback(callback: FindActivePlayerCallback): void {
    this.findActivePlayerCallback = callback;
  }

  /**
   * Set the callback for registering an active player.
   * Called by the Driver after initialization.
   */
  setRegisterActivePlayerCallback(callback: RegisterActivePlayerCallback): void {
    this.registerActivePlayerCallback = callback;
  }

  /**
   * Set the callback for unregistering an active player.
   * Called by the Driver after initialization.
   */
  setUnregisterActivePlayerCallback(callback: RegisterActivePlayerCallback): void {
    this.unregisterActivePlayerCallback = callback;
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
   * Auto-loads the blueprint if it doesn't exist yet.
   * @param path The blueprint path
   */
  async cloneObject(path: string): Promise<MudObject | undefined> {
    const loader = getMudlibLoader({ mudlibPath: this.config.mudlibPath });
    return loader.cloneObject(path);
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

  /**
   * Get all loaded objects in the registry.
   * Used by daemons that need to iterate over all objects (e.g., reset daemon).
   * @returns Array of all loaded MudObjects
   */
  getAllObjects(): MudObject[] {
    return Array.from(this.registry.getAllObjects());
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
   */
  allPlayers(): MudObject[] {
    if (this.allPlayersCallback) {
      return this.allPlayersCallback();
    }
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

  /**
   * Create a directory.
   * @param path The directory path (relative to mudlib)
   * @param recursive Whether to create parent directories
   */
  async makeDir(path: string, recursive: boolean = false): Promise<void> {
    // Check write permission
    const player = this.context.thisPlayer;
    if (!this.permissions.canWrite(player, path)) {
      throw new Error(`Permission denied: cannot create ${path}`);
    }
    const fullPath = this.resolveMudlibPath(path);
    await mkdir(fullPath, { recursive });
  }

  /**
   * Remove a directory.
   * @param path The directory path (relative to mudlib)
   * @param recursive Whether to remove contents recursively
   */
  async removeDir(path: string, recursive: boolean = false): Promise<void> {
    // Check write permission
    const player = this.context.thisPlayer;
    if (!this.permissions.canWrite(player, path)) {
      throw new Error(`Permission denied: cannot remove ${path}`);
    }
    const fullPath = this.resolveMudlibPath(path);
    await rm(fullPath, { recursive });
  }

  /**
   * Remove a file.
   * @param path The file path (relative to mudlib)
   */
  async removeFile(path: string): Promise<void> {
    // Check write permission
    const player = this.context.thisPlayer;
    if (!this.permissions.canWrite(player, path)) {
      throw new Error(`Permission denied: cannot remove ${path}`);
    }
    const fullPath = this.resolveMudlibPath(path);
    const stats = await stat(fullPath);
    if (stats.isDirectory()) {
      throw new Error(`Is a directory: ${path}`);
    }
    await rm(fullPath);
  }

  /**
   * Move/rename a file or directory.
   * @param srcPath Source path (relative to mudlib)
   * @param destPath Destination path (relative to mudlib)
   */
  async moveFile(srcPath: string, destPath: string): Promise<void> {
    // Check write permission on both paths
    const player = this.context.thisPlayer;
    if (!this.permissions.canWrite(player, srcPath)) {
      throw new Error(`Permission denied: cannot move ${srcPath}`);
    }
    if (!this.permissions.canWrite(player, destPath)) {
      throw new Error(`Permission denied: cannot write to ${destPath}`);
    }
    const srcFull = this.resolveMudlibPath(srcPath);
    const destFull = this.resolveMudlibPath(destPath);
    // Ensure destination directory exists
    await mkdir(dirname(destFull), { recursive: true });
    await rename(srcFull, destFull);
  }

  /**
   * Copy a file.
   * @param srcPath Source file path (relative to mudlib)
   * @param destPath Destination file path (relative to mudlib)
   */
  async copyFileTo(srcPath: string, destPath: string): Promise<void> {
    // Check read permission on source and write permission on destination
    const player = this.context.thisPlayer;
    if (!this.permissions.canRead(player, srcPath)) {
      throw new Error(`Permission denied: cannot read ${srcPath}`);
    }
    if (!this.permissions.canWrite(player, destPath)) {
      throw new Error(`Permission denied: cannot write to ${destPath}`);
    }
    const srcFull = this.resolveMudlibPath(srcPath);
    const destFull = this.resolveMudlibPath(destPath);
    // Check source is a file
    const stats = await stat(srcFull);
    if (stats.isDirectory()) {
      throw new Error(`Is a directory: ${srcPath}`);
    }
    // Ensure destination directory exists
    await mkdir(dirname(destFull), { recursive: true });
    await copyFile(srcFull, destFull);
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

  /**
   * Format a string using printf-style format specifiers.
   *
   * Supported format specifiers:
   *   %s  - String
   *   %d  - Integer (decimal)
   *   %i  - Integer (same as %d)
   *   %f  - Floating point
   *   %c  - Character (from char code or first char of string)
   *   %x  - Hexadecimal (lowercase)
   *   %X  - Hexadecimal (uppercase)
   *   %o  - Octal
   *   %b  - Binary
   *   %j  - JSON (stringify objects)
   *   %%  - Literal percent sign
   *
   * Format modifiers (between % and specifier):
   *   -   Left-align within field width
   *   +   Show + sign for positive numbers
   *   0   Pad with zeros instead of spaces
   *   #   Alternate form (0x for hex, 0o for octal, 0b for binary)
   *   width   Minimum field width (e.g., %10s)
   *   .prec   Precision - max chars for strings, decimal places for floats
   *
   * Column mode (MUD-specific):
   *   %|width|s  - Center-align string in width
   *   %=width=s  - Center-align string in width (alternate syntax)
   *
   * Examples:
   *   sprintf("Hello %s!", "world")           -> "Hello world!"
   *   sprintf("%10s", "test")                 -> "      test"
   *   sprintf("%-10s", "test")                -> "test      "
   *   sprintf("%05d", 42)                     -> "00042"
   *   sprintf("%.2f", 3.14159)                -> "3.14"
   *   sprintf("%+d", 42)                      -> "+42"
   *   sprintf("%#x", 255)                     -> "0xff"
   *   sprintf("%|20|s", "centered")           -> "      centered      "
   *
   * @param format The format string
   * @param args Values to substitute
   * @returns The formatted string
   */
  sprintf(format: string, ...args: unknown[]): string {
    let argIndex = 0;

    // Regex to match format specifiers
    // Groups: flags, width, precision, specifier
    const formatRegex = /%([+\-#0 ]*)(\d+|\|(\d+)\||=(\d+)=)?(?:\.(\d+))?([sdifcxXobjJ%])/g;

    return format.replace(formatRegex, (match, flags, widthPart, centerWidth1, centerWidth2, precision, specifier) => {
      // Handle %% escape
      if (specifier === '%') {
        return '%';
      }

      // Get the argument
      if (argIndex >= args.length) {
        return match; // Not enough args, leave as-is
      }
      const arg = args[argIndex++];

      // Parse flags
      const leftAlign = flags?.includes('-') || false;
      const showSign = flags?.includes('+') || false;
      const zeroPad = flags?.includes('0') || false;
      const altForm = flags?.includes('#') || false;
      const spaceSign = flags?.includes(' ') || false;

      // Parse width and center alignment
      let width = 0;
      let centerAlign = false;

      if (centerWidth1) {
        width = parseInt(centerWidth1, 10);
        centerAlign = true;
      } else if (centerWidth2) {
        width = parseInt(centerWidth2, 10);
        centerAlign = true;
      } else if (widthPart && !widthPart.startsWith('|') && !widthPart.startsWith('=')) {
        width = parseInt(widthPart, 10);
      }

      // Parse precision
      const prec = precision !== undefined ? parseInt(precision, 10) : undefined;

      // Format based on specifier
      let result: string;

      switch (specifier) {
        case 's': {
          // String
          result = String(arg ?? '');
          if (prec !== undefined && result.length > prec) {
            result = result.slice(0, prec);
          }
          break;
        }

        case 'd':
        case 'i': {
          // Integer
          const num = Math.trunc(Number(arg) || 0);
          const isNegative = num < 0;
          result = Math.abs(num).toString();

          // Apply precision (minimum digits)
          if (prec !== undefined) {
            result = result.padStart(prec, '0');
          }

          // Apply sign
          if (isNegative) {
            result = '-' + result;
          } else if (showSign) {
            result = '+' + result;
          } else if (spaceSign) {
            result = ' ' + result;
          }
          break;
        }

        case 'f': {
          // Float
          const floatNum = Number(arg) || 0;
          const decimals = prec !== undefined ? prec : 6;
          const isNeg = floatNum < 0;
          result = Math.abs(floatNum).toFixed(decimals);

          if (isNeg) {
            result = '-' + result;
          } else if (showSign) {
            result = '+' + result;
          } else if (spaceSign) {
            result = ' ' + result;
          }
          break;
        }

        case 'c': {
          // Character
          if (typeof arg === 'number') {
            result = String.fromCharCode(arg);
          } else if (typeof arg === 'string' && arg.length > 0) {
            result = arg.charAt(0);
          } else {
            result = '';
          }
          break;
        }

        case 'x':
        case 'X': {
          // Hexadecimal
          const hexNum = Math.trunc(Number(arg) || 0);
          result = Math.abs(hexNum).toString(16);
          if (specifier === 'X') {
            result = result.toUpperCase();
          }
          if (altForm && hexNum !== 0) {
            result = (specifier === 'X' ? '0X' : '0x') + result;
          }
          if (hexNum < 0) {
            result = '-' + result;
          }
          break;
        }

        case 'o': {
          // Octal
          const octNum = Math.trunc(Number(arg) || 0);
          result = Math.abs(octNum).toString(8);
          if (altForm && octNum !== 0) {
            result = '0o' + result;
          }
          if (octNum < 0) {
            result = '-' + result;
          }
          break;
        }

        case 'b': {
          // Binary
          const binNum = Math.trunc(Number(arg) || 0);
          result = Math.abs(binNum).toString(2);
          if (altForm && binNum !== 0) {
            result = '0b' + result;
          }
          if (binNum < 0) {
            result = '-' + result;
          }
          break;
        }

        case 'j':
        case 'J': {
          // JSON
          try {
            result = specifier === 'J'
              ? JSON.stringify(arg, null, 2)
              : JSON.stringify(arg);
          } catch {
            result = String(arg);
          }
          break;
        }

        default:
          result = String(arg);
      }

      // Apply width padding
      // Calculate visible length (excluding color codes like {red} and ANSI escapes)
      const visibleLength = result
        .replace(/\{[a-zA-Z/:]+\}/g, '')  // Strip {color} tokens
        .replace(/\x1b\[[0-9;]*m/g, '')   // Strip ANSI escape codes
        .length;

      if (width > 0 && visibleLength < width) {
        const padChar = zeroPad && !leftAlign && !centerAlign ? '0' : ' ';
        const padAmount = width - visibleLength;

        if (centerAlign) {
          const leftPad = Math.floor(padAmount / 2);
          const rightPad = padAmount - leftPad;
          result = ' '.repeat(leftPad) + result + ' '.repeat(rightPad);
        } else if (leftAlign) {
          result = result + padChar.repeat(padAmount);
        } else {
          // Right align (default)
          // For zero-padding numbers, put padding after sign
          if (zeroPad && (specifier === 'd' || specifier === 'i' || specifier === 'f')) {
            const signMatch = result.match(/^([+-]?\s?)/);
            if (signMatch && signMatch[1]) {
              const sign = signMatch[1];
              const rest = result.slice(sign.length);
              result = sign + '0'.repeat(padAmount) + rest;
            } else {
              result = padChar.repeat(padAmount) + result;
            }
          } else {
            result = padChar.repeat(padAmount) + result;
          }
        }
      }

      return result;
    });
  }

  /**
   * Convert a timestamp to seconds (handles both seconds and milliseconds).
   * If timestamp > 10 billion, assume it's in milliseconds and convert.
   * @param timestamp The timestamp to convert
   */
  toSeconds(timestamp: number): number {
    if (timestamp > 10000000000) {
      return Math.floor(timestamp / 1000);
    }
    return timestamp;
  }

  /**
   * Convert a timestamp to milliseconds (handles both seconds and milliseconds).
   * If timestamp <= 10 billion, assume it's in seconds and convert.
   * @param timestamp The timestamp to convert
   */
  toMilliseconds(timestamp: number): number {
    if (timestamp > 10000000000) {
      return timestamp;
    }
    return timestamp * 1000;
  }

  /**
   * Format a duration in seconds to a human-readable string.
   * @param seconds The duration in seconds
   * @returns A string like "2 days, 3 hours, 15 minutes"
   */
  formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

    if (parts.length === 0) return 'less than a minute';
    return parts.join(', ');
  }

  /**
   * Format a timestamp to a human-readable date string.
   * Automatically handles both seconds and milliseconds timestamps.
   * @param timestamp The timestamp (seconds or milliseconds)
   * @returns A formatted date string
   */
  formatDate(timestamp: number): string {
    const date = new Date(this.toMilliseconds(timestamp));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
   * Find a connected player by name.
   * @param name The player name to search for (case-insensitive)
   * @returns The player object if found, undefined otherwise
   */
  findConnectedPlayer(name: string): MudObject | undefined {
    if (this.findConnectedPlayerCallback) {
      return this.findConnectedPlayerCallback(name);
    }
    return undefined;
  }

  /**
   * Transfer a connection to an existing player (session takeover).
   * Used when a player reconnects while already logged in.
   * @param connection The new connection
   * @param player The existing player object to take over
   */
  transferConnection(connection: unknown, player: MudObject): void {
    if (this.transferConnectionCallback) {
      this.transferConnectionCallback(connection, player);
    }
  }

  /**
   * Find an active player by name (in game world, possibly disconnected).
   * @param name The player name to search for (case-insensitive)
   * @returns The player object if found, undefined otherwise
   */
  findActivePlayer(name: string): MudObject | undefined {
    if (this.findActivePlayerCallback) {
      return this.findActivePlayerCallback(name);
    }
    return undefined;
  }

  /**
   * Register a player as active in the game world.
   * Called when a player successfully logs in.
   * @param player The player object
   */
  registerActivePlayer(player: MudObject): void {
    if (this.registerActivePlayerCallback) {
      this.registerActivePlayerCallback(player);
    }
  }

  /**
   * Unregister a player from the active players list.
   * Called when a player quits properly.
   * @param player The player object
   */
  unregisterActivePlayer(player: MudObject): void {
    if (this.unregisterActivePlayerCallback) {
      this.unregisterActivePlayerCallback(player);
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

  // ========== Paging Efuns ==========

  /**
   * Display content with Linux-style paging.
   * Allows page-by-page navigation for long content.
   *
   * @param content The content to display (string or array of lines)
   * @param options Pager options (linesPerPage, title, showLineNumbers)
   */
  page(content: string | string[], options: PageOptions = {}): void {
    const player = this.context.thisPlayer;
    if (!player) {
      throw new Error('No player context for paging');
    }

    // Get the player with required methods
    const pagerPlayer = player as MudObject & {
      setInputHandler: (handler: ((input: string) => void | Promise<void>) | null) => void;
      receive: (message: string) => void;
    };

    if (typeof pagerPlayer.setInputHandler !== 'function') {
      throw new Error('Player does not support input handling');
    }

    // Parse content into lines
    const lines = Array.isArray(content) ? content : content.split('\n');
    const linesPerPage = options.linesPerPage ?? 20;

    // Pager state
    const state = {
      lines,
      currentLine: 0,
      linesPerPage,
      title: options.title ?? null,
      showLineNumbers: options.showLineNumbers ?? false,
      searchPattern: null as string | null,
      searchMatches: [] as number[],
      searchIndex: -1,
      onExit: options.onExit ?? null,
    };

    // If content fits on one page, just display it without paging
    if (lines.length <= linesPerPage) {
      this.displayAllContent(pagerPlayer, state);
      if (state.onExit) {
        state.onExit();
      }
      return;
    }

    // Show first page and set up handler
    this.displayPage(pagerPlayer, state);
    pagerPlayer.setInputHandler((input: string) => {
      this.handlePagerInput(pagerPlayer, state, input);
    });
  }

  /**
   * Display all content without paging (for short content).
   */
  private displayAllContent(
    player: MudObject & { receive: (msg: string) => void },
    state: {
      lines: string[];
      title: string | null;
      showLineNumbers: boolean;
    }
  ): void {
    if (state.title) {
      player.receive(`{cyan}${state.title}{/}\n`);
    }

    for (let i = 0; i < state.lines.length; i++) {
      const line = state.lines[i];
      if (state.showLineNumbers) {
        const lineNum = (i + 1).toString().padStart(4);
        player.receive(`{dim}${lineNum}{/}  ${line}\n`);
      } else {
        player.receive(`${line}\n`);
      }
    }
  }

  /**
   * Display a page of content.
   */
  private displayPage(
    player: MudObject & { receive: (msg: string) => void },
    state: {
      lines: string[];
      currentLine: number;
      linesPerPage: number;
      title: string | null;
      showLineNumbers: boolean;
    }
  ): void {
    // Show title on first page
    if (state.currentLine === 0 && state.title) {
      player.receive(`{cyan}${state.title}{/}\n`);
    }

    // Calculate end line
    const endLine = Math.min(state.currentLine + state.linesPerPage, state.lines.length);

    // Display lines
    for (let i = state.currentLine; i < endLine; i++) {
      const line = state.lines[i];
      if (state.showLineNumbers) {
        const lineNum = (i + 1).toString().padStart(4);
        player.receive(`{dim}${lineNum}{/}  ${line}\n`);
      } else {
        player.receive(`${line}\n`);
      }
    }

    // Show prompt
    this.showPagerPrompt(player, state);
  }

  /**
   * Show the pager prompt.
   */
  private showPagerPrompt(
    player: MudObject & { receive: (msg: string) => void },
    state: { lines: string[]; currentLine: number; linesPerPage: number }
  ): void {
    const endLine = Math.min(state.currentLine + state.linesPerPage, state.lines.length);
    const percent = Math.round((endLine / state.lines.length) * 100);

    // Create a visually distinct prompt bar
    player.receive('\n');
    if (endLine >= state.lines.length) {
      player.receive(
        '{CYAN}{bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}\n'
      );
      player.receive(
        '{inverse}{bold} (END) {/}  {cyan}[q]{/} quit  {cyan}[b]{/} back  {cyan}[g]{/} top  {cyan}[/]{/} search\n'
      );
      player.receive(
        '{CYAN}{bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}\n'
      );
    } else {
      player.receive(
        '{CYAN}{bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}\n'
      );
      player.receive(
        `{inverse}{bold} --More-- (${percent}%) {/}  {cyan}[j/Enter]{/} next  {cyan}[b]{/} back  {cyan}[q]{/} quit  {cyan}[?]{/} help\n`
      );
      player.receive(
        '{CYAN}{bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}\n'
      );
    }
    player.receive('{dim}>{/} ');
  }

  /**
   * Handle pager input.
   */
  private handlePagerInput(
    player: MudObject & {
      setInputHandler: (handler: ((input: string) => void | Promise<void>) | null) => void;
      receive: (msg: string) => void;
    },
    state: {
      lines: string[];
      currentLine: number;
      linesPerPage: number;
      title: string | null;
      showLineNumbers: boolean;
      searchPattern: string | null;
      searchMatches: number[];
      searchIndex: number;
      onExit: (() => void) | null;
    },
    input: string
  ): void {
    const cmd = input.trim().toLowerCase();

    // Quit
    if (cmd === 'q' || cmd === 'quit') {
      player.setInputHandler(null);
      player.receive('\n');
      if (state.onExit) {
        state.onExit();
      }
      return;
    }

    // Next page (Enter, Space, j, f)
    if (cmd === '' || cmd === ' ' || cmd === 'j' || cmd === 'f' || (cmd === 'n' && !state.searchPattern)) {
      const nextLine = state.currentLine + state.linesPerPage;
      if (nextLine < state.lines.length) {
        state.currentLine = nextLine;
        this.displayPage(player, state);
      } else {
        player.receive('\n{yellow}(Already at end - press q to quit){/}\n');
        this.showPagerPrompt(player, state);
      }
      return;
    }

    // Next line (k for single line advance)
    if (cmd === 'k') {
      const nextLine = state.currentLine + 1;
      if (nextLine < state.lines.length) {
        state.currentLine = nextLine;
        this.displayPage(player, state);
      } else {
        player.receive('\n{yellow}(Already at end - press q to quit){/}\n');
        this.showPagerPrompt(player, state);
      }
      return;
    }

    // Previous page
    if (cmd === 'b' || cmd === 'p') {
      const prevLine = state.currentLine - state.linesPerPage;
      state.currentLine = Math.max(0, prevLine);
      this.displayPage(player, state);
      return;
    }

    // Go to beginning
    if (cmd === 'g') {
      state.currentLine = 0;
      this.displayPage(player, state);
      return;
    }

    // Go to end (capital G)
    if (input.trim() === 'G') {
      state.currentLine = Math.max(0, state.lines.length - state.linesPerPage);
      this.displayPage(player, state);
      return;
    }

    // Search
    if (cmd.startsWith('/')) {
      const pattern = input.trim().slice(1);
      if (pattern) {
        this.searchPager(player, state, pattern);
      } else {
        player.receive('\n{yellow}Empty search pattern{/}\n');
        this.showPagerPrompt(player, state);
      }
      return;
    }

    // Next search result
    if (cmd === 'n' && state.searchPattern) {
      this.nextSearchResult(player, state);
      return;
    }

    // Go to line number
    const lineNum = parseInt(cmd, 10);
    if (!isNaN(lineNum) && lineNum > 0) {
      const targetLine = Math.min(lineNum - 1, state.lines.length - 1);
      state.currentLine = Math.max(0, targetLine);
      this.displayPage(player, state);
      return;
    }

    // Help
    if (cmd === 'h' || cmd === '?') {
      player.receive(`
{cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}
{bold}{cyan}                    Pager Controls{/}
{cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}
  {bold}j, f, Enter, Space{/}  - Next page
  {bold}k{/}                   - Next line (scroll by 1)
  {bold}b, p{/}                - Previous page
  {bold}g{/}                   - Go to beginning
  {bold}G{/}                   - Go to end
  {bold}/<pattern>{/}          - Search for pattern
  {bold}n{/}                   - Next search result
  {bold}<number>{/}            - Go to line number
  {bold}q{/}                   - Quit
  {bold}?, h{/}                - Show this help
{cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}
`);
      this.showPagerPrompt(player, state);
      return;
    }

    // Unknown - just show prompt
    this.showPagerPrompt(player, state);
  }

  /**
   * Search forward in paged content.
   */
  private searchPager(
    player: MudObject & { receive: (msg: string) => void },
    state: {
      lines: string[];
      currentLine: number;
      linesPerPage: number;
      title: string | null;
      showLineNumbers: boolean;
      searchPattern: string | null;
      searchMatches: number[];
      searchIndex: number;
    },
    pattern: string
  ): void {
    state.searchPattern = pattern;
    state.searchMatches = [];

    const lowerPattern = pattern.toLowerCase();
    for (let i = 0; i < state.lines.length; i++) {
      const line = state.lines[i];
      if (line && line.toLowerCase().includes(lowerPattern)) {
        state.searchMatches.push(i);
      }
    }

    if (state.searchMatches.length === 0) {
      player.receive(`\n{yellow}Pattern not found: ${pattern}{/}\n`);
      this.showPagerPrompt(player, state);
      return;
    }

    state.searchIndex = state.searchMatches.findIndex((line) => line >= state.currentLine);
    if (state.searchIndex === -1) {
      state.searchIndex = 0;
    }

    // searchIndex is guaranteed to be valid here since we just set it
    state.currentLine = state.searchMatches[state.searchIndex] ?? 0;
    player.receive(
      `\n{green}Found ${state.searchMatches.length} match(es). Showing match ${state.searchIndex + 1}:{/}\n`
    );
    this.displayPage(player, state);
  }

  /**
   * Go to next search result in pager.
   */
  private nextSearchResult(
    player: MudObject & { receive: (msg: string) => void },
    state: {
      lines: string[];
      currentLine: number;
      linesPerPage: number;
      title: string | null;
      showLineNumbers: boolean;
      searchPattern: string | null;
      searchMatches: number[];
      searchIndex: number;
    }
  ): void {
    if (!state.searchPattern || state.searchMatches.length === 0) {
      player.receive('\n{yellow}No previous search{/}\n');
      this.showPagerPrompt(player, state);
      return;
    }

    state.searchIndex = (state.searchIndex + 1) % state.searchMatches.length;
    // searchIndex is guaranteed to be valid due to modulo
    state.currentLine = state.searchMatches[state.searchIndex] ?? 0;
    player.receive(
      `\n{dim}Match ${state.searchIndex + 1} of ${state.searchMatches.length}{/}\n`
    );
    this.displayPage(player, state);
  }

  // ========== IDE Efuns ==========

  /**
   * Send an IDE message to the current player's client.
   * Messages are prefixed with \x00[IDE] to distinguish from regular text.
   * This is used to open the visual IDE editor in the browser.
   *
   * @param message The IDE message object
   */
  ideOpen(message: IdeMessage): void {
    const player = this.context.thisPlayer;
    if (!player) {
      throw new Error('No player context for IDE');
    }

    // Get the player's connection to send raw message (bypassing colorization)
    const playerWithConnection = player as MudObject & {
      connection?: { send: (msg: string) => void };
      _connection?: { send: (msg: string) => void };
    };

    const connection = playerWithConnection.connection || playerWithConnection._connection;
    if (!connection?.send) {
      throw new Error('Player has no connection');
    }

    // Send structured message with IDE prefix (no colorization)
    const jsonStr = JSON.stringify(message);
    connection.send(`\x00[IDE]${jsonStr}\n`);
  }

  // ========== GUI Efuns ==========

  /**
   * Send a GUI message to the current player's client.
   * Messages are prefixed with \x00[GUI] to distinguish from regular text.
   * This is used to open modal dialogs in the browser client.
   *
   * @param message The GUI message object
   */
  guiSend(message: GUIMessage): void {
    const player = this.context.thisPlayer;
    if (!player) {
      throw new Error('No player context for GUI');
    }

    // Get the player's connection to send raw message (bypassing colorization)
    const playerWithConnection = player as MudObject & {
      connection?: { send: (msg: string) => void };
      _connection?: { send: (msg: string) => void };
    };

    const connection = playerWithConnection.connection || playerWithConnection._connection;
    if (!connection?.send) {
      throw new Error('Player has no connection');
    }

    // Send structured message with GUI prefix (no colorization)
    const jsonStr = JSON.stringify(message);
    connection.send(`\x00[GUI]${jsonStr}\n`);
  }

  /**
   * Send quest panel update to the client.
   * The quest daemon should call this to update the client's quest panel.
   *
   * @param quests Array of quest data to display (max 3 shown)
   * @param targetPlayer Optional player to send to (uses context.thisPlayer if not provided)
   */
  sendQuestUpdate(
    quests: Array<{
      questId: string;
      name: string;
      progress: number;
      progressText: string;
      status: 'active' | 'completed';
    }>,
    targetPlayer?: MudObject
  ): void {
    const player = targetPlayer || this.context.thisPlayer;
    if (!player) {
      return; // Silently fail if no player context
    }

    // Get the player's connection
    const playerWithConnection = player as MudObject & {
      connection?: { send: (msg: string) => void };
      _connection?: { send: (msg: string) => void };
    };

    const connection = playerWithConnection.connection || playerWithConnection._connection;
    if (!connection?.send) {
      return; // Silently fail if no connection
    }

    // Send structured message with QUEST prefix
    const message = {
      type: 'update',
      quests: quests.slice(0, 3), // Limit to 3 quests
    };
    const jsonStr = JSON.stringify(message);
    connection.send(`\x00[QUEST]${jsonStr}\n`);
  }

  // ========== Config Efuns ==========

  /**
   * Get a mud-wide configuration value.
   * @param key The setting key (e.g., 'disconnect.timeoutMinutes')
   * @returns The value, or undefined if not found
   */
  getMudConfig<T = unknown>(key: string): T | undefined {
    // Access config daemon from registry if loaded
    const configDaemon = this.registry.find('/daemons/config') as {
      get?: (key: string) => unknown;
    } | undefined;

    if (configDaemon?.get) {
      return configDaemon.get(key) as T | undefined;
    }

    // Return defaults if config daemon not loaded yet
    const defaults: Record<string, unknown> = {
      'disconnect.timeoutMinutes': 15,
    };
    return defaults[key] as T | undefined;
  }

  /**
   * Set a mud-wide configuration value.
   * Requires admin permission.
   * @param key The setting key
   * @param value The new value
   * @returns Object with success status and optional error message
   */
  setMudConfig(key: string, value: unknown): { success: boolean; error?: string } {
    // Check admin permission
    if (!this.isAdmin()) {
      return { success: false, error: 'Permission denied: admin required' };
    }

    // Access config daemon from registry
    const configDaemon = this.registry.find('/daemons/config') as {
      set?: (key: string, value: unknown) => { success: boolean; error?: string };
      save?: () => Promise<void>;
    } | undefined;

    if (!configDaemon?.set) {
      return { success: false, error: 'Config daemon not loaded' };
    }

    const result = configDaemon.set(key, value);

    // Auto-save on successful change
    if (result.success && configDaemon.save) {
      configDaemon.save().catch((err: Error) => {
        console.error('[EfunBridge] Failed to save config:', err);
      });
    }

    return result;
  }

  // ========== Hot Reload Efuns ==========

  /**
   * Reload an object from disk, updating the blueprint in memory.
   * Existing clones keep their old behavior; new clones use the updated code.
   * This is true runtime hot-reload without server restart.
   *
   * Requires builder permission or higher.
   *
   * @param objectPath The mudlib path (e.g., "/std/room", "/areas/town/tavern")
   * @returns Object with success status and details
   */
  async reloadObject(objectPath: string): Promise<{
    success: boolean;
    error?: string;
    existingClones: number;
  }> {
    // Check builder permission
    if (!this.isBuilder()) {
      return {
        success: false,
        error: 'Permission denied: builder required',
        existingClones: 0,
      };
    }

    const loader = getMudlibLoader({ mudlibPath: this.config.mudlibPath });
    return loader.reloadObject(objectPath);
  }

  /**
   * Reload a single command from disk.
   * Commands are modules with execute functions, not class-based objects.
   * Requires builder permission or higher.
   *
   * @param commandPath The mudlib path (e.g., "/cmds/player/_look")
   * @returns Object with success status
   */
  async reloadCommand(commandPath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Check builder permission
    if (!this.isBuilder()) {
      return {
        success: false,
        error: 'Permission denied: builder required',
      };
    }

    try {
      const commandManager = getCommandManager();
      return commandManager.reloadCommand(commandPath);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get information about a command by name.
   * Requires builder permission.
   *
   * @param name The command name to look up
   * @returns Command info or undefined if not found
   */
  getCommandInfo(name: string): {
    names: string[];
    filePath: string;
    level: number;
    description: string;
    usage?: string | undefined;
  } | undefined {
    if (!this.isBuilder()) {
      return undefined;
    }

    try {
      const commandManager = getCommandManager();
      return commandManager.getCommandInfo(name);
    } catch {
      return undefined;
    }
  }

  /**
   * Rehash commands - reload all commands from the cmds/ directories.
   * This discovers new commands and reloads existing ones.
   * Requires builder permission or higher.
   *
   * @returns Object with success status and command count
   */
  async rehashCommands(): Promise<{
    success: boolean;
    error?: string;
    commandCount: number;
  }> {
    // Check builder permission
    if (!this.isBuilder()) {
      return {
        success: false,
        error: 'Permission denied: builder required',
        commandCount: 0,
      };
    }

    try {
      const commandManager = getCommandManager();
      await commandManager.reload();
      return {
        success: true,
        commandCount: commandManager.commandCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        commandCount: 0,
      };
    }
  }

  /**
   * Get driver statistics including memory, objects, scheduler, and performance metrics.
   * Requires senior builder permission (level 2) or higher.
   *
   * @returns Object containing driver statistics or error if permission denied
   */
  getDriverStats(): {
    success: boolean;
    error?: string;
    memory?: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
      arrayBuffers: number;
    };
    uptime?: {
      seconds: number;
      formatted: string;
    };
    objects?: {
      total: number;
      blueprints: number;
      clones: number;
    };
    scheduler?: {
      heartbeats: number;
      callouts: number;
      heartbeatInterval: number;
    };
    commands?: {
      total: number;
    };
    players?: {
      active: number;
      connected: number;
    };
    nodeVersion?: string;
    platform?: string;
  } {
    // Check senior builder permission (level 2)
    const permissionLevel = this.getPermissionLevel();
    if (permissionLevel < 2) {
      return {
        success: false,
        error: 'Permission denied: senior builder required',
      };
    }

    try {
      const registry = getRegistry();
      const scheduler = getScheduler();
      const commandManager = getCommandManager();

      // Get memory usage
      const memUsage = process.memoryUsage();

      // Get uptime
      const uptimeSeconds = process.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeSeconds % 60);
      const uptimeFormatted = days > 0
        ? `${days}d ${hours}h ${minutes}m ${seconds}s`
        : hours > 0
          ? `${hours}h ${minutes}m ${seconds}s`
          : `${minutes}m ${seconds}s`;

      // Get player counts
      const allPlayers = this.allPlayersCallback?.() ?? [];
      const activePlayers = this.findActivePlayerCallback
        ? this.allPlayers().length
        : allPlayers.length;

      return {
        success: true,
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
          arrayBuffers: memUsage.arrayBuffers,
        },
        uptime: {
          seconds: uptimeSeconds,
          formatted: uptimeFormatted,
        },
        objects: {
          total: registry.objectCount,
          blueprints: registry.blueprintCount,
          clones: registry.objectCount - registry.blueprintCount,
        },
        scheduler: {
          heartbeats: scheduler.heartbeatCount,
          callouts: scheduler.callOutCount,
          heartbeatInterval: 2000, // Default, could be made configurable
        },
        commands: {
          total: commandManager.commandCount,
        },
        players: {
          active: activePlayers,
          connected: allPlayers.length,
        },
        nodeVersion: process.version,
        platform: process.platform,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ========== AI Efuns ==========

  /**
   * Get the player name for rate limiting purposes.
   */
  private getPlayerNameForRateLimit(): string {
    const player = this.context.thisPlayer;
    if (!player) return 'system';
    // Try to get name from player object (Living objects have name)
    const playerWithName = player as MudObject & { name?: string };
    return playerWithName.name || player.objectId || 'unknown';
  }

  /**
   * Check if Claude AI is configured and available.
   */
  aiAvailable(): boolean {
    const client = getClaudeClient();
    return client !== null && client.isConfigured();
  }

  /**
   * Generate text using Claude AI.
   * @param prompt The prompt/instruction
   * @param context Optional context (world lore, NPC background, etc.)
   * @param options Optional configuration
   */
  async aiGenerate(
    prompt: string,
    context?: string,
    options?: AIGenerateOptions
  ): Promise<AIGenerateResult> {
    const client = getClaudeClient();
    if (!client || !client.isConfigured()) {
      return { success: false, error: 'AI not configured' };
    }

    const playerName = this.getPlayerNameForRateLimit();

    const systemPrompt = context
      ? `${context}\n\nFollow the user's instructions carefully.`
      : 'You are a helpful assistant for a fantasy MUD game. Generate creative, atmospheric content.';

    const request: { systemPrompt: string; messages: ClaudeMessage[]; maxTokens?: number; temperature?: number } = {
      systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    };
    if (options?.maxTokens !== undefined) {
      request.maxTokens = options.maxTokens;
    }
    if (options?.temperature !== undefined) {
      request.temperature = options.temperature;
    }

    // Check rate limit first
    const rateCheckResult = client.checkRateLimit(`gen:${playerName}`);
    if (!rateCheckResult.allowed) {
      return {
        success: false,
        error: `Rate limited. Try again in ${rateCheckResult.retryAfter ?? 60} seconds.`,
      };
    }

    // Use continuation for long-form content if requested
    let result;
    if (options?.useContinuation) {
      result = await client.completeWithContinuation(request, options.maxContinuations ?? 2);
    } else {
      result = await client.completeWithRateLimit(`gen:${playerName}`, request);
    }

    const response: AIGenerateResult = { success: result.success };
    if (result.content !== undefined) {
      response.text = result.content;
    }
    if (result.error !== undefined) {
      response.error = result.error;
    }
    if (result.cached !== undefined) {
      response.cached = result.cached;
    }
    return response;
  }

  /**
   * Generate a description for a room, item, or NPC.
   * @param type The object type
   * @param details Details about what to describe
   * @param style Optional style hints
   */
  async aiDescribe(
    type: 'room' | 'item' | 'npc' | 'weapon' | 'armor',
    details: AIDescribeDetails,
    style?: 'verbose' | 'concise' | 'atmospheric'
  ): Promise<AIDescribeResult> {
    const client = getClaudeClient();
    if (!client || !client.isConfigured()) {
      return { success: false, error: 'AI not configured' };
    }

    const playerName = this.getPlayerNameForRateLimit();
    const rateCheck = client.checkRateLimit(`desc:${playerName}`);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Rate limited. Try again in ${rateCheck.retryAfter ?? 60} seconds.`,
      };
    }

    const styleGuide = style === 'verbose'
      ? 'Use rich, detailed prose with sensory details.'
      : style === 'concise'
        ? 'Be brief and direct. No flowery language.'
        : 'Create an atmospheric, immersive description.';

    const systemPrompt = `You are a creative writer for a fantasy MUD (text-based RPG) game.
Generate descriptions for game content. ${styleGuide}

IMPORTANT RULES:
- Short description: 3-8 words, lowercase, no period (e.g., "a dusty old tavern")
- Long description: 2-4 sentences, present tense, second person where appropriate
- Use color codes like {cyan}, {yellow}, {red}, {green}, {bold}, {/} for emphasis sparingly
- Never break character or mention being an AI`;

    const keywords = details.keywords?.join(', ') || '';
    const prompt = `Generate a ${type} description.
Name: ${details.name}
${keywords ? `Keywords/Theme: ${keywords}` : ''}
${details.theme ? `Theme: ${details.theme}` : ''}
${details.existing ? `Existing description to enhance: ${details.existing}` : ''}

Respond in this exact JSON format:
{"shortDesc": "...", "longDesc": "..."}`;

    const result = await client.completeWithRateLimit(`desc:${playerName}`, {
      systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });

    if (!result.success || !result.content) {
      return { success: false, error: result.error || 'No response' };
    }

    try {
      // Parse JSON response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'Invalid response format' };
      }
      const parsed = JSON.parse(jsonMatch[0]) as { shortDesc: string; longDesc: string };
      return {
        success: true,
        shortDesc: parsed.shortDesc,
        longDesc: parsed.longDesc,
      };
    } catch {
      return { success: false, error: 'Failed to parse AI response' };
    }
  }

  /**
   * Get an NPC response using AI with conversation history.
   * @param npcContext The NPC's context/personality
   * @param playerMessage What the player said
   * @param conversationHistory Previous messages in this conversation
   */
  async aiNpcResponse(
    npcContext: NPCAIContext,
    playerMessage: string,
    conversationHistory?: Array<{ role: 'player' | 'npc'; content: string }>
  ): Promise<AINpcResponseResult> {
    const client = getClaudeClient();
    if (!client || !client.isConfigured()) {
      return { success: false, error: 'AI not configured', fallback: true };
    }

    const playerName = this.getPlayerNameForRateLimit();
    const rateCheck = client.checkRateLimit(`npc:${playerName}`);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Rate limited. Try again in ${rateCheck.retryAfter ?? 60} seconds.`,
        fallback: true,
      };
    }

    // Build NPC system prompt
    const formalityDesc = npcContext.speakingStyle?.formality === 'formal'
      ? 'Speak formally and politely.'
      : npcContext.speakingStyle?.formality === 'archaic'
        ? 'Speak in an archaic, old-fashioned manner.'
        : 'Speak casually and naturally.';

    // Define word limits based on verbosity
    const verbosityLimits = {
      terse: { words: 25, desc: 'Keep responses very short (1-2 sentences, under 25 words).' },
      normal: { words: 50, desc: 'Keep responses concise (2-3 sentences, under 50 words).' },
      verbose: { words: 80, desc: 'Give moderately detailed responses (3-4 sentences, under 80 words).' },
    };
    const verbosity = npcContext.speakingStyle?.verbosity ?? 'normal';
    const verbosityConfig = verbosityLimits[verbosity] ?? verbosityLimits.normal;
    const verbosityDesc = verbosityConfig.desc;
    const maxWords = npcContext.maxResponseLength ?? verbosityConfig.words;

    const topics = npcContext.knowledgeScope?.topics?.join(', ') || 'general topics';
    const forbidden = npcContext.knowledgeScope?.forbidden?.join(', ');

    // Fetch world lore if specified
    let worldLoreContext = '';
    if (npcContext.knowledgeScope?.worldLore?.length) {
      try {
        const loader = getMudlibLoader();
        const loreModule = await loader.loadModule('/daemons/lore');
        const getLoreDaemon = loreModule.getLoreDaemon as () => {
          buildContext(ids: string[], maxLength?: number): string;
        };
        if (getLoreDaemon) {
          const loreDaemon = getLoreDaemon();
          worldLoreContext = loreDaemon.buildContext(npcContext.knowledgeScope.worldLore, 2000);
        }
      } catch (error) {
        console.warn('[aiNpcResponse] Failed to load world lore:', error);
      }
    }

    const systemPrompt = `You are ${npcContext.name}, an NPC in a fantasy MUD game.

PERSONALITY: ${npcContext.personality}
BACKGROUND: ${npcContext.background}
${npcContext.currentMood ? `CURRENT MOOD: ${npcContext.currentMood}` : ''}

SPEAKING STYLE:
- ${formalityDesc}
- ${verbosityDesc}
${npcContext.speakingStyle?.accent ? `- Speech pattern: ${npcContext.speakingStyle.accent}` : ''}

KNOWLEDGE:
- You can discuss: ${topics}
${forbidden ? `- NEVER discuss or reveal information about: ${forbidden}` : ''}
${npcContext.knowledgeScope?.localKnowledge ? `- Local knowledge: ${npcContext.knowledgeScope.localKnowledge.join(', ')}` : ''}
${worldLoreContext ? `\nWORLD LORE (use this knowledge naturally in conversation):\n${worldLoreContext}` : ''}

RULES:
- Stay completely in character as ${npcContext.name}
- Never break the fourth wall or mention being an AI
- Respond as if you are actually this character in the game world
- IMPORTANT: Keep responses under ${maxWords} words - this is a strict limit for game dialogue
- Do not use quotation marks around your speech
- End your response at a natural stopping point`;

    // Convert conversation history to Claude format
    const messages: ClaudeMessage[] = [];
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role === 'player' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }
    messages.push({ role: 'user', content: playerMessage });

    try {
      // Tokens are roughly 1.3x words, add buffer for safety
      const maxTokens = Math.ceil(maxWords * 1.5);

      const result = await client.completeWithRateLimit(`npc:${playerName}`, {
        systemPrompt,
        messages,
        temperature: 0.9,
        maxTokens,
      });

      if (!result.success) {
        const response: AINpcResponseResult = { success: false, fallback: true };
        if (result.error !== undefined) {
          response.error = result.error;
        }
        return response;
      }

      const response: AINpcResponseResult = { success: true };
      if (result.content !== undefined) {
        response.response = result.content;
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message, fallback: true };
    }
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
      getAllObjects: this.getAllObjects.bind(this),

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
      makeDir: this.makeDir.bind(this),
      removeDir: this.removeDir.bind(this),
      removeFile: this.removeFile.bind(this),
      moveFile: this.moveFile.bind(this),
      copyFileTo: this.copyFileTo.bind(this),

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
      sprintf: this.sprintf.bind(this),
      toSeconds: this.toSeconds.bind(this),
      toMilliseconds: this.toMilliseconds.bind(this),
      formatDuration: this.formatDuration.bind(this),
      formatDate: this.formatDate.bind(this),

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
      findConnectedPlayer: this.findConnectedPlayer.bind(this),
      transferConnection: this.transferConnection.bind(this),
      findActivePlayer: this.findActivePlayer.bind(this),
      registerActivePlayer: this.registerActivePlayer.bind(this),
      unregisterActivePlayer: this.unregisterActivePlayer.bind(this),
      executeCommand: this.executeCommand.bind(this),

      // Persistence
      savePlayer: this.savePlayer.bind(this),
      loadPlayerData: this.loadPlayerData.bind(this),
      playerExists: this.playerExists.bind(this),
      listPlayers: this.listPlayers.bind(this),

      // Hot Reload
      reloadObject: this.reloadObject.bind(this),
      reloadCommand: this.reloadCommand.bind(this),
      rehashCommands: this.rehashCommands.bind(this),
      getCommandInfo: this.getCommandInfo.bind(this),

      // Paging
      page: this.page.bind(this),

      // IDE
      ideOpen: this.ideOpen.bind(this),

      // GUI
      guiSend: this.guiSend.bind(this),
      sendQuestUpdate: this.sendQuestUpdate.bind(this),

      // Config
      getMudConfig: this.getMudConfig.bind(this),
      setMudConfig: this.setMudConfig.bind(this),

      // Stats
      getDriverStats: this.getDriverStats.bind(this),
      getObjectStats: this.getObjectStats.bind(this),
      getMemoryStats: this.getMemoryStats.bind(this),

      // AI
      aiAvailable: this.aiAvailable.bind(this),
      aiGenerate: this.aiGenerate.bind(this),
      aiDescribe: this.aiDescribe.bind(this),
      aiNpcResponse: this.aiNpcResponse.bind(this),
    };
  }

  /**
   * Get detailed object statistics from the registry.
   * Requires builder permission or higher.
   *
   * @returns Detailed object counts, types, and inventory sizes
   */
  getObjectStats(): {
    success: boolean;
    error?: string;
    totalObjects?: number;
    blueprints?: number;
    clones?: number;
    byType?: Record<string, number>;
    largestInventories?: Array<{ objectId: string; count: number }>;
    blueprintCloneCounts?: Array<{ path: string; clones: number }>;
  } {
    // Check builder permission
    if (!this.isBuilder()) {
      return {
        success: false,
        error: 'Permission denied: builder required',
      };
    }

    try {
      const stats = this.registry.getStats();
      return {
        success: true,
        ...stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current memory usage statistics.
   * Requires builder permission or higher.
   *
   * @returns Memory usage details
   */
  getMemoryStats(): {
    success: boolean;
    error?: string;
    heapUsed?: number;
    heapTotal?: number;
    external?: number;
    rss?: number;
    arrayBuffers?: number;
    heapUsedMb?: number;
    heapTotalMb?: number;
    rssMb?: number;
  } {
    // Check builder permission
    if (!this.isBuilder()) {
      return {
        success: false,
        error: 'Permission denied: builder required',
      };
    }

    try {
      const memUsage = process.memoryUsage();
      return {
        success: true,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        arrayBuffers: memUsage.arrayBuffers,
        heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        rssMb: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
