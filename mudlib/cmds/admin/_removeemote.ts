/**
 * removeemote - Remove an emote or a specific rule from an emote.
 *
 * Usage:
 *   removeemote <verb>           - Remove the entire emote
 *   removeemote <verb> <rule>    - Remove just one rule from the emote
 *
 * Rule types:
 *   "none" or ""   - No target rule
 *   "liv"          - Living target rule
 *   "str"          - String argument rule
 *
 * Examples:
 *   removeemote giggle           - Remove the entire "giggle" emote
 *   removeemote smile str        - Remove just the STR rule from "smile"
 *
 * Requires administrator permission.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface EmoteDefinition {
  [rule: string]: string;
}

interface SoulDaemon {
  hasEmote(verb: string): boolean;
  getEmote(verb: string): EmoteDefinition | undefined;
  setEmote(verb: string, rules: EmoteDefinition): void;
  removeEmote(verb: string): boolean;
  save(): Promise<void>;
}

export const name = ['removeemote', 'delemote', 'deleteemote'];
export const description = 'Remove an emote or a specific rule (admin only)';
export const usage = 'removeemote <verb> [rule]';

/**
 * Parse rule type from user input.
 */
function parseRuleType(input: string): string | null {
  const lower = input.toLowerCase();
  switch (lower) {
    case '':
    case 'none':
    case 'notarget':
    case '""':
      return '';
    case 'liv':
    case 'living':
    case 'target':
      return 'LIV';
    case 'str':
    case 'string':
    case 'text':
      return 'STR';
    case 'liv liv':
    case 'livliv':
    case 'two':
      return 'LIV LIV';
    case 'liv str':
    case 'livstr':
      return 'LIV STR';
    default:
      return null;
  }
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: removeemote <verb> [rule]{/}');
    ctx.sendLine('');
    ctx.sendLine('{dim}Examples:{/}');
    ctx.sendLine('  removeemote giggle       - Remove entire emote');
    ctx.sendLine('  removeemote smile str    - Remove just the STR rule');
    return;
  }

  const parts = args.split(' ');
  const verb = parts[0]!.toLowerCase();
  const ruleInput = parts[1] || null;

  // Find the soul daemon
  const soulDaemon = (typeof efuns !== 'undefined' ? efuns.findObject('/daemons/soul') : null) as SoulDaemon | null;

  if (!soulDaemon) {
    ctx.sendLine('{red}Error: Soul daemon not available.{/}');
    return;
  }

  // Check if emote exists
  if (!soulDaemon.hasEmote(verb)) {
    ctx.sendLine(`{red}Error: Emote "{bold}${verb}{/}{red}" does not exist.{/}`);
    return;
  }

  if (ruleInput === null) {
    // Remove entire emote
    soulDaemon.removeEmote(verb);

    try {
      await soulDaemon.save();
    } catch (error) {
      ctx.sendLine('{yellow}Warning: Failed to save emotes to disk.{/}');
    }

    ctx.sendLine(`{green}Removed emote "{bold}${verb}{/}{green}".{/}`);
  } else {
    // Remove specific rule
    const rule = parseRuleType(ruleInput);
    if (rule === null) {
      ctx.sendLine(`{red}Error: Unknown rule type "{bold}${ruleInput}{/}{red}".{/}`);
      ctx.sendLine('{dim}Valid types: none, liv, str{/}');
      return;
    }

    const emote = soulDaemon.getEmote(verb);
    if (!emote) {
      ctx.sendLine(`{red}Error: Could not retrieve emote "{bold}${verb}{/}{red}".{/}`);
      return;
    }

    const ruleDisplay = rule || '(no target)';

    if (!(rule in emote)) {
      ctx.sendLine(`{red}Error: Emote "{bold}${verb}{/}{red}" has no rule {bold}${ruleDisplay}{/}{red}.{/}`);
      return;
    }

    // Remove the rule
    delete emote[rule];

    // Check if emote has any rules left
    const remainingRules = Object.keys(emote).length;
    if (remainingRules === 0) {
      // No rules left, remove the entire emote
      soulDaemon.removeEmote(verb);
      ctx.sendLine(`{green}Removed rule {bold}${ruleDisplay}{/}{green} from "{bold}${verb}{/}{green}".{/}`);
      ctx.sendLine(`{yellow}Emote "{bold}${verb}{/}{yellow}" had no remaining rules and was removed.{/}`);
    } else {
      // Update emote with remaining rules
      soulDaemon.setEmote(verb, emote);
      ctx.sendLine(`{green}Removed rule {bold}${ruleDisplay}{/}{green} from "{bold}${verb}{/}{green}".{/}`);
      ctx.sendLine(`{dim}${remainingRules} rule(s) remaining.{/}`);
    }

    try {
      await soulDaemon.save();
    } catch (error) {
      ctx.sendLine('{yellow}Warning: Failed to save emotes to disk.{/}');
    }
  }
}

export default { name, description, usage, execute };
