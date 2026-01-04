/**
 * Permissions - Permission enforcement layer.
 *
 * Implements tiered permission system with domain-based write restrictions.
 */

import type { MudObject } from './types.js';

/**
 * Permission levels.
 */
export enum PermissionLevel {
  Player = 0,
  Builder = 1,
  SeniorBuilder = 2,
  Administrator = 3,
}

/**
 * Permission configuration.
 */
export interface PermissionsConfig {
  /** Path to permissions data file */
  dataPath: string;
  /** Paths that are protected (only Administrators can modify) */
  protectedPaths: string[];
}

/**
 * Domain assignment.
 */
export interface DomainAssignment {
  playerName: string;
  paths: string[];
}

/**
 * Audit log entry.
 */
export interface AuditEntry {
  timestamp: number;
  player: string;
  action: string;
  target: string;
  details?: string;
  success: boolean;
}

/**
 * Player interface for permission checking.
 */
interface PermissionPlayer extends MudObject {
  name?: string;
}

/**
 * Permission management class.
 */
export class Permissions {
  private config: PermissionsConfig;
  private levels: Map<string, PermissionLevel> = new Map();
  private domains: Map<string, string[]> = new Map();
  private auditLog: AuditEntry[] = [];
  private maxAuditEntries: number = 10000;

  constructor(config: Partial<PermissionsConfig> = {}) {
    this.config = {
      dataPath: config.dataPath ?? './mudlib/data/permissions.json',
      protectedPaths: config.protectedPaths ?? ['/std/', '/core/', '/daemon/'],
    };
  }

  // ========== Permission Level ==========

  /**
   * Get a player's permission level.
   * @param player The player or player name
   */
  getLevel(player: MudObject | string): PermissionLevel {
    const name = this.getPlayerName(player);
    return this.levels.get(name) ?? PermissionLevel.Player;
  }

  /**
   * Set a player's permission level.
   * @param playerName The player's name
   * @param level The permission level
   */
  setLevel(playerName: string, level: PermissionLevel): void {
    this.levels.set(playerName.toLowerCase(), level);
  }

  /**
   * Check if a player has at least the specified level.
   * @param player The player
   * @param requiredLevel The required level
   */
  hasLevel(player: MudObject | string, requiredLevel: PermissionLevel): boolean {
    return this.getLevel(player) >= requiredLevel;
  }

  /**
   * Check if a player is an Administrator.
   * @param player The player
   */
  isAdmin(player: MudObject | string): boolean {
    return this.hasLevel(player, PermissionLevel.Administrator);
  }

  /**
   * Check if a player is a Builder (or higher).
   * @param player The player
   */
  isBuilder(player: MudObject | string): boolean {
    return this.hasLevel(player, PermissionLevel.Builder);
  }

  // ========== Read/Write Permissions ==========

  /**
   * Check if a player can read a file path.
   * @param player The player (null for driver)
   * @param path The file path
   */
  canRead(player: MudObject | null, path: string): boolean {
    // Driver always has access
    if (!player) return true;

    // Players can read most files by default
    // Could restrict /data/ or other sensitive paths here

    // Log the access
    this.logAction(player, 'read', path, true);

    return true;
  }

  /**
   * Check if a player can write to a file path.
   * @param player The player (null for driver)
   * @param path The file path
   */
  canWrite(player: MudObject | null, path: string): boolean {
    // Driver always has access
    if (!player) return true;

    const level = this.getLevel(player);
    const name = this.getPlayerName(player);

    // Players can't write at all
    if (level < PermissionLevel.Builder) {
      this.logAction(player, 'write', path, false, 'Insufficient permission level');
      return false;
    }

    // Check protected paths
    if (this.isProtectedPath(path)) {
      if (level < PermissionLevel.Administrator) {
        this.logAction(player, 'write', path, false, 'Path is protected');
        return false;
      }
    }

    // Administrators can write anywhere
    if (level >= PermissionLevel.Administrator) {
      this.logAction(player, 'write', path, true);
      return true;
    }

    // Builders can only write to their domains
    const domains = this.getDomains(name);
    for (const domain of domains) {
      if (path.startsWith(domain)) {
        this.logAction(player, 'write', path, true);
        return true;
      }
    }

    // Senior builders can write to /lib/
    if (level >= PermissionLevel.SeniorBuilder && path.startsWith('/lib/')) {
      this.logAction(player, 'write', path, true);
      return true;
    }

    this.logAction(player, 'write', path, false, 'Outside assigned domains');
    return false;
  }

  /**
   * Check if a player can execute/load an object.
   * @param player The player (null for driver)
   * @param objectPath The object path
   */
  canExecute(player: MudObject | null, _objectPath: string): boolean {
    // Driver always has access
    if (!player) return true;

    // Everyone can execute/load objects
    // Could add restrictions for certain sensitive objects here

    return true;
  }

