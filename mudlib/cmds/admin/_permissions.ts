/**
 * Permissions command - View and manage player permissions (admin only).
 *
 * Usage:
 *   permissions                - List all elevated users
 *   permissions <player>       - View a player's permission level and domains
 *   permissions domain add <player> <path>    - Add a domain to a builder
 *   permissions domain remove <player> <path> - Remove a domain from a builder
 *   permissions paths <player>                - Show player's command paths
 *   permissions paths add <player> <path>     - Add a command path
 *   permissions paths remove <player> <path>  - Remove a command path
 *   permissions paths reset <player>          - Reset to level defaults
 *   permissions paths set <player> <paths>    - Set explicit paths (comma-separated)
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['permissions', 'perms'];
export const description = 'View and manage player permissions (admin only)';
export const usage = 'permissions [player] | permissions domain|paths add/remove <player> <path>';

const LEVEL_NAMES: Record<number, string> = {
  0: 'Player',
  1: 'Builder',
  2: 'Senior Builder',
  3: 'Administrator',
};

const LEVEL_COLORS: Record<number, string> = {
  0: 'dim',
  1: 'cyan',
  2: 'yellow',
  3: 'red',
};

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  // No args - list all elevated users
  if (!args) {
    await listElevatedUsers(ctx);
    return;
  }

  const parts = args.split(/\s+/);

  // Handle domain subcommand
  if (parts[0].toLowerCase() === 'domain') {
    await handleDomainCommand(ctx, parts.slice(1));
    return;
  }

  // Handle paths subcommand
  if (parts[0].toLowerCase() === 'paths') {
    await handlePathsCommand(ctx, parts.slice(1));
    return;
  }

  // Show specific player's permissions
  await showPlayerPermissions(ctx, parts[0]);
}

/**
 * List all users with elevated permissions.
 */
async function listElevatedUsers(ctx: CommandContext): Promise<void> {
  // Get all connected players and check their levels
  const allPlayers = efuns.allPlayers();
  const elevated: Array<{ name: string; level: number; online: boolean }> = [];

  // Check online players
  for (const player of allPlayers) {
    const p = player as MudObject & { name?: string };
    if (!p.name) continue;

    const level = efuns.getPlayerPermissionLevel(p.name);
    if (level > 0) {
      elevated.push({ name: p.name, level, online: true });
    }
  }

  // Sort by level (highest first), then by name
  elevated.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return a.name.localeCompare(b.name);
  });

  if (elevated.length === 0) {
    ctx.sendLine('{yellow}No elevated users currently online.{/}');
    ctx.sendLine('{dim}Use "permissions <player>" to check a specific player.{/}');
    return;
  }

  ctx.sendLine('{cyan}=== Elevated Users (Online) ==={/}');
  ctx.sendLine('');

  for (const user of elevated) {
    const levelName = LEVEL_NAMES[user.level] ?? 'Unknown';
    const color = LEVEL_COLORS[user.level] ?? 'white';
    ctx.sendLine(`  {${color}}${levelName.padEnd(15)}{/} ${efuns.capitalize(user.name)}`);
  }

  ctx.sendLine('');
  ctx.sendLine('{dim}Use "promote <player>" or "demote <player>" to change levels.{/}');
}

/**
 * Show a specific player's permissions.
 */
async function showPlayerPermissions(ctx: CommandContext, playerName: string): Promise<void> {
  const name = playerName.toLowerCase();

  // Check if player exists
  const exists = await efuns.playerExists(name);
  const online = efuns.findConnectedPlayer(name);

  if (!exists && !online) {
    ctx.sendLine(`{red}Player "${playerName}" not found.{/}`);
    return;
  }

  // Get level using player name
  const level = efuns.getPlayerPermissionLevel(name);

  const levelName = LEVEL_NAMES[level] ?? 'Unknown';
  const color = LEVEL_COLORS[level] ?? 'white';

  ctx.sendLine(`{cyan}=== Permissions: ${efuns.capitalize(name)} ==={/}`);
  ctx.sendLine('');
  ctx.sendLine(`  Level: {${color}}${levelName}{/} (${level})`);
  ctx.sendLine(`  Status: ${online ? '{green}Online{/}' : '{dim}Offline{/}'}`);

  // Show command paths
  const cmdPaths = efuns.getCommandPaths(name);
  ctx.sendLine('');
  ctx.sendLine('  Command Paths:');
  for (const path of cmdPaths) {
    ctx.sendLine(`    {green}/cmds/${path}/{/}`);
  }

  // Show domains if builder or higher
  if (level >= 1) {
    let domains: string[] = [];
    if (online) {
      const p = online as MudObject & { name?: string };
      if (p.name) {
        domains = efuns.getDomains.call({ thisPlayer: () => online });
      }
    }

    ctx.sendLine('');
    if (domains.length > 0) {
      ctx.sendLine('  Write Domains:');
      for (const domain of domains) {
        ctx.sendLine(`    {yellow}${domain}{/}`);
      }
    } else {
      ctx.sendLine('  Write Domains: {dim}(none assigned){/}');
    }
  }

  ctx.sendLine('');
  ctx.sendLine('{dim}Use "promote/demote <player>" to change level.{/}');
  ctx.sendLine('{dim}Use "permissions paths <player>" to manage command access.{/}');
  if (level >= 1) {
    ctx.sendLine('{dim}Use "permissions domain add/remove <player> <path>" to manage write domains.{/}');
  }
}

