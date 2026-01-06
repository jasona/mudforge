/**
 * Equipment command - View your equipped items.
 *
 * Usage:
 *   equipment  - Show all equipment slots
 *   eq         - Alias
 *   equipped   - Alias
 */

import type { MudObject } from '../../std/object.js';
import type { Living } from '../../std/living.js';
import type { EquipmentSlot } from '../../std/equipment.js';
import { SLOT_DISPLAY_NAMES, SLOT_DISPLAY_ORDER } from '../../std/equipment.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['equipment', 'eq', 'equipped'];
export const description = 'View your equipped items';
export const usage = 'equipment';

export function execute(ctx: CommandContext): void {
  const { player } = ctx;
  const living = player as Living;
  const equipped = living.getAllEquipped();

  ctx.sendLine('{bold}{cyan}=== Equipment ==={/}');
  ctx.sendLine('');

  for (const slot of SLOT_DISPLAY_ORDER) {
    const item = equipped.get(slot);
    const displayName = SLOT_DISPLAY_NAMES[slot] || slot;

    if (item) {
      // Check for two-handed (shows same item in both slots)
      if (slot === 'off_hand' && equipped.get('main_hand') === item) {
        ctx.sendLine(`  {cyan}${displayName.padEnd(12)}{/} {dim}(two-handed){/}`);
      } else {
        ctx.sendLine(`  {cyan}${displayName.padEnd(12)}{/} ${item.shortDesc}`);
      }
    } else {
      ctx.sendLine(`  {cyan}${displayName.padEnd(12)}{/} {dim}empty{/}`);
    }
  }

  ctx.sendLine('');
}

export default { name, description, usage, execute };
