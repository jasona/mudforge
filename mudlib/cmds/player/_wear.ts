/**
 * Wear command - Put on armor or clothing.
 *
 * Usage:
 *   wear <armor>  - Wear armor from your inventory
 */

import type { MudObject, Armor, Living, Room } from '../../lib/std.js';
import { parseItemInput, findItem, countMatching } from '../../lib/item-utils.js';

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
  const parsed = parseItemInput(args);
  const armorItems = player.inventory.filter((item) => 'wear' in item);
  const armor = findItem(parsed.name, armorItems, parsed.index) as Armor | undefined;

  if (!armor) {
    if (parsed.index !== undefined) {
      const count = countMatching(parsed.name, armorItems);
      if (count > 0) {
        ctx.sendLine(count === 1
          ? `You only have 1 ${parsed.name} to wear.`
          : `You only have ${count} ${parsed.name}s to wear.`);
        return;
      }
    }
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