/**
 * Handle domain add/remove subcommand.
 */
async function handleDomainCommand(ctx: CommandContext, parts: string[]): Promise<void> {
  if (parts.length < 3) {
    ctx.sendLine('{yellow}Usage:{/}');
    ctx.sendLine('  permissions domain add <player> <path>');
    ctx.sendLine('  permissions domain remove <player> <path>');
    ctx.sendLine('');
    ctx.sendLine('Example:');
    ctx.sendLine('  permissions domain add bob /areas/forest/');
    return;
  }

  const action = parts[0].toLowerCase();
  const playerName = parts[1].toLowerCase();
  const path = parts[2];

  if (action !== 'add' && action !== 'remove') {
    ctx.sendLine(`{red}Unknown action: ${action}. Use "add" or "remove".{/}`);
    return;
  }

  // Check player exists
  const exists = await efuns.playerExists(playerName);
  const online = efuns.findConnectedPlayer(playerName);

  if (!exists && !online) {
    ctx.sendLine(`{red}Player "${playerName}" not found.{/}`);
    return;
  }

  // Perform the action
  let result: { success: boolean; error?: string };
  if (action === 'add') {
    result = efuns.addDomain(playerName, path);
  } else {
    result = efuns.removeDomain(playerName, path);
  }

  if (!result.success) {
    ctx.sendLine(`{red}Failed: ${result.error}{/}`);
    return;
  }

  // Save permissions
  const saveResult = await efuns.savePermissions();
  if (!saveResult.success) {
    ctx.sendLine(`{yellow}Warning: Failed to save permissions: ${saveResult.error}{/}`);
  }

  if (action === 'add') {
    ctx.sendLine(`{green}Added domain "${path}" to ${efuns.capitalize(playerName)}.{/}`);
  } else {
    ctx.sendLine(`{green}Removed domain "${path}" from ${efuns.capitalize(playerName)}.{/}`);
  }
}

/**
 * Handle paths subcommand for command path management.
 */
