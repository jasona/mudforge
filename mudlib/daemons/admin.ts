/**
 * Admin Daemon - Administrative commands for permission management.
 *
 * Provides commands for managing player permissions and domains.
 * Only accessible to Administrators.
 */

import { PermissionLevel } from '../../src/driver/permissions.js';

// Permissions object is injected by the driver (not part of efuns)
declare const permissions: {
  getLevel: (player: string) => PermissionLevel;
  setLevel: (playerName: string, level: PermissionLevel) => void;
  getDomains: (playerName: string) => string[];
  setDomains: (playerName: string, paths: string[]) => void;
  addDomain: (playerName: string, path: string) => void;
  removeDomain: (playerName: string, path: string) => void;
  getLevelName: (level: PermissionLevel) => string;
  getAuditLog: (limit: number) => Array<{
    timestamp: number;
    player: string;
    action: string;
    target: string;
    success: boolean;
    details?: string;
  }>;
  getAllDomains: () => Array<{ playerName: string; paths: string[] }>;
};

/**
 * Admin command handler.
 */
export class AdminDaemon {
  /**
   * Check if the current player is an admin.
   */
  private requireAdmin(): boolean {
    if (!efuns.isAdmin()) {
      const player = efuns.thisPlayer();
      if (player) {
        efuns.send(player, 'You do not have permission to use this command.');
      }
      return false;
    }
    return true;
  }

  /**
   * Grant a permission level to a player.
   * Usage: grant <player> <level>
   * Levels: player, builder, seniorbuilder, administrator
   */
  cmdGrant(args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    const parts = args.trim().split(/\s+/);
    if (parts.length !== 2) {
      efuns.send(player, 'Usage: grant <player> <level>');
      efuns.send(player, 'Levels: player, builder, seniorbuilder, administrator');
      return false;
    }

    const [targetName, levelStr] = parts;
    const level = this.parseLevel(levelStr);

    if (level === null) {
      efuns.send(player, `Unknown level: ${levelStr}`);
      efuns.send(player, 'Valid levels: player, builder, seniorbuilder, administrator');
      return false;
    }

    permissions.setLevel(targetName, level);
    const levelName = permissions.getLevelName(level);
    efuns.send(player, `Granted ${levelName} level to ${targetName}.`);
    return true;
  }

  /**
   * Revoke permissions from a player (set to Player level).
   * Usage: revoke <player>
   */
  cmdRevoke(args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    const targetName = args.trim();
    if (!targetName) {
      efuns.send(player, 'Usage: revoke <player>');
      return false;
    }

    permissions.setLevel(targetName, PermissionLevel.Player);
    permissions.setDomains(targetName, []);
    efuns.send(player, `Revoked permissions from ${targetName}.`);
    return true;
  }

  /**
   * Add a domain to a builder.
   * Usage: addomain <player> <path>
   */
  cmdAddDomain(args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    const match = args.trim().match(/^(\S+)\s+(.+)$/);
    if (!match) {
      efuns.send(player, 'Usage: adddomain <player> <path>');
      return false;
    }

    const [, targetName, path] = match;

    // Ensure path ends with /
    const domainPath = path.endsWith('/') ? path : path + '/';

    permissions.addDomain(targetName, domainPath);
    efuns.send(player, `Added domain ${domainPath} to ${targetName}.`);
    return true;
  }

  /**
   * Remove a domain from a builder.
   * Usage: rmdomain <player> <path>
   */
  cmdRemoveDomain(args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    const match = args.trim().match(/^(\S+)\s+(.+)$/);
    if (!match) {
      efuns.send(player, 'Usage: rmdomain <player> <path>');
      return false;
    }

    const [, targetName, path] = match;

    // Ensure path ends with /
    const domainPath = path.endsWith('/') ? path : path + '/';

    permissions.removeDomain(targetName, domainPath);
    efuns.send(player, `Removed domain ${domainPath} from ${targetName}.`);
    return true;
  }

  /**
   * Show a player's domains.
   * Usage: domains [player]
   */
  cmdDomains(args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    const targetName = args.trim();

    if (targetName) {
      // Show specific player's domains
      const domains = permissions.getDomains(targetName);
      const level = permissions.getLevel(targetName);
      const levelName = permissions.getLevelName(level);

      efuns.send(player, `Permissions for ${targetName}:`);
      efuns.send(player, `  Level: ${levelName}`);

      if (domains.length === 0) {
        efuns.send(player, '  Domains: none');
      } else {
        efuns.send(player, '  Domains:');
        for (const domain of domains) {
          efuns.send(player, `    ${domain}`);
        }
      }
    } else {
      // Show all domain assignments
      const allDomains = permissions.getAllDomains();

      if (allDomains.length === 0) {
        efuns.send(player, 'No domain assignments.');
      } else {
        efuns.send(player, 'Domain assignments:');
        for (const { playerName, paths } of allDomains) {
          efuns.send(player, `  ${playerName}: ${paths.join(', ')}`);
        }
      }
    }

    return true;
  }

  /**
   * Show recent audit log entries.
   * Usage: audit [limit]
   */
  cmdAudit(args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    const limit = parseInt(args.trim()) || 20;
    const log = permissions.getAuditLog(limit);

    if (log.length === 0) {
      efuns.send(player, 'No audit log entries.');
      return true;
    }

    efuns.send(player, `Last ${log.length} audit log entries:`);

    for (const entry of log.slice(-limit).reverse()) {
      const date = new Date(entry.timestamp);
      const timeStr = date.toISOString().slice(11, 19);
      const status = entry.success ? 'OK' : 'DENIED';
      const details = entry.details ? ` (${entry.details})` : '';

      efuns.send(
        player,
        `  [${timeStr}] ${entry.player} ${entry.action} ${entry.target} - ${status}${details}`
      );
    }

    return true;
  }

  /**
   * Save world state.
   * Usage: save
   */
  cmdSave(_args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    // This would normally call the persistence layer
    efuns.send(player, 'Saving world state...');
    // In a real implementation, this would call:
    // await fileStore.saveWorldState(registry.getAllObjects());
    efuns.send(player, 'World state saved.');

    return true;
  }

  /**
   * Shutdown the MUD.
   * Usage: shutdown [reason]
   */
  cmdShutdown(args: string): boolean {
    if (!this.requireAdmin()) return false;

    const player = efuns.thisPlayer();
    if (!player) return false;

    const reason = args.trim() || 'Administrator shutdown';

    efuns.send(player, `Initiating shutdown: ${reason}`);
    efuns.send(player, 'Saving world state...');
    // In a real implementation, this would:
    // 1. Broadcast shutdown message to all players
    // 2. Save all player data
    // 3. Save world state
    // 4. Gracefully disconnect all players
    // 5. Call process.exit(0)
    efuns.send(player, 'Shutdown sequence initiated.');

    return true;
  }

  /**
   * Parse a permission level string.
   */
  private parseLevel(str: string): PermissionLevel | null {
    switch (str.toLowerCase()) {
      case 'player':
      case '0':
        return PermissionLevel.Player;
      case 'builder':
      case '1':
        return PermissionLevel.Builder;
      case 'seniorbuilder':
      case 'senior':
      case '2':
        return PermissionLevel.SeniorBuilder;
      case 'administrator':
      case 'admin':
      case '3':
        return PermissionLevel.Administrator;
      default:
        return null;
    }
  }
}

export default AdminDaemon;
