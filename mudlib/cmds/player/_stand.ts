/**
 * Stand command - Stand up from sitting.
 *
 * Returns to normal regeneration rate.
 * Aliases: rise
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['stand', 'rise'];
export const description = 'Stand up from sitting or sleeping';
export const usage = 'stand';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const living = player as Living;

  // Check current posture
  const currentPosture = living.posture;

  if (currentPosture === 'standing') {
    ctx.sendLine('You are already standing.');
    return;
  }

  // Cannot stand directly from sleeping
  if (currentPosture === 'sleeping') {
    ctx.sendLine('You need to wake up first. Try the "wake" command.');
    return;
  }

  // Try to stand
  const result = living.setPosture('standing');

  if (!result.success) {
    ctx.sendLine(result.reason || "You can't stand right now.");
    return;
  }

  // Success message
  ctx.sendLine('You stand up.');

  // Notify room (sleeping players filtered automatically)
  const room = player.environment;
  if (room && 'broadcast' in room) {
    const name = typeof efuns !== 'undefined' ? efuns.capitalize(living.name) : living.name;
    (room as { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
      .broadcast(`${name} stands up.\n`, { exclude: [player] });
  }

  ctx.sendLine('{dim}Your regeneration rate returns to normal.{/}');
}

export default {
  name,
  description,
  usage,
  execute,
};
