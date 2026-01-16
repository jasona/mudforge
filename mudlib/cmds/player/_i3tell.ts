/**
 * i3tell - Send a private message to a player on another MUD.
 *
 * Usage:
 *   i3tell <player>@<mud> <message>
 *
 * Examples:
 *   i3tell bob@DeepMUD Hey there from MudForge!
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

export const name = ['i3tell', 'itell'];
export const description = 'Send a private message to a player on another MUD';
export const usage = 'i3tell <player>@<mud> <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: i3tell <player>@<mud> <message>{/}');
    ctx.sendLine('{dim}Example: i3tell bob@DeepMUD Hey there!{/}');
    return;
  }

  // Check if I3 is connected
  const intermud = getIntermudDaemon();
  if (!intermud.isConnected) {
    ctx.sendLine('{red}Intermud 3 is not currently connected.{/}');
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
    ctx.sendLine('{dim}Example: i3tell bob@DeepMUD Hello!{/}');
    return;
  }

  const targetPlayer = targetStr.substring(0, atIndex).trim();
  const targetMud = targetStr.substring(atIndex + 1).trim();

  if (!targetPlayer || !targetMud) {
    ctx.sendLine('{yellow}Please specify both player and mud name.{/}');
    return;
  }

  // Check if MUD exists in our mudlist
  const mudInfo = intermud.getMudInfo(targetMud);
  if (!mudInfo) {
    ctx.sendLine(`{yellow}Unknown MUD: ${targetMud}{/}`);
    ctx.sendLine('{dim}Use "i3muds" to see available MUDs.{/}');
    return;
  }

  if (mudInfo.state < 0) {
    ctx.sendLine(`{yellow}${mudInfo.name} appears to be offline.{/}`);
    return;
  }

  // Check if MUD supports tell
  if (!mudInfo.services['tell']) {
    ctx.sendLine(`{yellow}${mudInfo.name} does not support tell messages.{/}`);
    return;
  }

  // Send the tell
  if (intermud.sendTell(mudInfo.name, targetPlayer, ctx.player.name, message)) {
    ctx.sendLine(`{cyan}You tell ${targetPlayer}@${mudInfo.name}: ${message}{/}`);
  } else {
    ctx.sendLine('{red}Failed to send tell. Please try again.{/}');
  }
}
