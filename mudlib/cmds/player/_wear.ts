/**
 * Wear command - Put on armor or clothing.
 *
 * Usage:
 *   wear <armor>  - Wear armor from your inventory
 */

import type { MudObject } from '../../std/object.js';
import type { Armor } from '../../std/armor.js';
import type { Living } from '../../std/living.js';
import type { Room } from '../../std/room.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['wear', 'don'];
export const description = 'Wear armor or clothing';
export const usage = 'wear <armor>';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const living = player as Living;

  if (!args) {
    ctx.sendLine('Wear what?');
    ctx.sendLine('Usage: wear <armor>');
    return;
  }

  // Find armor in inventory
  let armor: Armor | undefined;
  for (const item of player.inventory) {
    if (item.id(args) && 'wear' in item) {
      armor = item as Armor;
      break;
    }
  }

  if (!armor) {
    ctx.sendLine(`You don't have any "${args}" to wear.`);
    return;
  }

  // Check if already worn
  if (armor.isWorn) {
    ctx.sendLine(`You are already wearing ${armor.shortDesc}.`);
    return;
  }

  // Attempt to wear
  const result = armor.wear(living);
  ctx.sendLine(result.message);

  // Broadcast to room if successful
  if (result.success && living.environment) {
    const room = living.environment as Room;
    if (typeof room.broadcast === 'function') {
      room.broadcast(`${living.name} puts on ${armor.shortDesc}.`, { exclude: [player] });
    }
  }
}

export default { name, description, usage, execute };
