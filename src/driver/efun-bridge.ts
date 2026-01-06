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
      rehashCommands: this.rehashCommands.bind(this),

      // Paging
      page: this.page.bind(this),

      // IDE
      ideOpen: this.ideOpen.bind(this),
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
