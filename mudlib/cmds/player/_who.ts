/**
 * Who command - Display all connected players with an artful presentation.
 *
 * Shows an ASCII art header, list of players with their display names
 * and level/title, and a footer with the total player count.
 */

import type { MudObject } from '../../lib/std.js';
import { canSee } from '../../std/visibility/index.js';
import type { Living } from '../../std/living.js';

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
  getDisplayName?(): string;
}

interface VisiblePlayer {
  player: PlayerInfo;
  isPartiallyVisible: boolean;
}

// Box width (content between the borders)
// Must be <= 78 to fit within default 80-char screenWidth with borders
const BOX_WIDTH = 78;

/**
 * Get the title/rank display for a player.
 */
function getPlayerRank(player: PlayerInfo): string {
  const permLevel = player.permissionLevel ?? 0;

  if (permLevel >= 3) {
    return '{red}{bold}[ADMIN]{/}';
  } else if (permLevel >= 2) {
    return '{yellow}{bold}[SENIOR]{/}';
  } else if (permLevel >= 1) {
    return '{magenta}{bold}[BUILD]{/}';
  } else {
    // Regular player - show level
    const level = player.level ?? 1;
    // Color based on level ranges
    let color = 'white';
    if (level >= 50) color = 'red';
    else if (level >= 40) color = 'yellow';
    else if (level >= 30) color = 'magenta';
    else if (level >= 20) color = 'cyan';
    else if (level >= 10) color = 'green';

    return `{${color}}[${level}]{/}`;
  }
}

/**
 * Calculate visible length of a string (ignoring color codes).
 */
function visibleLength(str: string): number {
  return str.replace(/\{[^}]+\}/g, '').length;
}

/**
 * Pad a string to a certain visible length (ignoring color codes).
 */
function padRight(str: string, length: number): string {
  const visible = visibleLength(str);
  const padding = Math.max(0, length - visible);
  return str + ' '.repeat(padding);
}

/**
 * Center a string within a given visible width.
 */
function centerText(str: string, width: number): string {
  const visible = visibleLength(str);
  const totalPad = Math.max(0, width - visible);
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

/**
 * Create a box line with content.
 */
function boxLine(content: string): string {
  const padded = padRight(content, BOX_WIDTH);
  return `{cyan}║{/}${padded}{cyan}║{/}`;
}

export const name = ['who', 'players'];
export const description = 'Show all connected players';
export const usage = 'who';

export async function execute(ctx: CommandContext): Promise<void> {
  // Get game configuration
  const game = efuns.gameConfig();

  // Get all connected players and filter by visibility
  let allPlayers: MudObject[] = [];
  if (typeof efuns !== 'undefined' && efuns.allPlayers) {
    allPlayers = efuns.allPlayers();
  }

  // Filter players by visibility
  const viewerLiving = ctx.player as Living;
  const visiblePlayers: VisiblePlayer[] = [];

  for (const obj of allPlayers) {
    const playerLiving = obj as Living;
    const visResult = canSee(viewerLiving, playerLiving);

    if (visResult.canSee) {
      visiblePlayers.push({
        player: obj as PlayerInfo,
        isPartiallyVisible: visResult.isPartiallyVisible,
      });
    }
  }

  const lines: string[] = [];
  const topBot = '═'.repeat(BOX_WIDTH);
  const divider = '─'.repeat(BOX_WIDTH);

  // Top border
  lines.push('');
  lines.push(`{cyan}╔${topBot}╗{/}`);

  // Dynamic game name header
  lines.push('');
  lines.push(centerText(`{bold}{yellow}=== ${game.name.toUpperCase()} ==={/}`, BOX_WIDTH));
  lines.push('');
  lines.push(centerText(`{dim}${game.tagline} - Est. ${game.establishedYear}{/}`, BOX_WIDTH));

  // Divider
  lines.push(`{cyan}╠${topBot}╣{/}`);

  if (visiblePlayers.length === 0) {
    lines.push(boxLine(''));
    lines.push(boxLine(centerText('{dim}No players are currently online.{/}', BOX_WIDTH)));
    lines.push(boxLine(''));
  } else {

    // Sort players: admins first, then by level
    const sortedPlayers = [...visiblePlayers].sort((a, b) => {
      const aPermLevel = a.player.permissionLevel ?? 0;
      const bPermLevel = b.player.permissionLevel ?? 0;

      if (aPermLevel !== bPermLevel) {
        return bPermLevel - aPermLevel;
      }

      const aLevel = a.player.level ?? 1;
      const bLevel = b.player.level ?? 1;
      return bLevel - aLevel;
    });

    lines.push("");
    for (const { player, isPartiallyVisible } of sortedPlayers) {
      let displayName = player.getDisplayName?.() ?? player.name;

      // Add [i] indicator for partially visible (detected invisible) players
      if (isPartiallyVisible) {
        displayName = `{bold}{green}[i]{/} ${displayName}`;
      }

      const rank = getPlayerRank(player);
      const paddedRank = efuns.sprintf("%-8s", rank);
      lines.push("   " + paddedRank + displayName);
    }
    lines.push("");
    lines.push("");
  }

  // Footer divider
  lines.push(`{cyan}╠${topBot}╣{/}`);

  // Player count
  const countStr = visiblePlayers.length === 1
    ? '{bold}{green}1{/} player online'
    : `{bold}{green}${visiblePlayers.length}{/} players online`;
  lines.push(centerText(countStr, BOX_WIDTH));

  // Bottom border
  lines.push(`{cyan}╚${topBot}╝{/}`);
  lines.push('');

  // Send all lines
  ctx.send(lines.join('\n'));
}

export default { name, description, usage, execute };
