/**
 * emotecount - Display emote system statistics.
 *
 * Usage:
 *   emotecount   - Show overview of emotes in the system
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
  getEmoteVerbs(): string[];
  getEmote(verb: string): EmoteDefinition | undefined;
  emoteCount: number;
}

export const name = ['emotecount', 'emotestats'];
export const description = 'Display emote system statistics';
export const usage = 'emotecount';

export function execute(ctx: CommandContext): void {
  // Find the soul daemon
  const soulDaemon = (typeof efuns !== 'undefined' ? efuns.findObject('/daemons/soul') : null) as SoulDaemon | null;

  if (!soulDaemon) {
    ctx.sendLine('{red}Error: Soul daemon not available.{/}');
    return;
  }

  const verbs = soulDaemon.getEmoteVerbs();
  const totalEmotes = verbs.length;

  // Count rules by type
  let totalRules = 0;
  let noTargetCount = 0;
  let livCount = 0;
  let strCount = 0;
  let livLivCount = 0;
  let livStrCount = 0;
  let otherCount = 0;

  for (const verb of verbs) {
    const emote = soulDaemon.getEmote(verb);
    if (!emote) continue;

    for (const rule of Object.keys(emote)) {
      totalRules++;
      switch (rule) {
        case '':
          noTargetCount++;
          break;
        case 'LIV':
          livCount++;
          break;
        case 'STR':
          strCount++;
          break;
        case 'LIV LIV':
          livLivCount++;
          break;
        case 'LIV STR':
          livStrCount++;
          break;
        default:
          otherCount++;
      }
    }
  }

  // Display stats
  ctx.sendLine('{cyan}╔══════════════════════════════════════════╗{/}');
  ctx.sendLine('{cyan}║{/}        {bold}Emote System Statistics{/}        {cyan}║{/}');
  ctx.sendLine('{cyan}╠══════════════════════════════════════════╣{/}');
  ctx.sendLine(`{cyan}║{/}  Total Emotes:     {bold}{green}${totalEmotes.toLocaleString().padStart(6)}{/}            {cyan}║{/}`);
  ctx.sendLine(`{cyan}║{/}  Total Rules:      {bold}{green}${totalRules.toLocaleString().padStart(6)}{/}            {cyan}║{/}`);
  ctx.sendLine('{cyan}╟──────────────────────────────────────────╢{/}');
  ctx.sendLine('{cyan}║{/}  {dim}Rules by Type:{/}                         {cyan}║{/}');
  ctx.sendLine(`{cyan}║{/}    No target:      ${noTargetCount.toLocaleString().padStart(6)}  {dim}(solo emotes){/}  {cyan}║{/}`);
  ctx.sendLine(`{cyan}║{/}    LIV:            ${livCount.toLocaleString().padStart(6)}  {dim}(target player){/} {cyan}║{/}`);
  ctx.sendLine(`{cyan}║{/}    STR:            ${strCount.toLocaleString().padStart(6)}  {dim}(custom text){/}   {cyan}║{/}`);
  if (livLivCount > 0) {
    ctx.sendLine(`{cyan}║{/}    LIV LIV:        ${livLivCount.toLocaleString().padStart(6)}  {dim}(two targets){/}   {cyan}║{/}`);
  }
  if (livStrCount > 0) {
    ctx.sendLine(`{cyan}║{/}    LIV STR:        ${livStrCount.toLocaleString().padStart(6)}  {dim}(target+text){/}   {cyan}║{/}`);
  }
  if (otherCount > 0) {
    ctx.sendLine(`{cyan}║{/}    Other:          ${otherCount.toLocaleString().padStart(6)}                  {cyan}║{/}`);
  }
  ctx.sendLine('{cyan}╚══════════════════════════════════════════╝{/}');
  ctx.sendLine('{dim}Use "emotes <search>" to find specific emotes.{/}');
}

export default { name, description, usage, execute };
