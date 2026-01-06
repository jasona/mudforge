/**
 * showemote - Display the full rule definitions for an emote.
 *
 * Usage:
 *   showemote <emote>   - Show all rules defined for the emote
 *
 * Requires builder permission (level 1) or higher.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface SoulDaemon {
  hasEmote(verb: string): boolean;
  getEmote(verb: string): Record<string, string> | undefined;
}

export const name = ['showemote', 'setemote'];
export const description = 'Display the full rule definitions for an emote (builder+)';
export const usage = 'showemote <emote>';

/**
 * Format a rule type for display.
 */
function formatRuleType(rule: string): string {
  switch (rule) {
    case '':
      return '(no target)';
    case 'LIV':
      return 'LIV (living target)';
    case 'STR':
      return 'STR (string argument)';
    case 'LIV LIV':
      return 'LIV LIV (two targets)';
    case 'LIV STR':
      return 'LIV STR (target + string)';
    default:
      return rule || '(no target)';
  }
}

export function execute(ctx: CommandContext): void {
  const emoteName = ctx.args.trim().toLowerCase();

  if (!emoteName) {
    ctx.sendLine('{yellow}Usage: showemote <emote>{/}');
    ctx.sendLine('{dim}Example: showemote smile{/}');
    return;
  }

  // Find the soul daemon
  const soulDaemon = (typeof efuns !== 'undefined' ? efuns.findObject('/daemons/soul') : null) as SoulDaemon | null;

  if (!soulDaemon) {
    ctx.sendLine('{red}Error: Soul daemon not available.{/}');
    return;
  }

  if (!soulDaemon.hasEmote(emoteName)) {
    ctx.sendLine(`{red}Unknown emote: {bold}${emoteName}{/}`);
    ctx.sendLine('{dim}Use "emotes" to see available emotes.{/}');
    return;
  }

  const emote = soulDaemon.getEmote(emoteName);
  if (!emote) {
    ctx.sendLine(`{red}Error retrieving emote: {bold}${emoteName}{/}`);
    return;
  }

  // Header
  ctx.sendLine('{cyan}╔══════════════════════════════════════════════════════════════╗{/}');
  ctx.sendLine(`{cyan}║{/} {bold}Emote: ${emoteName}{/}`);
  ctx.sendLine('{cyan}╠══════════════════════════════════════════════════════════════╣{/}');

  // Show each rule
  const rules = Object.entries(emote);
  if (rules.length === 0) {
    ctx.sendLine('{cyan}║{/} {dim}No rules defined{/}');
  } else {
    for (const [rule, template] of rules) {
      ctx.sendLine('{cyan}║{/}');
      ctx.sendLine(`{cyan}║{/} {yellow}${formatRuleType(rule)}{/}`);
      ctx.sendLine(`{cyan}║{/}   {green}${template}{/}`);
    }
  }

  ctx.sendLine('{cyan}║{/}');
  ctx.sendLine('{cyan}╠══════════════════════════════════════════════════════════════╣{/}');
  ctx.sendLine('{cyan}║{/} {dim}Tokens:{/}');
  ctx.sendLine('{cyan}║{/}   {dim}$N = actor name    $T = target name    $vverb = conjugated{/}');
  ctx.sendLine('{cyan}║{/}   {dim}$P = actor\'s poss  $Q = target\'s poss  $R = reflexive{/}');
  ctx.sendLine('{cyan}║{/}   {dim}$O = object/string (from STR rule){/}');
  ctx.sendLine('{cyan}╚══════════════════════════════════════════════════════════════╝{/}');
}

export default { name, description, usage, execute };
