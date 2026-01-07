/**
 * Master Object - The central authority in the mudlib.
 *
 * The Master object is loaded by the driver at startup and handles
 * critical game-wide operations like login, permissions, and errors.
 */

import { MudObject } from './std/object.js';

/**
 * Connection interface (implemented by driver).
 */
export interface Connection {
  send(message: string): void;
  close(): void;
  isConnected(): boolean;
  getRemoteAddress(): string;
}

/**
 * Permission levels.
 */
export const PermissionLevel = {
  Player: 0,
  Builder: 1,
  SeniorBuilder: 2,
  Administrator: 3,
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

/**
 * Master object implementation.
 */
export class Master extends MudObject {
  private _bootTime: number = 0;
  private _permissions: Map<string, PermissionLevel> = new Map();
  private _domains: Map<string, string[]> = new Map(); // player -> domain paths

  constructor() {
    super();
    this.shortDesc = 'The Master';
    this.longDesc = 'The omniscient Master object of the MUD.';
  }

  // ========== Driver Hooks ==========

  /**
   * Called when the driver starts.
   */
  async onDriverStart(): Promise<void> {
    this._bootTime = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
    console.log('[Master] Driver started');

    // Load permissions from file
    await this.loadPermissions();
  }

  /**
   * Called to get the list of objects to preload.
   * @returns Array of object paths to preload
   */
  onPreload(): string[] {
    return [
      // Standard library objects
      '/std/object',
      '/std/room',
      '/std/item',
      '/std/container',
      '/std/living',
      '/std/player',
      '/std/npc',
      '/std/weapon',
      '/std/armor',
      // Starting areas
      '/areas/void/void',
      '/areas/valdoria/aldric/center',
      '/areas/valdoria/aldric/castle',
      '/areas/valdoria/aldric/tavern',
      '/areas/valdoria/aldric/market',
      '/areas/valdoria/aldric/gates',
      '/areas/valdoria/aldric/bakery',
      '/areas/valdoria/aldric/training_hall',
      '/areas/valdoria/aldric/bank',
      // Castle Dungeon
      '/areas/valdoria/aldric_depths/entrance',
      '/areas/valdoria/aldric_depths/corridor',
      '/areas/valdoria/aldric_depths/cellblock',
      '/areas/valdoria/aldric_depths/guard_room',
      '/areas/valdoria/aldric_depths/storage',
      '/areas/valdoria/aldric_depths/depths',
      // Daemons
      '/daemons/login',
      '/daemons/channels',
      '/daemons/config',
      '/daemons/soul',
    ];
  }

  /**
   * Called when the driver shuts down.
   */
  async onShutdown(): Promise<void> {
    console.log('[Master] Driver shutting down');

    // Save permissions
    await this.savePermissions();

    // Could save world state here
  }

  /**
   * Called when a new player connects.
   * @param connection The new connection
   * @returns The path to the login object
   */
  onPlayerConnect(connection: Connection): string {
    console.log(`[Master] New connection from ${connection.getRemoteAddress()}`);

    // Return the login daemon path
    return '/daemons/login';
  }

  /**
   * Called when a player disconnects.
   * @param player The disconnecting player
   */
  onPlayerDisconnect(player: MudObject): void {
    console.log(`[Master] Player disconnected: ${player.shortDesc}`);
  }

  /**
   * Validate read access to a file.
   * @param path The file path
   * @param player The player requesting access (null for driver)
   */
  validRead(path: string, player: MudObject | null): boolean {
    // Driver always has access
    if (!player) return true;

    // Everyone can read most files
    // Restrict certain directories
    if (path.startsWith('/data/')) {
      // Only admins can read data files
      return this.getPermissionLevel(player) >= PermissionLevel.Administrator;
    }

    return true;
  }

  /**
   * Validate write access to a file.
   * @param path The file path
   * @param player The player requesting access (null for driver)
   */
  validWrite(path: string, player: MudObject | null): boolean {
    // Driver always has access
    if (!player) return true;

    const level = this.getPermissionLevel(player);

    // Players can't write at all
    if (level < PermissionLevel.Builder) return false;

    // Admins can write anywhere
    if (level >= PermissionLevel.Administrator) return true;

    // Builders can only write to their domains
    const playerName = (player as MudObject & { name?: string }).name?.toLowerCase() || '';
    const domains = this._domains.get(playerName) || [];

    // Check if path is within an allowed domain
    for (const domain of domains) {
      if (path.startsWith(domain)) return true;
    }

    // Senior builders can write to /std/ alternatives but not /std/ itself
    if (level >= PermissionLevel.SeniorBuilder) {
      if (path.startsWith('/lib/')) return true;
    }

    return false;
  }

  /**
   * Called when a runtime error occurs.
   * @param error The error
   * @param object The object where the error occurred
   */
  onRuntimeError(error: Error, object: MudObject | null): void {
    console.error(`[Master] Runtime error in ${object?.objectId || 'unknown'}:`, error);

    // Could log to file, notify admins, etc.
  }

  // ========== Permissions ==========

  /**
   * Get a player's permission level.
   * @param player The player
   */
  getPermissionLevel(player: MudObject): PermissionLevel {
    const name = (player as MudObject & { name?: string }).name?.toLowerCase() || '';
    return this._permissions.get(name) || PermissionLevel.Player;
  }

  /**
   * Set a player's permission level.
   * @param playerName The player's name
   * @param level The permission level
   */
  setPermissionLevel(playerName: string, level: PermissionLevel): void {
    this._permissions.set(playerName.toLowerCase(), level);
  }

  /**
   * Add a domain to a builder's allowed domains.
   * @param playerName The builder's name
   * @param domainPath The domain path (e.g., "/areas/forest/")
   */
  addDomain(playerName: string, domainPath: string): void {
    const name = playerName.toLowerCase();
    const domains = this._domains.get(name) || [];
    if (!domains.includes(domainPath)) {
      domains.push(domainPath);
      this._domains.set(name, domains);
    }
  }

  /**
   * Remove a domain from a builder's allowed domains.
   * @param playerName The builder's name
   * @param domainPath The domain path
   */
  removeDomain(playerName: string, domainPath: string): void {
    const name = playerName.toLowerCase();
    const domains = this._domains.get(name) || [];
    const idx = domains.indexOf(domainPath);
    if (idx >= 0) {
      domains.splice(idx, 1);
      this._domains.set(name, domains);
    }
  }

  /**
   * Get a builder's domains.
   * @param playerName The builder's name
   */
  getDomains(playerName: string): string[] {
    return this._domains.get(playerName.toLowerCase()) || [];
  }

  /**
   * Load permissions from file.
   */
  private async loadPermissions(): Promise<void> {
    // This would load from /data/permissions.json
    // For now, set up a default admin
    this._permissions.set('admin', PermissionLevel.Administrator);
    console.log('[Master] Permissions loaded');
  }

  /**
   * Save permissions to file.
   */
  private async savePermissions(): Promise<void> {
    // This would save to /data/permissions.json
    console.log('[Master] Permissions saved');
  }

  // ========== Utility ==========

  /**
   * Get the driver's uptime in seconds.
   */
  getUptime(): number {
    const now = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
    return now - this._bootTime;
  }

  /**
   * Get the boot time.
   */
  getBootTime(): number {
    return this._bootTime;
  }
}

export default Master;
