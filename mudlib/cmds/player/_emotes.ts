/**
 * emotes - Search and list available emotes.
 *
 * Usage:
 *   emotes              - List all emotes
 *   emotes <search>     - Search for emotes containing the word
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface SoulDaemon {
  getEmoteVerbs(): string[];
  getEmote(verb: string): Record<string, string> | undefined;
}

export const name = ['emotes', 'emotelist', 'souls'];
export const description = 'Search and list available emotes';
export const usage = 'emotes [search term]';

/**
 * Format a rule type for display.
 */
function formatRule(rule: string): string {
  switch (rule) {
    case '':
      return 'no target';
    case 'LIV':
      return 'living target';
    case 'STR':
      return 'string argument';
    case 'LIV LIV':
      return 'two targets';
    case 'LIV STR':
      return 'target + string';
    default:
      return rule || 'no target';
  }
}

export function execute(ctx: CommandContext): void {
  const search = ctx.args.trim().toLowerCase();

  // Find the soul daemon
  const soulDaemon = (typeof efuns !== 'undefined' ? efuns.findObject('/daemons/soul') : null) as SoulDaemon | null;

  if (!soulDaemon) {
    ctx.sendLine('{red}Error: Soul daemon not available.{/}');
    return;
  }

  const allVerbs = soulDaemon.getEmoteVerbs();

  // Filter by search term if provided
  const matchingVerbs = search
    ? allVerbs.filter((verb) => verb.includes(search))
    : allVerbs;

  if (matchingVerbs.length === 0) {
    if (search) {
      ctx.sendLine(`{yellow}No emotes found matching "{bold}${search}{/}{yellow}".{/}`);
    } else {
      ctx.sendLine('{yellow}No emotes available.{/}');
    }
    return;
  }

  // Header
  if (search) {
    ctx.sendLine(`{cyan}Emotes matching "{bold}${search}{/}{cyan}":{/}`);
  } else {
    ctx.sendLine(`{cyan}Available emotes ({bold}${matchingVerbs.length}{/}{cyan} total):{/}`);
  }
  ctx.sendLine('');

  // List emotes with their rules
  for (const verb of matchingVerbs) {
    const emote = soulDaemon.getEmote(verb);
    if (!emote) continue;

    const rules = Object.keys(emote).map(formatRule);
    const rulesStr = rules.join(', ');

    ctx.sendLine(`  {bold}{green}${verb.padEnd(15)}{/} {dim}[${rulesStr}]{/}`);
  }

  ctx.sendLine('');
  ctx.sendLine(`{dim}Use an emote by typing its name, e.g., "smile" or "smile <player>"{/}`);
}

export default { name, description, usage, execute };
