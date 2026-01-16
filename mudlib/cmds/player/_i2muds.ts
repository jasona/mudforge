/**
 * i2muds - List MUDs on the Intermud 2 network.
 *
 * Usage:
 *   i2muds              - List all known MUDs
 *   i2muds <pattern>    - Search for MUDs by name
 *   i2muds -o           - List only online (recently seen) MUDs
 *   i2muds -seed        - Seed I2 mudlist from I3 network
 *
 * Examples:
 *   i2muds
 *   i2muds deep
 *   i2muds -o
 *   i2muds -seed
 */

import type { MudObject } from '../../lib/std.js';
import { getIntermud2Daemon, type I2MudInfo } from '../../daemons/intermud2.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['i2muds'];
export const description = 'List MUDs on the Intermud 2 network';
export const usage = 'i2muds [pattern | -o | -seed]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  // Handle seed command first (doesn't require I2 to be ready)
  if (args === '-seed' || args === '--seed') {
    // Check if I3 is connected
    if (!efuns.i3IsConnected()) {
      ctx.sendLine('{red}Intermud 3 is not connected. Cannot seed from I3.{/}');
      return;
    }

    const added = efuns.i2SeedFromI3();
    if (added > 0) {
      ctx.sendLine(`{green}Seeded ${added} MUDs from Intermud 3 network.{/}`);
    } else {
      ctx.sendLine('{yellow}No new MUDs to seed (I3 mudlist may be empty or all MUDs already known).{/}');
    }
    return;
  }

  // Check if I2 is ready
  const intermud2 = getIntermud2Daemon();
  if (!intermud2.isReady) {
    ctx.sendLine('{red}Intermud 2 is not currently connected.{/}');
    return;
  }

  let muds: I2MudInfo[];
  let onlineOnly = false;

  if (args === '-o' || args === '--online') {
    // Show only online MUDs
    muds = intermud2.getOnlineMuds();
    onlineOnly = true;
  } else if (args) {
    // Search by pattern
    const allMuds = intermud2.getMudList();
    const pattern = args.toLowerCase();
    muds = allMuds.filter((m) => m.name.toLowerCase().includes(pattern));
  } else {
    // All known MUDs
    muds = intermud2.getMudList();
  }

  if (muds.length === 0) {
    if (args && args !== '-o' && args !== '--online') {
      ctx.sendLine(`{yellow}No MUDs matching "${args}" found.{/}`);
    } else {
      ctx.sendLine('{yellow}No MUDs available. Try "i2muds -seed" to seed from I3.{/}');
    }
    return;
  }

  // Sort by name
  muds.sort((a, b) => a.name.localeCompare(b.name));

  // Header
  ctx.sendLine('{bold}Intermud 2 MUDs{/}');
  ctx.sendLine('{dim}' + '-'.repeat(70) + '{/}');

  // Display MUDs
  let count = 0;
  const maxDisplay = 50;
  const now = Date.now();
  const recentThreshold = 60 * 60 * 1000; // 1 hour

  for (const mud of muds) {
    if (count >= maxDisplay) {
      ctx.sendLine(`{dim}... and ${muds.length - maxDisplay} more (use a search pattern to narrow results){/}`);
      break;
    }

    const isOnline = now - mud.lastSeen < recentThreshold;
    const status = isOnline ? '{green}ON {/}' : '{red}OFF{/}';
    const name = mud.name.padEnd(25);
    const host = `${mud.host}:${mud.udpPort}`.padEnd(25);

    if (!onlineOnly || isOnline) {
      ctx.sendLine(`[${status}] ${name} ${host}`);
      count++;
    }
  }

  ctx.sendLine('{dim}' + '-'.repeat(70) + '{/}');
  ctx.sendLine(`{dim}${count} MUDs shown.{/}`);
  ctx.sendLine('{dim}Use "i2who <mud>" to request who list.{/}');
}
