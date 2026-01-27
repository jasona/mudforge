/**
 * Unwield command - Stop wielding a weapon.
 *
 * Usage:
 *   unwield           - Unwield all weapons
 *   unwield <weapon>  - Unwield specific weapon
 */

import type { MudObject, Weapon, Living, Room } from '../../lib/std.js';

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

    // Check if both arms are disabled
    if (living.areBothArmsDisabled && living.areBothArmsDisabled()) {
      ctx.sendLine("{red}Both of your arms are disabled - you can't unwield anything!{/}");
      return;
    }

    // Unwield main hand first (requires right arm)
    if (wielded.mainHand) {
      if (living.hasArmDisabled && living.hasArmDisabled('right')) {
        ctx.sendLine("{red}Your right arm is disabled - you can't unwield your main hand weapon!{/}");
      } else {
        const result = wielded.mainHand.unwield();
        ctx.sendLine(result.message);

        if (result.success && living.environment) {
          const room = living.environment as Room;
          if (typeof room.broadcast === 'function') {
            room.broadcast(`${living.name} stops wielding ${wielded.mainHand.shortDesc}.`, { exclude: [player] });
          }
        }
      }
    }

    // Unwield off hand if different from main hand (requires left arm)
    if (wielded.offHand && wielded.offHand !== wielded.mainHand) {
      if (living.hasArmDisabled && living.hasArmDisabled('left')) {
        ctx.sendLine("{red}Your left arm is disabled - you can't unwield your off hand weapon!{/}");
      } else {
        const result = wielded.offHand.unwield();
        ctx.sendLine(result.message);

        if (result.success && living.environment) {
          const room = living.environment as Room;
          if (typeof room.broadcast === 'function') {
            room.broadcast(`${living.name} stops wielding ${wielded.offHand.shortDesc}.`, { exclude: [player] });
          }
        }
      }
    }
    return;
  }

  // Find specific weapon to unwield
  let weapon: Weapon | undefined;
  let isMainHand = false;

  if (wielded.mainHand?.id(args)) {
    weapon = wielded.mainHand;
    isMainHand = true;
  } else if (wielded.offHand?.id(args)) {
    weapon = wielded.offHand;
  }

  if (!weapon) {
    ctx.sendLine(`You aren't wielding any "${args}".`);
    return;
  }

  // Check if the relevant arm is disabled
  if (living.hasArmDisabled) {
    if (isMainHand && living.hasArmDisabled('right')) {
      ctx.sendLine("{red}Your right arm is disabled - you can't unwield that!{/}");
      return;
    }
    if (!isMainHand && living.hasArmDisabled('left')) {
      ctx.sendLine("{red}Your left arm is disabled - you can't unwield that!{/}");
      return;
    }
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
