/**
 * i2who - Query the online player list of another MUD via Intermud 2.
 *
 * Usage:
 *   i2who <mud>
 *
 * Examples:
 *   i2who SomeMUD
 */

import type { MudObject } from '../../lib/std.js';
import { getIntermud2Daemon } from '../../daemons/intermud2.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['i2who'];
export const description = 'Query the online player list of another MUD via Intermud 2';
export const usage = 'i2who <mud>';

export async function execute(ctx: CommandContext): Promise<void> {
  const targetMud = ctx.args.trim();

  if (!targetMud) {
    ctx.sendLine('{yellow}Usage: i2who <mud>{/}');
    ctx.sendLine('{dim}Example: i2who SomeMUD{/}');
    ctx.sendLine('{dim}Use "i2muds" to see available MUDs.{/}');
    return;
  }

  // Check if I2 is ready
  const intermud2 = getIntermud2Daemon();
  if (!intermud2.isReady) {
    ctx.sendLine('{red}Intermud 2 is not currently connected.{/}');
    return;
  }

  // Check if MUD exists in our mudlist
  const mudInfo = intermud2.getMudInfo(targetMud);
  if (!mudInfo) {
    // Try partial match
    const allMuds = intermud2.getMudList();
    const pattern = targetMud.toLowerCase();
    const matches = allMuds.filter((m) => m.name.toLowerCase().includes(pattern));

    if (matches.length === 0) {
      ctx.sendLine(`{yellow}Unknown MUD: ${targetMud}{/}`);
      ctx.sendLine('{dim}Use "i2muds" to see available MUDs.{/}');
      return;
    }
    if (matches.length > 1) {
      ctx.sendLine(`{yellow}Multiple MUDs match "${targetMud}":{/}`);
      for (const m of matches.slice(0, 10)) {
        ctx.sendLine(`  ${m.name}`);
      }
      return;
    }
    // Use the single match
    const matchedMud = matches[0]!;
    return queryMud(ctx, matchedMud.name);
  }

  return queryMud(ctx, mudInfo.name);
}

function queryMud(ctx: CommandContext, mudName: string): void {
  const intermud2 = getIntermud2Daemon();

  // Send the who request
  if (intermud2.requestWho(mudName, ctx.player.name)) {
    ctx.sendLine(`{dim}Requesting player list from ${mudName}...{/}`);
  } else {
    ctx.sendLine('{red}Failed to send who request. Please try again.{/}');
  }
}
