/**
 * Who command - Display all connected players with an artful presentation.
 *
 * Shows an ASCII art header, list of players with their display names
 * and level/title, and a footer with the total player count.
 */

import type { MudObject } from '../../lib/std.js';

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

// Box width (content between the borders)
const BOX_WIDTH = 88;

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
  // Get all connected players
  let players: MudObject[] = [];
  if (typeof efuns !== 'undefined' && efuns.allPlayers) {
    players = efuns.allPlayers();
  }

  const lines: string[] = [];
  const topBot = '═'.repeat(BOX_WIDTH);
  const divider = '─'.repeat(BOX_WIDTH);

  // Top border
  lines.push('');
  lines.push(`{cyan}╔${topBot}╗{/}`);

    // ASCII Art Header - MUDFORGE (72 chars wide, centered in 76 char box)
  lines.push('');
  lines.push('            {bold}{yellow}███╗   ███╗{/}{bold}{green}██╗   ██╗{/}{bold}{cyan}██████╗ {/}{bold}{magenta}███████╗{/}{bold}{red} ██████╗ {/}{bold}{yellow}██████╗ {/}{bold}{green} ██████╗ {/}{bold}{cyan}███████╗{/}  ');
  lines.push('            {bold}{yellow}████╗ ████║{/}{bold}{green}██║   ██║{/}{bold}{cyan}██╔══██╗{/}{bold}{magenta}██╔════╝{/}{bold}{red}██╔═══██╗{/}{bold}{yellow}██╔══██╗{/}{bold}{green}██╔════╝ {/}{bold}{cyan}██╔════╝{/}  ');
  lines.push('            {bold}{yellow}██╔████╔██║{/}{bold}{green}██║   ██║{/}{bold}{cyan}██║  ██║{/}{bold}{magenta}█████╗  {/}{bold}{red}██║   ██║{/}{bold}{yellow}██████╔╝{/}{bold}{green}██║  ███╗{/}{bold}{cyan}█████╗  {/}  ');
  lines.push('            {bold}{yellow}██║╚██╔╝██║{/}{bold}{green}██║   ██║{/}{bold}{cyan}██║  ██║{/}{bold}{magenta}██╔══╝  {/}{bold}{red}██║   ██║{/}{bold}{yellow}██╔══██╗{/}{bold}{green}██║   ██║{/}{bold}{cyan}██╔══╝  {/}  ');
  lines.push('            {bold}{yellow}██║ ╚═╝ ██║{/}{bold}{green}╚██████╔╝{/}{bold}{cyan}██████╔╝{/}{bold}{magenta}██║     {/}{bold}{red}╚██████╔╝{/}{bold}{yellow}██║  ██║{/}{bold}{green}╚██████╔╝{/}{bold}{cyan}███████╗{/}  ');
  lines.push('            {bold}{yellow}╚═╝     ╚═╝{/}{bold}{green} ╚═════╝ {/}{bold}{cyan}╚═════╝ {/}{bold}{magenta}╚═╝     {/}{bold}{red} ╚═════╝ {/}{bold}{yellow}╚═╝  ╚═╝{/}{bold}{green} ╚═════╝ {/}{bold}{cyan}╚══════╝{/}  ');
  lines.push('');
  lines.push(centerText('{dim}A Modern MUD Experience - Est. 2026{/}', BOX_WIDTH));

  // Divider
  lines.push(`{cyan}╠${topBot}╣{/}`);

  if (players.length === 0) {
    lines.push(boxLine(''));
    lines.push(boxLine(centerText('{dim}No players are currently online.{/}', BOX_WIDTH)));
    lines.push(boxLine(''));
  } else {

    // Sort players: admins first, then by level
    const sortedPlayers = [...players].sort((a, b) => {
      const aInfo = a as PlayerInfo;
      const bInfo = b as PlayerInfo;
      const aPermLevel = aInfo.permissionLevel ?? 0;
      const bPermLevel = bInfo.permissionLevel ?? 0;

      if (aPermLevel !== bPermLevel) {
        return bPermLevel - aPermLevel;
      }

      const aLevel = aInfo.level ?? 1;
      const bLevel = bInfo.level ?? 1;
      return bLevel - aLevel;
    });

    lines.push("");
    for (const obj of sortedPlayers) {
      const player = obj as PlayerInfo;
      const displayName = player.getDisplayName?.() ?? player.name;
      const rank = getPlayerRank(player);

      const paddedName = displayName;
      const paddedRank = efuns.sprintf("%-8s", rank);
      lines.push("   " + paddedRank + paddedName);
    }
    lines.push("");
    lines.push("");
  }

  // Footer divider
  lines.push(`{cyan}╠${topBot}╣{/}`);

  // Player count
  const countStr = players.length === 1
    ? '{bold}{green}1{/} player online'
    : `{bold}{green}${players.length}{/} players online`;
  lines.push(centerText(countStr, BOX_WIDTH));

  // Bottom border
  lines.push(`{cyan}╚${topBot}╝{/}`);
  lines.push('');

  // Send all lines
  ctx.send(lines.join('\n'));
}

export default { name, description, usage, execute };
