/**
 * Remove command - Take off armor or clothing.
 *
 * Usage:
 *   remove <armor>  - Remove worn armor
 */

import type { MudObject, Armor, Living, Room } from '../../lib/std.js';

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
  let armor: Armor | undefined;
  const equipped = living.getAllEquipped();

  for (const [slot, item] of equipped) {
    // Skip weapon slots (use unwield for those)
    if (slot === 'main_hand' || slot === 'off_hand') {
      // But allow removing shields from off_hand
      if (!('wear' in item)) continue;
    }

    if (item.id(args) && 'remove' in item) {
      armor = item as Armor;
      break;
    }
  }

  if (!armor) {
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
