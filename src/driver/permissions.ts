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
  /** Files that cannot be modified from in-game at all (security-critical) */
  forbiddenFiles: string[];
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
  permissionLevel?: number;
}

/**
 * Permission management class.
 */
export class Permissions {
  private config: PermissionsConfig;
  private levels: Map<string, PermissionLevel> = new Map();
  private domains: Map<string, string[]> = new Map();
  private commandPaths: Map<string, string[]> = new Map();
  private auditLog: AuditEntry[] = [];
  private maxAuditEntries: number = 10000;

  // Role-based path permissions (mutable at runtime)
  private protectedPaths: string[] = ['/std/', '/daemons/'];
  private forbiddenFiles: string[] = [
    '/tsconfig.json',
    '/package.json',
    '/package-lock.json',
    '/.env',
    '/.gitignore',
  ];
  private builderPaths: string[] = ['/areas/'];
  private seniorPaths: string[] = ['/lib/', '/cmds/'];

  constructor(config: Partial<PermissionsConfig> = {}) {
    this.config = {
      dataPath: config.dataPath ?? './mudlib/data/permissions.json',
      protectedPaths: config.protectedPaths ?? ['/std/', '/daemons/'],
      forbiddenFiles: config.forbiddenFiles ?? [
        '/tsconfig.json',
        '/package.json',
        '/package-lock.json',
        '/.env',
        '/.gitignore',
      ],
    };
    // Initialize from config
    this.protectedPaths = [...this.config.protectedPaths];
    this.forbiddenFiles = [...this.config.forbiddenFiles];
  }

  // ========== Permission Level ==========

