/**
 * Inventory command - See what you are carrying.
 */

import type { MudObject, Living, EquipmentSlot } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['inventory', 'i', 'inv'];
export const description = 'See what you are carrying';
export const usage = 'inventory';

/**
 * Get the equipment indicator for an item.
 */
function getEquipIndicator(item: MudObject, equipped: Map<EquipmentSlot, MudObject>): string {
  for (const [slot, equippedItem] of equipped) {
    if (equippedItem === item) {
      if (slot === 'main_hand') return '(wielded)';
      if (slot === 'off_hand') {
        // Check if it's a shield or weapon
        if ('armor' in item) return '(worn - shield)';
        return '(wielded - off hand)';
      }
      return '(worn)';
    }
  }
  return '';
}

export function execute(ctx: CommandContext): void {
  const { player } = ctx;
  const living = player as Living;
  const items = player.inventory;
  const equipped = living.getAllEquipped();

  if (items.length === 0) {
    ctx.sendLine('You are not carrying anything.');
    return;
  }

  // Build set of equipped item references for fast lookup
  const equippedSet = new Set<MudObject>(equipped.values());

  // Separate equipped from carried
  const equippedItems = items.filter((item) => equippedSet.has(item));
  const carriedItems = items.filter((item) => !equippedSet.has(item));

  ctx.sendLine('{bold}{green}You are carrying:{/}');

  // Show equipped items first (with indicator)
  for (const item of equippedItems) {
    const indicator = getEquipIndicator(item, equipped as Map<EquipmentSlot, MudObject>);
    ctx.sendLine(`  ${item.shortDesc} {dim}${indicator}{/}`);
  }

  // Show carried items
  for (const item of carriedItems) {
    ctx.sendLine(`  ${item.shortDesc}`);
  }
}

export default { name, description, usage, execute };
