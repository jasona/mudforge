/**
 * i3who - Query the online player list of another MUD.
 *
 * Usage:
 *   i3who <mud>
 *
 * Examples:
 *   i3who DeepMUD
 */

import type { MudObject } from '../../lib/std.js';
import { getIntermudDaemon } from '../../daemons/intermud.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['i3who', 'iwho'];
export const description = 'Query the online player list of another MUD';
export const usage = 'i3who <mud>';

export async function execute(ctx: CommandContext): Promise<void> {
  const targetMud = ctx.args.trim();

  if (!targetMud) {
    ctx.sendLine('{yellow}Usage: i3who <mud>{/}');
    ctx.sendLine('{dim}Example: i3who DeepMUD{/}');
    ctx.sendLine('{dim}Use "i3muds" to see available MUDs.{/}');
    return;
  }

  // Check if I3 is connected
  const intermud = getIntermudDaemon();
  if (!intermud.isConnected) {
    ctx.sendLine('{red}Intermud 3 is not currently connected.{/}');
    return;
  }

  // Check if MUD exists in our mudlist
  const mudInfo = intermud.getMudInfo(targetMud);
  if (!mudInfo) {
    // Try partial match
    const matches = intermud.findMuds(targetMud);
    if (matches.length === 0) {
      ctx.sendLine(`{yellow}Unknown MUD: ${targetMud}{/}`);
      ctx.sendLine('{dim}Use "i3muds" to see available MUDs.{/}');
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
    return queryMud(ctx, intermud, matchedMud);
  }

  return queryMud(ctx, intermud, mudInfo);
}

function queryMud(
  ctx: CommandContext,
  intermud: ReturnType<typeof getIntermudDaemon>,
  mudInfo: { name: string; state: number; services: Record<string, number> }
): void {
  if (mudInfo.state < 0) {
    ctx.sendLine(`{yellow}${mudInfo.name} appears to be offline.{/}`);
    return;
  }

  // Check if MUD supports who
  if (!mudInfo.services['who']) {
    ctx.sendLine(`{yellow}${mudInfo.name} does not support who queries.{/}`);
    return;
  }

  // Send the who request
  if (intermud.requestWho(mudInfo.name, ctx.player.name)) {
    ctx.sendLine(`{dim}Requesting player list from ${mudInfo.name}...{/}`);
  } else {
    ctx.sendLine('{red}Failed to send who request. Please try again.{/}');
  }
}
