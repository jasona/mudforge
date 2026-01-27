/**
 * Sit command - Sit down to rest.
 *
 * Sitting increases HP and MP regeneration by 1.5x.
 * Cannot sit while in combat.
 */

import type { MudObject, Room } from '../../lib/std.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'sit';
export const description = 'Sit down to rest and recover faster';
export const usage = 'sit [on <furniture>]';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const living = player as Living;

  // Check current posture
  const currentPosture = living.posture;

  if (currentPosture === 'sitting') {
    ctx.sendLine('You are already sitting.');
    return;
  }

  // Try to sit
  const result = living.setPosture('sitting');

  if (!result.success) {
    ctx.sendLine(result.reason || "You can't sit right now.");
    return;
  }

  // Success messages based on previous posture
  if (currentPosture === 'sleeping') {
    ctx.sendLine('You wake up and sit up, rubbing your eyes.');
  } else {
    ctx.sendLine('You sit down.');
  }

  // Notify room
  if (living.environment) {
    const room = living.environment as Room;
    if (typeof room.broadcast === 'function') {
      const name = typeof efuns !== 'undefined' ? efuns.capitalize(living.name) : living.name;
      const msg = currentPosture === 'sleeping'
        ? `${name} wakes and sits up.`
        : `${name} sits down.`;
      room.broadcast(msg, { exclude: [player] });
    }
  }

  // Check for campfire warmth
  if (living.isNearCampfire()) {
    ctx.sendLine('{yellow}The warmth of the nearby campfire soothes your tired muscles.{/}');
  }

  ctx.sendLine('{dim}Your regeneration rate increases while sitting.{/}');
}

export default {
  name,
  description,
  usage,
  execute,
};