  /**
   * Check if a path is protected.
   * @param path The file path
   */
  isProtectedPath(path: string): boolean {
    for (const protectedPath of this.config.protectedPaths) {
      if (path.startsWith(protectedPath)) {
        return true;
      }
    }
    return false;
  }

  // ========== Domain Management ==========

  /**
   * Get a builder's assigned domains.
   * @param playerName The player's name
   */
  getDomains(playerName: string): string[] {
    return this.domains.get(playerName.toLowerCase()) ?? [];
  }

  /**
   * Set a builder's domains.
   * @param playerName The player's name
   * @param paths The domain paths
   */
  setDomains(playerName: string, paths: string[]): void {
    this.domains.set(playerName.toLowerCase(), [...paths]);
  }

  /**
   * Add a domain to a builder.
   * @param playerName The player's name
   * @param path The domain path
   */
  addDomain(playerName: string, path: string): void {
    const name = playerName.toLowerCase();
    const domains = this.domains.get(name) ?? [];
    if (!domains.includes(path)) {
      domains.push(path);
      this.domains.set(name, domains);
    }
  }

  /**
   * Remove a domain from a builder.
   * @param playerName The player's name
   * @param path The domain path
   */
  removeDomain(playerName: string, path: string): void {
    const name = playerName.toLowerCase();
    const domains = this.domains.get(name) ?? [];
    const index = domains.indexOf(path);
    if (index >= 0) {
      domains.splice(index, 1);
      this.domains.set(name, domains);
    }
  }

  /**
   * Check if a player has a specific domain.
   * @param playerName The player's name
   * @param path The domain path
   */
  hasDomain(playerName: string, path: string): boolean {
    return this.getDomains(playerName).includes(path);
  }

  /**
   * Get all domain assignments.
   */
  getAllDomains(): DomainAssignment[] {
    const result: DomainAssignment[] = [];
    for (const [playerName, paths] of this.domains) {
      result.push({ playerName, paths });
    }
    return result;
  }

  // ========== Audit Log ==========

  /**
   * Log an action for auditing.
   */
  private logAction(
    player: MudObject | string,
    action: string,
    target: string,
    success: boolean,
    details?: string
  ): void {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      player: this.getPlayerName(player),
      action,
      target,
      success,
      details,
    };

    this.auditLog.push(entry);

    // Trim log if too large
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.shift();
    }
  }

  /**
   * Get recent audit log entries.
   * @param limit Maximum number of entries to return
   */
  getAuditLog(limit: number = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get audit log entries for a specific player.
   * @param playerName The player's name
   * @param limit Maximum number of entries
   */
  getAuditLogForPlayer(playerName: string, limit: number = 100): AuditEntry[] {
    const name = playerName.toLowerCase();
    return this.auditLog.filter((e) => e.player === name).slice(-limit);
  }

  /**
   * Clear the audit log.
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  // ========== Serialization ==========

  /**
   * Export permissions data for saving.
   */
  export(): {
    levels: Record<string, PermissionLevel>;
    domains: Record<string, string[]>;
  } {
    const levels: Record<string, PermissionLevel> = {};
    for (const [name, level] of this.levels) {
      levels[name] = level;
    }

    const domains: Record<string, string[]> = {};
    for (const [name, paths] of this.domains) {
      domains[name] = paths;
    }

    return { levels, domains };
  }

  /**
   * Import permissions data.
   */
  import(data: {
    levels?: Record<string, PermissionLevel>;
    domains?: Record<string, string[]>;
  }): void {
    if (data.levels) {
      for (const [name, level] of Object.entries(data.levels)) {
        this.levels.set(name.toLowerCase(), level);
      }
    }

    if (data.domains) {
      for (const [name, paths] of Object.entries(data.domains)) {
        this.domains.set(name.toLowerCase(), paths);
      }
    }
  }

  // ========== Utility ==========

  /**
   * Get a player's name from various inputs.
   */
  private getPlayerName(player: MudObject | string): string {
    if (typeof player === 'string') {
      return player.toLowerCase();
    }
    const p = player as PermissionPlayer;
    return p.name?.toLowerCase() ?? 'unknown';
  }

  /**
   * Get permission level name.
   */
  getLevelName(level: PermissionLevel): string {
    switch (level) {
      case PermissionLevel.Player:
        return 'Player';
      case PermissionLevel.Builder:
        return 'Builder';
      case PermissionLevel.SeniorBuilder:
        return 'Senior Builder';
      case PermissionLevel.Administrator:
        return 'Administrator';
      default:
        return 'Unknown';
    }
  }
}

// Singleton instance
let permissionsInstance: Permissions | null = null;

/**
 * Get the global Permissions instance.
 */
export function getPermissions(config?: Partial<PermissionsConfig>): Permissions {
  if (!permissionsInstance) {
    permissionsInstance = new Permissions(config);
  }
  return permissionsInstance;
}

/**
 * Reset the global permissions. Used for testing.
 */
export function resetPermissions(): void {
  permissionsInstance = null;
}

export default Permissions;
