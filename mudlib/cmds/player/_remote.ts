/**
 * remote - Perform an emote targeting someone not in the room.
 *
 * Usage:
 *   remote <emote> <player>   - Emote at a player anywhere in the game
 *
 * Examples:
 *   remote smile bob          - Smile at Bob from afar
 *   remote wave alice         - Wave at Alice from afar
 *   remote hug test           - Hug Test from afar
 *
 * The target will see the emote prefixed with "From afar, "
 * Only works with emotes that have a living target rule.
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
  executeRemoteEmote(
    actor: MudObject,
    verb: string,
    targetName: string
  ): Promise<{ success: boolean; error?: string }>;
}

export const name = ['remote', 'rem', 'remoteemote'];
export const description = 'Perform an emote targeting someone not in the room';
export const usage = 'remote <emote> <player>';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: remote <emote> <player>{/}');
    ctx.sendLine('{dim}Example: remote smile bob{/}');
    return;
  }

  const parts = args.split(/\s+/);
  if (parts.length < 2) {
    ctx.sendLine('{yellow}Usage: remote <emote> <player>{/}');
    ctx.sendLine('{dim}You must specify both an emote and a target player.{/}');
    return;
  }

  const emote = parts[0]!.toLowerCase();
  const targetName = parts[1]!;

  // Find the soul daemon
  const soulDaemon = (typeof efuns !== 'undefined' ? efuns.findObject('/daemons/soul') : null) as SoulDaemon | null;

  if (!soulDaemon) {
    ctx.sendLine('{red}Error: Soul daemon not available.{/}');
    return;
  }

  // Check if emote exists
  if (!soulDaemon.hasEmote(emote)) {
    ctx.sendLine(`{red}Unknown emote: {bold}${emote}{/}`);
    ctx.sendLine('{dim}Use "emotes" to see available emotes.{/}');
    return;
  }

  // Execute the remote emote
  const result = await soulDaemon.executeRemoteEmote(ctx.player, emote, targetName);

  if (!result.success && result.error) {
    ctx.sendLine(`{yellow}${result.error}{/}`);
  }
}

export default { name, description, usage, execute };
