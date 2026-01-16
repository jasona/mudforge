/**
 * i3muds - List MUDs on the Intermud 3 network.
 *
 * Usage:
 *   i3muds              - List all online MUDs
 *   i3muds <pattern>    - Search for MUDs by name
 *   i3muds -a           - List all MUDs including offline
 *
 * Examples:
 *   i3muds
 *   i3muds deep
 *   i3muds -a
 */

import type { MudObject } from '../../lib/std.js';
import { getIntermudDaemon, type I3MudInfo } from '../../daemons/intermud.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['i3muds', 'imuds', 'mudlist'];
export const description = 'List MUDs on the Intermud 3 network';
export const usage = 'i3muds [pattern | -a]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  // Check if I3 is connected
  const intermud = getIntermudDaemon();
  if (!intermud.isConnected) {
    ctx.sendLine('{red}Intermud 3 is not currently connected.{/}');
    return;
  }

  let muds: I3MudInfo[];
  let showOffline = false;

  if (args === '-a' || args === '--all') {
    // Show all MUDs including offline
    muds = intermud.getMudList();
    showOffline = true;
  } else if (args) {
    // Search by pattern
    muds = intermud.findMuds(args);
  } else {
    // Only online MUDs
    muds = intermud.getOnlineMuds();
  }

  if (muds.length === 0) {
    if (args && args !== '-a' && args !== '--all') {
      ctx.sendLine(`{yellow}No MUDs matching "${args}" found.{/}`);
    } else {
      ctx.sendLine('{yellow}No MUDs available.{/}');
    }
    return;
  }

  // Sort by name
  muds.sort((a, b) => a.name.localeCompare(b.name));

  // Header
  ctx.sendLine('{bold}Intermud 3 MUDs{/}');
  ctx.sendLine('{dim}' + '-'.repeat(70) + '{/}');

  // Display MUDs
  let count = 0;
  const maxDisplay = 50;

  for (const mud of muds) {
    if (count >= maxDisplay) {
      ctx.sendLine(`{dim}... and ${muds.length - maxDisplay} more (use a search pattern to narrow results){/}`);
      break;
    }

    const status = mud.state >= 0 ? '{green}UP  {/}' : '{red}DOWN{/}';
    const name = mud.name.padEnd(25);
    const type = (mud.mudType || 'Unknown').padEnd(10);
    const driver = (mud.driver || 'Unknown').substring(0, 15).padEnd(15);

    if (showOffline || mud.state >= 0) {
      ctx.sendLine(`[${status}] ${name} ${type} ${driver}`);
      count++;
    }
  }

  ctx.sendLine('{dim}' + '-'.repeat(70) + '{/}');
  ctx.sendLine(`{dim}${count} MUDs shown. Router: ${intermud.routerName}{/}`);
  ctx.sendLine('{dim}Use "i3who <mud>" to see who is online.{/}');
}
