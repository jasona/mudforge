/**
 * Wake command - Wake up from sleeping.
 *
 * Transitions from sleeping to sitting posture.
 * Aliases: awaken
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['wake', 'awaken'];
export const description = 'Wake up from sleeping';
export const usage = 'wake';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const living = player as Living;

  // Check current posture
  const currentPosture = living.posture;

  if (currentPosture !== 'sleeping') {
    ctx.sendLine("You're not asleep.");
    return;
  }

  // Wake up to sitting
  const result = living.setPosture('sitting');

  if (!result.success) {
    ctx.sendLine(result.reason || "You can't wake up right now.");
    return;
  }

  // Success message
  ctx.sendLine('You wake up and sit up, stretching.');

  // Notify room (sleeping players filtered automatically)
  const room = player.environment;
  if (room && 'broadcast' in room) {
    const name = typeof efuns !== 'undefined' ? efuns.capitalize(living.name) : living.name;
    (room as { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
      .broadcast(`${name} wakes up and stretches.\n`, { exclude: [player] });
  }

  ctx.sendLine('{dim}Use "stand" to return to normal regeneration.{/}');
}

export default {
  name,
  description,
  usage,
  execute,
};
