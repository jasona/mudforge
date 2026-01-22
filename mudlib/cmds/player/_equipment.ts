/**
 * Equipment command - View your equipped items.
 *
 * Usage:
 *   equipment       - Show equipment (GUI modal)
 *   eq              - Alias
 *   equipped        - Alias
 *   equipment text  - Text-only display
 */

import type { MudObject, Living, EquipmentSlot } from '../../lib/std.js';
import { SLOT_DISPLAY_NAMES, SLOT_DISPLAY_ORDER } from '../../lib/std.js';
import { openInventoryModal } from '../../lib/inventory-modal.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface InventoryPlayer extends Living {
  gold: number;
  onGUIResponse?: (msg: unknown) => void;
}

export const name = ['equipment', 'eq', 'equipped'];
export const description = 'View your equipped items';
export const usage = 'equipment [text|gui]';

/**
 * Show text-based equipment display.
 */
function showTextEquipment(ctx: CommandContext): void {
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

/**
 * Try to show GUI inventory modal on Equipment tab.
 * @returns true if GUI was shown, false if GUI is unavailable
 */
async function tryShowGUIEquipment(ctx: CommandContext): Promise<boolean> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return false;
  }

  const player = ctx.player as InventoryPlayer;
  await openInventoryModal(player, 0); // Open to Equipment tab
  return true;
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();

  // Explicit text mode
  if (args === 'text') {
    showTextEquipment(ctx);
    return;
  }

  // Explicit GUI mode or default
  if (args === 'gui' || args === '') {
    if (await tryShowGUIEquipment(ctx)) {
      return;
    }
    // Fall back to text if GUI unavailable
  }

  // Unknown argument or GUI fallback
  showTextEquipment(ctx);
}

export default { name, description, usage, execute };
