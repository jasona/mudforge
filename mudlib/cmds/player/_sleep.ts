/**
 * Sleep command - Lie down to sleep.
 *
 * Sleeping increases HP and MP regeneration by 2.5x.
 * Cannot sleep while in combat.
 * Aliases: rest
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['sleep', 'rest'];
export const description = 'Lie down to sleep and recover much faster';
export const usage = 'sleep';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const living = player as Living;

  // Check current posture
  const currentPosture = living.posture;

  if (currentPosture === 'sleeping') {
    ctx.sendLine('You are already sleeping.');
    return;
  }

  // Must sit first if standing
  if (currentPosture === 'standing') {
    // Auto-transition through sitting
    const sitResult = living.setPosture('sitting');
    if (!sitResult.success) {
      ctx.sendLine(sitResult.reason || "You can't lie down right now.");
      return;
    }
  }

  // Now try to sleep
  const result = living.setPosture('sleeping');

  if (!result.success) {
    ctx.sendLine(result.reason || "You can't sleep right now.");
    return;
  }

  // Success message
  ctx.sendLine('You lie down and close your eyes.');

  // Notify room (sleeping players filtered automatically)
  const room = player.environment;
  if (room && 'broadcast' in room) {
    const name = typeof efuns !== 'undefined' ? efuns.capitalize(living.name) : living.name;
    (room as { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
      .broadcast(`${name} lies down to sleep.\n`, { exclude: [player] });
  }

  // Check for campfire warmth
  if (living.isNearCampfire()) {
    ctx.sendLine('{yellow}The warmth of the nearby campfire envelops you in comfort.{/}');
  }

  ctx.sendLine('{dim}Your regeneration rate is greatly increased while sleeping.{/}');
}

export default {
  name,
  description,
  usage,
  execute,
};
