/**
 * Inventory command - See what you are carrying.
 */

import type { MudObject, Living, EquipmentSlot } from '../../lib/std.js';
import { openInventoryModal } from '../../lib/inventory-modal.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerWithGold extends MudObject {
  gold?: number;
}

interface InventoryPlayer extends Living {
  gold: number;
  onGUIResponse?: (msg: unknown) => void;
}

export const name = ['inventory', 'i', 'inv'];
export const description = 'See what you are carrying';
export const usage = 'inventory [text|gui]';

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

/**
 * Show text-based inventory display.
 */
function showTextInventory(ctx: CommandContext): void {
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

  // Show gold
  const playerWithGold = player as PlayerWithGold;
  if (playerWithGold.gold !== undefined && playerWithGold.gold > 0) {
    ctx.sendLine('');
    ctx.sendLine(`{yellow}Coin purse: ${playerWithGold.gold} gold{/}`);
  }
}

/**
 * Try to show GUI inventory modal.
 * @returns true if GUI was shown, false if GUI is unavailable
 */
async function tryShowGUIInventory(ctx: CommandContext): Promise<boolean> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return false;
  }

  const player = ctx.player as InventoryPlayer;
  await openInventoryModal(player);
  return true;
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();

  // Explicit text mode
  if (args === 'text') {
    showTextInventory(ctx);
    return;
  }

  // Explicit GUI mode or default
  if (args === 'gui' || args === '') {
    if (await tryShowGUIInventory(ctx)) {
      return;
    }
    // Fall back to text if GUI unavailable
  }

  // Unknown argument or GUI fallback
  showTextInventory(ctx);
}

export default { name, description, usage, execute };
