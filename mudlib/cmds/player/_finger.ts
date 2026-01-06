/**
 * Finger command - View detailed information about a player.
 *
 * Shows player details including display name, level, role, account age,
 * and last login time. For builders and above, also displays the user's
 * plan file if one exists.
 *
 * Usage:
 *   finger <player>    - View information about a player
 */

import type { MudObject } from '../../lib/std.js';
import type { PlayerSaveData } from '../../std/player.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerInfo extends MudObject {
  name: string;
  level?: number;
  permissionLevel?: number;
  title?: string;
  createdAt?: number;
  lastLogin?: number;
  playTime?: number;
  displayName?: string | null;
  getDisplayName?(): string;
  isConnected?(): boolean;
}

export const name = ['finger'];
export const description = 'View detailed information about a player';
export const usage = 'finger <player>';

/**
 * Get the role name from permission level.
 */
function getRoleName(permissionLevel: number): string {
  switch (permissionLevel) {
    case 3:
      return '{red}{bold}Administrator{/}';
    case 2:
      return '{yellow}{bold}Senior Builder{/}';
    case 1:
      return '{magenta}{bold}Builder{/}';
    default:
      return '{white}Player{/}';
  }
}

/**
 * Pad a string to a certain visible length.
 */
function padLabel(label: string, width: number): string {
  const padding = Math.max(0, width - label.length);
  return label + ' '.repeat(padding);
}

export async function execute(ctx: CommandContext): Promise<void> {
  const targetName = ctx.args.trim();

  if (!targetName) {
    ctx.sendLine('Usage: finger <player>');
    ctx.sendLine('');
    ctx.sendLine('View detailed information about a player.');
    return;
  }

  // Normalize the name (capitalize first letter)
  const normalizedName = targetName.charAt(0).toUpperCase() + targetName.slice(1).toLowerCase();

  // First, check if the player is currently online (active in game world)
  let onlinePlayer: PlayerInfo | null = null;
  let isOnline = false;

  if (typeof efuns !== 'undefined' && efuns.findActivePlayer) {
    onlinePlayer = efuns.findActivePlayer(normalizedName) as PlayerInfo | null;
    if (onlinePlayer) {
      isOnline = true;
    }
  }

  // If not found, check all connected players as fallback
  if (!onlinePlayer && typeof efuns !== 'undefined' && efuns.allPlayers) {
    const players = efuns.allPlayers();
    for (const p of players) {
      const playerInfo = p as PlayerInfo;
      if (playerInfo.name?.toLowerCase() === normalizedName.toLowerCase()) {
        onlinePlayer = playerInfo;
        isOnline = true;
        break;
      }
    }
  }

  // If player is online, use their live data
  if (onlinePlayer) {
    await displayPlayerInfo(ctx, onlinePlayer, isOnline);
    return;
  }

  // Player is not online - try to load saved data
  if (typeof efuns !== 'undefined' && efuns.playerExists && efuns.loadPlayerData) {
    const exists = await efuns.playerExists(normalizedName);
    if (!exists) {
      ctx.sendLine(`{yellow}No player named '${normalizedName}' has ever existed.{/}`);
      return;
    }

    const savedData = await efuns.loadPlayerData(normalizedName);
    if (!savedData) {
      ctx.sendLine(`{yellow}Unable to load data for '${normalizedName}'.{/}`);
      return;
    }

    // Create a temporary player info object from saved data
    const playerInfo: PlayerInfo = {
      name: savedData.name,
      level: savedData.level ?? 1,
      permissionLevel: (savedData.properties?.permissionLevel as number) ?? 0,
      createdAt: savedData.createdAt,
      lastLogin: savedData.lastLogin,
      playTime: savedData.playTime,
      displayName: savedData.displayName ?? null,
      objectPath: '',
      objectId: '',
      shortDesc: savedData.name,
      longDesc: '',
      inventory: [],
      environment: null,
    } as PlayerInfo;

    await displayPlayerInfo(ctx, playerInfo, false);
    return;
  }

  // Fallback if efuns not available
  ctx.sendLine(`{yellow}Unable to look up player '${normalizedName}'.{/}`);
}

/**
 * Display player information.
 */
