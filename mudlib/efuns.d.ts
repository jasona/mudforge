/**
 * Global efuns type declarations for the mudlib.
 *
 * Efuns (external functions) are provided by the driver and available
 * as a global `efuns` object in all mudlib code.
 *
 * This file provides TypeScript type information so you don't need to
 * declare efuns at the top of every file.
 */

import type { MudObject } from './std/object.js';

/**
 * Player save data structure.
 */
interface PlayerSaveData {
  name: string;
  passwordHash: string;
  properties: Record<string, unknown>;
  inventory?: string[];
  equipment?: Record<string, string>;
  createdAt: number;
  lastLogin: number;
}

/**
 * Pager options for displaying long content.
 */
interface PageOptions {
  linesPerPage?: number;
  title?: string;
  showLineNumbers?: boolean;
  onExit?: () => void;
}

/**
 * IDE message for client communication.
 */
interface IdeMessage {
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
 * Global efuns object provided by the driver.
 */
declare global {
  const efuns: {
    // ========== Object Efuns ==========

    /** Clone an object from a blueprint path */
    cloneObject(path: string): Promise<MudObject | undefined>;

    /** Destroy an object */
    destruct(object: MudObject): Promise<void>;

    /** Load an object (get blueprint) */
    loadObject(path: string): MudObject | undefined;

    /** Find an object by path or ID */
    findObject(pathOrId: string): MudObject | undefined;

    // ========== Hierarchy Efuns ==========

    /** Get all objects in an object's inventory */
    allInventory(object: MudObject): MudObject[];

    /** Get an object's environment */
    environment(object: MudObject): MudObject | null;

    /** Move an object to a new environment */
    move(object: MudObject, destination: MudObject | null): Promise<boolean>;

    // ========== Player Efuns ==========

    /** Get the current "this object" from context */
    thisObject(): MudObject | null;

    /** Get the current "this player" from context */
    thisPlayer(): MudObject | null;

    /** Get all connected players */
    allPlayers(): MudObject[];

    /** Send a message to an object (typically a player) */
    send(target: MudObject, message: string): void;

    // ========== File Efuns ==========

    /** Read a file's contents */
    readFile(path: string): Promise<string>;

    /** Write content to a file */
    writeFile(path: string, content: string): Promise<void>;

    /** Check if a file exists */
    fileExists(path: string): Promise<boolean>;

    /** Read a directory's contents */
    readDir(path: string): Promise<string[]>;

    /** Get file information */
    fileStat(path: string): Promise<{
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtime: Date;
    }>;

    /** Create a directory */
    makeDir(path: string, recursive?: boolean): Promise<void>;

    /** Remove a directory */
    removeDir(path: string, recursive?: boolean): Promise<void>;

    /** Remove a file */
    removeFile(path: string): Promise<void>;

    /** Move/rename a file or directory */
    moveFile(srcPath: string, destPath: string): Promise<void>;

    /** Copy a file */
    copyFileTo(srcPath: string, destPath: string): Promise<void>;

    // ========== Utility Efuns ==========

    /** Get current timestamp in seconds */
    time(): number;

    /** Get current timestamp in milliseconds */
    timeMs(): number;

    /** Generate a random integer (0 to max-1) */
    random(max: number): number;

    /** Capitalize a string */
    capitalize(str: string): string;

    /** Split a string into an array */
    explode(str: string, delimiter: string): string[];

    /** Join an array into a string */
    implode(arr: string[], delimiter: string): string;

    /** Trim whitespace from a string */
    trim(str: string): string;

    /** Convert string to lowercase */
    lower(str: string): string;

    /** Convert string to uppercase */
    upper(str: string): string;

    /**
     * Format a string using printf-style format specifiers.
     *
     * Supported specifiers:
     *   %s - String
     *   %d, %i - Integer
     *   %f - Float (default 6 decimal places)
     *   %c - Character
     *   %x, %X - Hexadecimal (lower/upper)
     *   %o - Octal
     *   %b - Binary
     *   %j, %J - JSON (compact/pretty)
     *   %% - Literal percent
     *
     * Modifiers:
     *   - Left-align
     *   + Show sign for positive numbers
     *   0 Zero-pad numbers
     *   # Alternate form (0x, 0o, 0b prefixes)
     *   width - Minimum field width
     *   .prec - Precision (max chars for strings, decimals for floats)
     *   |width| or =width= - Center align
     *
     * @example
     * sprintf("Name: %-20s HP: %d/%d", name, hp, maxHp)
     * sprintf("Gold: %,d", gold)  // with thousands separator
     * sprintf("%|40|s", "TITLE") // centered in 40 chars
     */
    sprintf(format: string, ...args: unknown[]): string;

    /** Convert a timestamp to seconds */
    toSeconds(timestamp: number): number;

    /** Convert a timestamp to milliseconds */
    toMilliseconds(timestamp: number): number;

    /** Format a duration in seconds to human-readable string */
    formatDuration(seconds: number): string;

    /** Format a timestamp to human-readable date string */
    formatDate(timestamp: number): string;

    // ========== Permission Efuns ==========

    /** Check if current player can read a path */
    checkReadPermission(path: string): boolean;

    /** Check if current player can write to a path */
    checkWritePermission(path: string): boolean;

    /** Check if current player is an administrator */
    isAdmin(): boolean;

    /** Check if current player is a builder */
    isBuilder(): boolean;

    /** Get current player's permission level */
    getPermissionLevel(): number;

    /** Get current player's domains */
    getDomains(): string[];

    // ========== Scheduler Efuns ==========

    /** Set heartbeat for an object */
    setHeartbeat(object: MudObject, enable: boolean): void;

    /** Schedule a delayed callback */
    callOut(callback: () => void | Promise<void>, delayMs: number): number;

    /** Cancel a scheduled callback */
    removeCallOut(id: number): boolean;

    // ========== Connection Efuns ==========

    /** Bind a player object to a connection */
    bindPlayerToConnection(connection: unknown, player: MudObject): void;

    /** Find a connected player by name */
    findConnectedPlayer(name: string): MudObject | undefined;

    /** Transfer a connection to an existing player (session takeover) */
    transferConnection(connection: unknown, player: MudObject): void;

    /** Find an active player by name (in game world, possibly disconnected) */
    findActivePlayer(name: string): MudObject | undefined;

    /** Register a player as active in the game world */
    registerActivePlayer(player: MudObject): void;

    /** Unregister a player from the active players list */
    unregisterActivePlayer(player: MudObject): void;

    /** Execute a command through the command manager */
    executeCommand(player: MudObject, input: string, level?: number): Promise<boolean>;

    // ========== Persistence Efuns ==========

    /** Save a player to disk */
    savePlayer(player: MudObject): Promise<void>;

    /** Load a player's saved data */
    loadPlayerData(name: string): Promise<PlayerSaveData | null>;

    /** Check if a player save exists */
    playerExists(name: string): Promise<boolean>;

    /** List all saved player names */
    listPlayers(): Promise<string[]>;

    // ========== Hot Reload Efuns ==========

    /** Reload an object from disk (for class-based objects) */
    reloadObject(path: string): Promise<{
      success: boolean;
      error?: string;
      existingClones: number;
      migratedObjects?: number;
    }>;

    /** Reload a command from disk */
    reloadCommand(path: string): Promise<{
      success: boolean;
      error?: string;
    }>;

    /** Rehash all commands */
    rehashCommands(): Promise<{
      success: boolean;
      error?: string;
      commandCount: number;
    }>;

    // ========== Paging Efuns ==========

    /** Display content with Linux-style paging */
    page(content: string | string[], options?: PageOptions): void;

    // ========== IDE Efuns ==========

    /** Send an IDE message to the client */
    ideOpen(message: IdeMessage): void;

    // ========== Config Efuns ==========

    /**
     * Get a mud-wide configuration value.
     * @param key The setting key (e.g., 'disconnect.timeoutMinutes')
     * @returns The value, or undefined if not found
     */
    getMudConfig<T = unknown>(key: string): T | undefined;

    /**
     * Set a mud-wide configuration value.
     * Requires admin permission.
     * @param key The setting key
     * @param value The new value
     * @returns Object with success status and optional error message
     */
    setMudConfig(key: string, value: unknown): { success: boolean; error?: string };

    // ========== Stats Efuns ==========

    /**
     * Get driver statistics including memory, objects, scheduler, and performance metrics.
     * Requires senior builder permission (level 2) or higher.
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
    };
  };
}

export {};
