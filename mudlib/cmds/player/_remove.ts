/**
 * Remove command - Take off armor or clothing.
 *
 * Usage:
 *   remove <armor>  - Remove worn armor
 */

import type { MudObject, Armor, Living, Room } from '../../lib/std.js';
import { parseItemInput, findItem, countMatching } from '../../lib/item-utils.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['remove', 'doff'];
export const description = 'Remove worn armor or clothing';
export const usage = 'remove <armor>';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const living = player as Living;

  if (!args) {
    ctx.sendLine('Remove what?');
    ctx.sendLine('Usage: remove <armor>');
    return;
  }

  // Find worn armor by name
  const parsed = parseItemInput(args);
  const equipped = living.getAllEquipped();

  // Build array of removable equipped items (skip weapon slots unless shield)
  const removableItems = equipped
    .filter(([slot, item]) => {
      if (slot === 'main_hand' || slot === 'off_hand') {
        return 'wear' in item; // Allow shields
      }
      return 'remove' in item;
    })
    .map(([, item]) => item);

  const armor = findItem(parsed.name, removableItems, parsed.index) as Armor | undefined;

  if (!armor) {
    if (parsed.index !== undefined) {
      const count = countMatching(parsed.name, removableItems);
      if (count > 0) {
        ctx.sendLine(count === 1
          ? `You are only wearing 1 ${parsed.name}.`
          : `You are only wearing ${count} ${parsed.name}s.`);
        return;
      }
    }
    ctx.sendLine(`You aren't wearing any "${args}".`);
    return;
  }

  const result = armor.remove();
  ctx.sendLine(result.message);

  if (result.success && living.environment) {
    const room = living.environment as Room;
    if (typeof room.broadcast === 'function') {
      room.broadcast(`${living.name} removes ${armor.shortDesc}.`, { exclude: [player] });
    }
  }
}

export default { name, description, usage, execute };