async function displayPlayerInfo(
  ctx: CommandContext,
  player: PlayerInfo,
  isOnline: boolean
): Promise<void> {
  const now = typeof efuns !== 'undefined' ? efuns.time() : Math.floor(Date.now() / 1000);
  const labelWidth = 14;

  // Header
  ctx.sendLine('');
  ctx.sendLine(`{cyan}╔══════════════════════════════════════════════════════════════╗{/}`);
  ctx.sendLine(`{cyan}║{/}                        {bold}Player Info{/}                         {cyan}║{/}`);
  ctx.sendLine(`{cyan}╠══════════════════════════════════════════════════════════════╣{/}`);

  // Name
  ctx.sendLine(`{cyan}║{/}  ${padLabel('Name:', labelWidth)}{bold}${player.name}{/}`);

  // Display Name (if different from name)
  const displayName = player.getDisplayName?.() ?? player.displayName?.replace(/\$N/gi, player.name) ?? player.name;
  if (displayName !== player.name) {
    ctx.sendLine(`{cyan}║{/}  ${padLabel('Display Name:', labelWidth)}${displayName}`);
  }

  // Level
  const level = player.level ?? 1;
  ctx.sendLine(`{cyan}║{/}  ${padLabel('Level:', labelWidth)}{green}${level}{/}`);

  // Role
  const permLevel = player.permissionLevel ?? 0;
  const role = getRoleName(permLevel);
  ctx.sendLine(`{cyan}║{/}  ${padLabel('Role:', labelWidth)}${role}`);

  // Divider
  ctx.sendLine(`{cyan}╠══════════════════════════════════════════════════════════════╣{/}`);

  // Account Age
  if (player.createdAt && player.createdAt > 0) {
    const accountAge = now - efuns.toSeconds(player.createdAt);
    ctx.sendLine(`{cyan}║{/}  ${padLabel('Account Age:', labelWidth)}{dim}${efuns.formatDuration(accountAge)}{/}`);
    ctx.sendLine(`{cyan}║{/}  ${padLabel('Created:', labelWidth)}{dim}${efuns.formatDate(player.createdAt)}{/}`);
  }

  // Online Status / Last Login
  if (isOnline) {
    const isConnected = player.isConnected?.() ?? true;
    if (isConnected) {
      ctx.sendLine(`{cyan}║{/}  ${padLabel('Status:', labelWidth)}{green}{bold}Online{/}`);
      if (player.lastLogin && player.lastLogin > 0) {
        const sessionDuration = now - efuns.toSeconds(player.lastLogin);
        ctx.sendLine(`{cyan}║{/}  ${padLabel('Logged In:', labelWidth)}{dim}${efuns.formatDuration(sessionDuration)} ago{/}`);
      }
    } else {
      ctx.sendLine(`{cyan}║{/}  ${padLabel('Status:', labelWidth)}{yellow}Linkdead{/}`);
    }
  } else {
    ctx.sendLine(`{cyan}║{/}  ${padLabel('Status:', labelWidth)}{dim}Offline{/}`);
    if (player.lastLogin && player.lastLogin > 0) {
      ctx.sendLine(`{cyan}║{/}  ${padLabel('Last Login:', labelWidth)}{dim}${efuns.formatDate(player.lastLogin)}{/}`);
      const timeSince = now - efuns.toSeconds(player.lastLogin);
      ctx.sendLine(`{cyan}║{/}  ${padLabel('', labelWidth)}{dim}(${efuns.formatDuration(timeSince)} ago){/}`);
    }
  }

  // Total Play Time
  if (player.playTime && player.playTime > 0) {
    ctx.sendLine(`{cyan}║{/}  ${padLabel('Play Time:', labelWidth)}{dim}${efuns.formatDuration(player.playTime)}{/}`);
  }

  // Footer
  ctx.sendLine(`{cyan}╚══════════════════════════════════════════════════════════════╝{/}`);

  // Check for plan file if player is a builder or higher
  const targetPermLevel = player.permissionLevel ?? 0;
  if (targetPermLevel >= 1) {
    await displayPlanFile(ctx, player.name);
  }

  ctx.sendLine('');
}

/**
 * Display the user's plan file if it exists.
 */
async function displayPlanFile(ctx: CommandContext, playerName: string): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.fileExists || !efuns.readFile) {
    return;
  }

  const planPath = `/users/${playerName.toLowerCase()}/user.plan`;

  try {
    const exists = await efuns.fileExists(planPath);
    if (!exists) {
      return;
    }

    const planContent = await efuns.readFile(planPath);
    if (!planContent || planContent.trim().length === 0) {
      return;
    }

    ctx.sendLine('');
    ctx.sendLine(`{cyan}╔══════════════════════════════════════════════════════════════╗{/}`);
    ctx.sendLine(`{cyan}║{/}                          {bold}Plan{/}                              {cyan}║{/}`);
    ctx.sendLine(`{cyan}╠══════════════════════════════════════════════════════════════╣{/}`);

    // Display plan content (limit to reasonable length)
    const lines = planContent.trim().split('\n');
    const maxLines = 20;
    const displayLines = lines.slice(0, maxLines);

    for (const line of displayLines) {
      // Truncate long lines
      const truncated = line.length > 60 ? line.substring(0, 57) + '...' : line;
      ctx.sendLine(`{cyan}║{/}  ${truncated}`);
    }

    if (lines.length > maxLines) {
      ctx.sendLine(`{cyan}║{/}  {dim}... (${lines.length - maxLines} more lines){/}`);
    }

    ctx.sendLine(`{cyan}╚══════════════════════════════════════════════════════════════╝{/}`);
  } catch {
    // Silently ignore errors reading plan file
  }
}

export default { name, description, usage, execute };
