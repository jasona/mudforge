/**
 * addemote - Add or update an emote rule.
 *
 * Usage:
 *   addemote <verb> <rule> <template>
 *
 * Rule types:
 *   ""      or "none"  - No target (e.g., "smile")
 *   "LIV"   or "liv"   - Living target (e.g., "smile bob")
 *   "STR"   or "str"   - String argument (e.g., "smile broadly")
 *
 * Examples:
 *   addemote giggle none $N $vgiggle.
 *   addemote giggle liv $N $vgiggle at $T.
 *   addemote ponder str $N $vponder $o.
 *
 * If the emote already exists, the rule will be added/updated.
 * If the emote doesn't exist, a new emote will be created.
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
  save(): Promise<void>;
}

export const name = ['addemote', 'setemote'];
export const description = 'Add or update an emote rule (admin only)';
export const usage = 'addemote <verb> <rule> <template>';

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
    ctx.sendLine('{yellow}Usage: addemote <verb> <rule> <template>{/}');
    ctx.sendLine('');
    ctx.sendLine('{dim}Rule types:{/}');
    ctx.sendLine('  {cyan}none{/}  - No target (e.g., "smile")');
    ctx.sendLine('  {cyan}liv{/}   - Living target (e.g., "smile bob")');
    ctx.sendLine('  {cyan}str{/}   - String argument (e.g., "smile broadly")');
    ctx.sendLine('');
    ctx.sendLine('{dim}Example:{/}');
    ctx.sendLine('  addemote giggle none $N $vgiggle.');
    ctx.sendLine('  addemote giggle liv $N $vgiggle at $T.');
    return;
  }

  // Parse: verb rule template
  const parts = args.split(' ');
  if (parts.length < 3) {
    ctx.sendLine('{red}Error: Not enough arguments.{/}');
    ctx.sendLine('{dim}Usage: addemote <verb> <rule> <template>{/}');
    return;
  }

  const verb = parts[0]!.toLowerCase();
  const ruleInput = parts[1]!;
  const template = parts.slice(2).join(' ');

  // Validate verb
  if (!/^[a-z]+$/.test(verb)) {
    ctx.sendLine('{red}Error: Emote verb must contain only letters.{/}');
    return;
  }

  // Parse rule type
  const rule = parseRuleType(ruleInput);
  if (rule === null) {
    ctx.sendLine(`{red}Error: Unknown rule type "{bold}${ruleInput}{/}{red}".{/}`);
    ctx.sendLine('{dim}Valid types: none, liv, str{/}');
    return;
  }

  // Validate template has required tokens
  if (!template.includes('$N') && !template.includes('$n')) {
    ctx.sendLine('{yellow}Warning: Template should include $N (actor name).{/}');
  }
  if (!template.includes('$v') && !template.includes('$V')) {
    ctx.sendLine('{yellow}Warning: Template should include $v (verb conjugation).{/}');
  }
  if (rule === 'LIV' && !template.includes('$T') && !template.includes('$t')) {
    ctx.sendLine('{yellow}Warning: LIV rule should include $T (target name).{/}');
  }
  if (rule === 'STR' && !template.includes('$O') && !template.includes('$o')) {
    ctx.sendLine('{yellow}Warning: STR rule should include $o (string argument).{/}');
  }

  // Find the soul daemon
  const soulDaemon = (typeof efuns !== 'undefined' ? efuns.findObject('/daemons/soul') : null) as SoulDaemon | null;

  if (!soulDaemon) {
    ctx.sendLine('{red}Error: Soul daemon not available.{/}');
    return;
  }

  // Get existing emote or create new
  const isNew = !soulDaemon.hasEmote(verb);
  const existingEmote = soulDaemon.getEmote(verb) || {};
  const hadRule = rule in existingEmote;

  // Update the emote
  existingEmote[rule] = template;
  soulDaemon.setEmote(verb, existingEmote);

  // Save to disk
  try {
    await soulDaemon.save();
  } catch (error) {
    ctx.sendLine('{yellow}Warning: Failed to save emotes to disk.{/}');
  }

  // Report success
  const ruleDisplay = rule || '(no target)';
  if (isNew) {
    ctx.sendLine(`{green}Created new emote "{bold}${verb}{/}{green}" with rule {bold}${ruleDisplay}{/}{green}.{/}`);
  } else if (hadRule) {
    ctx.sendLine(`{green}Updated rule {bold}${ruleDisplay}{/}{green} for emote "{bold}${verb}{/}{green}".{/}`);
  } else {
    ctx.sendLine(`{green}Added rule {bold}${ruleDisplay}{/}{green} to emote "{bold}${verb}{/}{green}".{/}`);
  }

  ctx.sendLine(`{dim}Template: ${template}{/}`);
}

export default { name, description, usage, execute };