  /**
   * Get a player's permission level.
   * @param player The player or player name
   */
  getLevel(player: MudObject | string): PermissionLevel {
    // First check the internal levels map
    const name = this.getPlayerName(player);
    const storedLevel = this.levels.get(name);
    if (storedLevel !== undefined) {
      return storedLevel;
    }

    // Fall back to the player object's permissionLevel property
    if (typeof player !== 'string') {
      const p = player as PermissionPlayer;
      if (p.permissionLevel !== undefined) {
        return p.permissionLevel as PermissionLevel;
      }
    }

    return PermissionLevel.Player;
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

    // Check forbidden files first - these cannot be modified from in-game at all
    if (this.isForbiddenFile(path)) {
      this.logAction(player, 'write', path, false, 'File is forbidden (security-critical)');
      return false;
    }

    // Players can't write at all
    if (level < PermissionLevel.Builder) {
      this.logAction(player, 'write', path, false, 'Insufficient permission level');
      return false;
    }

    // Check protected paths - only admins can write
    if (this.isProtectedPath(path)) {
      if (level < PermissionLevel.Administrator) {
        this.logAction(player, 'write', path, false, 'Path is protected');
        return false;
      }
    }

    // Administrators can write anywhere (except forbidden)
    if (level >= PermissionLevel.Administrator) {
      this.logAction(player, 'write', path, true);
      return true;
    }

    // Senior builders can write to senior paths
    if (level >= PermissionLevel.SeniorBuilder) {
      if (this.isSeniorPath(path)) {
        this.logAction(player, 'write', path, true);
        return true;
      }
    }

    // Builders (and senior builders) must have explicit domain assignments
    // to write to builder paths like /areas/
    // Check individual domains (for specific player assignments)
    const domains = this.getDomains(name);
    for (const domain of domains) {
      if (path.startsWith(domain)) {
        this.logAction(player, 'write', path, true);
        return true;
      }
    }

    this.logAction(player, 'write', path, false, 'Outside allowed paths');
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
    for (const protectedPath of this.protectedPaths) {
      if (path.startsWith(protectedPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a file is forbidden (cannot be modified from in-game at all).
   * @param path The file path
   */
  isForbiddenFile(path: string): boolean {
    const normalizedPath = path.toLowerCase();
    for (const forbidden of this.forbiddenFiles) {
      if (normalizedPath === forbidden.toLowerCase()) {
        return true;
      }
      // Also check if it ends with the forbidden filename (for paths like /tsconfig.json)
      if (normalizedPath.endsWith(forbidden.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the list of forbidden files.
   */
  getForbiddenFiles(): string[] {
    return [...this.forbiddenFiles];
  }

  /**
   * Get the list of protected paths.
   */
  getProtectedPaths(): string[] {
    return [...this.protectedPaths];
  }

  /**
   * Get the list of builder paths.
   */
  getBuilderPaths(): string[] {
    return [...this.builderPaths];
  }

  /**
   * Get the list of senior builder paths.
   */
  getSeniorPaths(): string[] {
    return [...this.seniorPaths];
  }

  // ========== Role Path Management ==========

  /**
   * Add a protected path (admin only).
   */
  addProtectedPath(path: string): void {
    if (!this.protectedPaths.includes(path)) {
      this.protectedPaths.push(path);
    }
  }

  /**
   * Remove a protected path.
   */
  removeProtectedPath(path: string): boolean {
    const index = this.protectedPaths.indexOf(path);
    if (index >= 0) {
      this.protectedPaths.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Add a forbidden file.
   */
  addForbiddenFile(path: string): void {
    if (!this.forbiddenFiles.includes(path)) {
      this.forbiddenFiles.push(path);
    }
  }

  /**
   * Remove a forbidden file.
   */
  removeForbiddenFile(path: string): boolean {
    const index = this.forbiddenFiles.indexOf(path);
    if (index >= 0) {
      this.forbiddenFiles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Add a builder path.
   */
  addBuilderPath(path: string): void {
    if (!this.builderPaths.includes(path)) {
      this.builderPaths.push(path);
    }
  }

  /**
   * Remove a builder path.
   */
  removeBuilderPath(path: string): boolean {
    const index = this.builderPaths.indexOf(path);
    if (index >= 0) {
      this.builderPaths.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Add a senior builder path.
   */
  addSeniorPath(path: string): void {
    if (!this.seniorPaths.includes(path)) {
      this.seniorPaths.push(path);
    }
  }

  /**
   * Remove a senior builder path.
   */
  removeSeniorPath(path: string): boolean {
    const index = this.seniorPaths.indexOf(path);
    if (index >= 0) {
      this.seniorPaths.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if path is in builder paths.
   */
  isBuilderPath(path: string): boolean {
    for (const builderPath of this.builderPaths) {
      if (path.startsWith(builderPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if path is in senior builder paths.
   */
  isSeniorPath(path: string): boolean {
    for (const seniorPath of this.seniorPaths) {
      if (path.startsWith(seniorPath)) {
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

  // ========== Command Path Management ==========

  /**
   * Get the default command paths for a given permission level.
   * @param level The permission level
   */
  private getDefaultCommandPathsForLevel(level: PermissionLevel): string[] {
    const paths = ['player'];
    if (level >= PermissionLevel.Builder) paths.push('builder');
    if (level >= PermissionLevel.SeniorBuilder) paths.push('senior');
    if (level >= PermissionLevel.Administrator) paths.push('admin');
    return paths;
  }

  /**
   * Get a player's custom command paths (if any).
   * @param playerName The player's name
   */
  getCommandPaths(playerName: string): string[] | undefined {
    return this.commandPaths.get(playerName.toLowerCase());
  }

  /**
   * Set a player's command paths explicitly.
   * @param playerName The player's name
   * @param paths The command paths to allow
   */
  setCommandPaths(playerName: string, paths: string[]): void {
    this.commandPaths.set(playerName.toLowerCase(), [...paths]);
  }

  /**
   * Add a command path to a player.
   * @param playerName The player's name
   * @param path The command path to add
   */
  addCommandPath(playerName: string, path: string): void {
    const name = playerName.toLowerCase();
    const paths = this.commandPaths.get(name) ?? [];
    if (!paths.includes(path)) {
      paths.push(path);
      this.commandPaths.set(name, paths);
    }
  }

  /**
   * Remove a command path from a player.
   * @param playerName The player's name
   * @param path The command path to remove
   */
  removeCommandPath(playerName: string, path: string): void {
    const name = playerName.toLowerCase();
    const paths = this.commandPaths.get(name) ?? [];
    const index = paths.indexOf(path);
    if (index >= 0) {
      paths.splice(index, 1);
      this.commandPaths.set(name, paths);
    }
  }

  /**
   * Clear a player's custom command paths (reset to level-derived defaults).
   * @param playerName The player's name
   */
  clearCommandPaths(playerName: string): void {
    this.commandPaths.delete(playerName.toLowerCase());
  }

  /**
   * Get the effective command paths for a player.
   * If the player has custom paths set, returns those.
   * Otherwise, returns the default paths for their permission level.
   * @param playerName The player's name
   * @param level The player's permission level
   */
  getEffectiveCommandPaths(playerName: string, level: PermissionLevel): string[] {
    // Always start with default paths for the player's permission level
    const defaultPaths = this.getDefaultCommandPathsForLevel(level);
    const customPaths = this.commandPaths.get(playerName.toLowerCase());

    if (customPaths === undefined || customPaths.length === 0) {
      return defaultPaths;
    }

    // Merge default paths with custom paths (custom paths are additive)
    const allPaths = new Set([...defaultPaths, ...customPaths]);
    return Array.from(allPaths);
  }

  /**
   * Check if a player has a specific command path.
   * @param playerName The player's name
   * @param path The command path
   * @param level The player's permission level (for fallback)
   */
  hasCommandPath(playerName: string, path: string, level: PermissionLevel): boolean {
    return this.getEffectiveCommandPaths(playerName, level).includes(path);
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
      ...(details !== undefined ? { details } : {}),
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
    commandPaths: Record<string, string[]>;
    protectedPaths: string[];
    forbiddenFiles: string[];
    builderPaths: string[];
    seniorPaths: string[];
  } {
    const levels: Record<string, PermissionLevel> = {};
    for (const [name, level] of this.levels) {
      levels[name] = level;
    }

    const domains: Record<string, string[]> = {};
    for (const [name, paths] of this.domains) {
      domains[name] = paths;
    }

    const commandPaths: Record<string, string[]> = {};
    for (const [name, paths] of this.commandPaths) {
      commandPaths[name] = paths;
    }

    return {
      levels,
      domains,
      commandPaths,
      protectedPaths: [...this.protectedPaths],
      forbiddenFiles: [...this.forbiddenFiles],
      builderPaths: [...this.builderPaths],
      seniorPaths: [...this.seniorPaths],
    };
  }

  /**
   * Import permissions data.
   */
  import(data: {
    levels?: Record<string, PermissionLevel>;
    domains?: Record<string, string[]>;
    commandPaths?: Record<string, string[]>;
    protectedPaths?: string[];
    forbiddenFiles?: string[];
    builderPaths?: string[];
    seniorPaths?: string[];
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

    if (data.commandPaths) {
      for (const [name, paths] of Object.entries(data.commandPaths)) {
        this.commandPaths.set(name.toLowerCase(), paths);
      }
    }

    if (data.protectedPaths) {
      this.protectedPaths = [...data.protectedPaths];
    }

    if (data.forbiddenFiles) {
      this.forbiddenFiles = [...data.forbiddenFiles];
    }

    if (data.builderPaths) {
      this.builderPaths = [...data.builderPaths];
    }

    if (data.seniorPaths) {
      this.seniorPaths = [...data.seniorPaths];
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