async function handlePathsCommand(ctx: CommandContext, parts: string[]): Promise<void> {
  if (parts.length < 1) {
    ctx.sendLine('{yellow}Usage:{/}');
    ctx.sendLine('  permissions paths <player>                 - Show command paths');
    ctx.sendLine('  permissions paths add <player> <path>      - Add a command path');
    ctx.sendLine('  permissions paths remove <player> <path>   - Remove a command path');
    ctx.sendLine('  permissions paths reset <player>           - Reset to level defaults');
    ctx.sendLine('  permissions paths set <player> <paths>     - Set paths (comma-separated)');
    ctx.sendLine('');
    ctx.sendLine('Standard paths: player, builder, senior, admin');
    ctx.sendLine('Custom paths can be any command directory (e.g., guilds/fighter, users/bob)');
    return;
  }

  const action = parts[0].toLowerCase();

  // If first arg isn't a known action, treat it as a player name (show paths)
  if (!['add', 'remove', 'reset', 'set'].includes(action)) {
    // Show paths for the specified player
    const playerName = parts[0].toLowerCase();

    const exists = await efuns.playerExists(playerName);
    const online = efuns.findConnectedPlayer(playerName);

    if (!exists && !online) {
      ctx.sendLine(`{red}Player "${parts[0]}" not found.{/}`);
      return;
    }

    const cmdPaths = efuns.getCommandPaths(playerName);
    const level = efuns.getPlayerPermissionLevel(playerName);
    const levelName = LEVEL_NAMES[level] ?? 'Unknown';

    ctx.sendLine(`{cyan}=== Command Paths: ${efuns.capitalize(playerName)} ==={/}`);
    ctx.sendLine('');
    ctx.sendLine(`  Level: ${levelName} (${level})`);
    ctx.sendLine('');
    ctx.sendLine('  Allowed command directories:');
    for (const path of cmdPaths) {
      ctx.sendLine(`    {green}/cmds/${path}/{/}`);
    }
    ctx.sendLine('');
    ctx.sendLine('{dim}Use short names for add/remove (e.g., "player", "guilds/fighter"){/}');
    return;
  }

  // Handle add/remove/reset/set
  if (action === 'reset') {
    if (parts.length < 2) {
      ctx.sendLine('{red}Usage: permissions paths reset <player>{/}');
      return;
    }
    const playerName = parts[1].toLowerCase();

    const exists = await efuns.playerExists(playerName);
    const online = efuns.findConnectedPlayer(playerName);

    if (!exists && !online) {
      ctx.sendLine(`{red}Player "${parts[1]}" not found.{/}`);
      return;
    }

    const result = efuns.clearCommandPaths(playerName);
    if (!result.success) {
      ctx.sendLine(`{red}Failed: ${result.error}{/}`);
      return;
    }

    const saveResult = await efuns.savePermissions();
    if (!saveResult.success) {
      ctx.sendLine(`{yellow}Warning: Failed to save permissions: ${saveResult.error}{/}`);
    }

    ctx.sendLine(`{green}Reset command paths for ${efuns.capitalize(playerName)} to level defaults.{/}`);
    return;
  }

  if (action === 'set') {
    if (parts.length < 3) {
      ctx.sendLine('{red}Usage: permissions paths set <player> <path1,path2,...>{/}');
      ctx.sendLine('Example: permissions paths set bob player,builder,senior');
      return;
    }
    const playerName = parts[1].toLowerCase();
    const pathsStr = parts[2];

    const exists = await efuns.playerExists(playerName);
    const online = efuns.findConnectedPlayer(playerName);

    if (!exists && !online) {
      ctx.sendLine(`{red}Player "${parts[1]}" not found.{/}`);
      return;
    }

    const paths = pathsStr.split(',').map((p) => p.trim().toLowerCase());
    const result = efuns.setCommandPaths(playerName, paths);
    if (!result.success) {
      ctx.sendLine(`{red}Failed: ${result.error}{/}`);
      return;
    }

    const saveResult = await efuns.savePermissions();
    if (!saveResult.success) {
      ctx.sendLine(`{yellow}Warning: Failed to save permissions: ${saveResult.error}{/}`);
    }

    const fullPaths = paths.map((p) => `/cmds/${p}/`).join(', ');
    ctx.sendLine(`{green}Set command paths for ${efuns.capitalize(playerName)} to: ${fullPaths}{/}`);
    return;
  }

  // Handle add/remove
  if (parts.length < 3) {
    ctx.sendLine(`{red}Usage: permissions paths ${action} <player> <path>{/}`);
    ctx.sendLine('Examples: player, builder, senior, admin, guilds/fighter');
    return;
  }

  const playerName = parts[1].toLowerCase();
  const path = parts[2].toLowerCase();

  const exists = await efuns.playerExists(playerName);
  const online = efuns.findConnectedPlayer(playerName);

  if (!exists && !online) {
    ctx.sendLine(`{red}Player "${parts[1]}" not found.{/}`);
    return;
  }

  let result: { success: boolean; error?: string };
  if (action === 'add') {
    result = efuns.addCommandPath(playerName, path);
  } else {
    result = efuns.removeCommandPath(playerName, path);
  }

  if (!result.success) {
    ctx.sendLine(`{red}Failed: ${result.error}{/}`);
    return;
  }

  const saveResult = await efuns.savePermissions();
  if (!saveResult.success) {
    ctx.sendLine(`{yellow}Warning: Failed to save permissions: ${saveResult.error}{/}`);
  }

  if (action === 'add') {
    ctx.sendLine(`{green}Added command path "/cmds/${path}/" to ${efuns.capitalize(playerName)}.{/}`);
  } else {
    ctx.sendLine(`{green}Removed command path "/cmds/${path}/" from ${efuns.capitalize(playerName)}.{/}`);
  }
}

export default { name, description, usage, execute };
