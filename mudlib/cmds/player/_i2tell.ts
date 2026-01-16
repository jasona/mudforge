/**
 * i2tell - Send a private message to a player on another MUD via Intermud 2.
 *
 * Usage:
 *   i2tell <player>@<mud> <message>
 *
 * Examples:
 *   i2tell bob@SomeMUD Hey there from MudForge!
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

export const name = ['i2tell'];
export const description = 'Send a private message to a player on another MUD via Intermud 2';
export const usage = 'i2tell <player>@<mud> <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: i2tell <player>@<mud> <message>{/}');
    ctx.sendLine('{dim}Example: i2tell bob@SomeMUD Hey there!{/}');
    return;
  }

  // Check if I2 is ready
  const intermud2 = getIntermud2Daemon();
  if (!intermud2.isReady) {
    ctx.sendLine('{red}Intermud 2 is not currently connected.{/}');
    return;
  }

  // Parse: <player>@<mud> <message>
  const spaceIndex = args.indexOf(' ');
  if (spaceIndex === -1) {
    ctx.sendLine('{yellow}What do you want to tell them?{/}');
    return;
  }

  const targetStr = args.substring(0, spaceIndex);
  const message = args.substring(spaceIndex + 1).trim();

  if (!message) {
    ctx.sendLine('{yellow}What do you want to tell them?{/}');
    return;
  }

  // Parse player@mud
  const atIndex = targetStr.indexOf('@');
  if (atIndex === -1) {
    ctx.sendLine('{yellow}Please specify target as <player>@<mud>{/}');
    ctx.sendLine('{dim}Example: i2tell bob@SomeMUD Hello!{/}');
    return;
  }

  const targetPlayer = targetStr.substring(0, atIndex).trim();
  const targetMud = targetStr.substring(atIndex + 1).trim();

  if (!targetPlayer || !targetMud) {
    ctx.sendLine('{yellow}Please specify both player and mud name.{/}');
    return;
  }

  // Check if MUD exists in our mudlist
  const mudInfo = intermud2.getMudInfo(targetMud);
  if (!mudInfo) {
    ctx.sendLine(`{yellow}Unknown MUD: ${targetMud}{/}`);
    ctx.sendLine('{dim}Use "i2muds" to see available MUDs.{/}');
    return;
  }

  // Send the tell
  if (intermud2.sendTell(mudInfo.name, targetPlayer, ctx.player.name, message)) {
    ctx.sendLine(`{magenta}You tell ${targetPlayer}@${mudInfo.name}: ${message}{/}`);
  } else {
    ctx.sendLine('{red}Failed to send tell. Please try again.{/}');
  }
}
