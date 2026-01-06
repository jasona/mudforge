/**
 * Unwield command - Stop wielding a weapon.
 *
 * Usage:
 *   unwield           - Unwield all weapons
 *   unwield <weapon>  - Unwield specific weapon
 */

import type { MudObject } from '../../std/object.js';
import type { Weapon } from '../../std/weapon.js';
import type { Living } from '../../std/living.js';
import type { Room } from '../../std/room.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['unwield', 'sheathe'];
export const description = 'Stop wielding a weapon';
export const usage = 'unwield [weapon]';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const living = player as Living;

  const wielded = living.getWieldedWeapons();

  // If no args, unwield all weapons
  if (!args) {
    if (!wielded.mainHand && !wielded.offHand) {
      ctx.sendLine("You aren't wielding anything.");
      return;
    }

    // Unwield main hand first
    if (wielded.mainHand) {
      const result = wielded.mainHand.unwield();
      ctx.sendLine(result.message);

      if (result.success && living.environment) {
        const room = living.environment as Room;
        if (typeof room.broadcast === 'function') {
          room.broadcast(`${living.name} stops wielding ${wielded.mainHand.shortDesc}.`, { exclude: [player] });
        }
      }
    }

    // Unwield off hand if different from main hand
    if (wielded.offHand && wielded.offHand !== wielded.mainHand) {
      const result = wielded.offHand.unwield();
      ctx.sendLine(result.message);

      if (result.success && living.environment) {
        const room = living.environment as Room;
        if (typeof room.broadcast === 'function') {
          room.broadcast(`${living.name} stops wielding ${wielded.offHand.shortDesc}.`, { exclude: [player] });
        }
      }
    }
    return;
  }

  // Find specific weapon to unwield
  let weapon: Weapon | undefined;

  if (wielded.mainHand?.id(args)) {
    weapon = wielded.mainHand;
  } else if (wielded.offHand?.id(args)) {
    weapon = wielded.offHand;
  }

  if (!weapon) {
    ctx.sendLine(`You aren't wielding any "${args}".`);
    return;
  }

  const result = weapon.unwield();
  ctx.sendLine(result.message);

  if (result.success && living.environment) {
    const room = living.environment as Room;
    if (typeof room.broadcast === 'function') {
      room.broadcast(`${living.name} stops wielding ${weapon.shortDesc}.`, { exclude: [player] });
    }
  }
}

export default { name, description, usage, execute };
