/**
 * Equip command - Wear or wield items from your inventory.
 *
 * Usage:
 *   equip <item>   - Wear or wield a specific item
 *   equip all      - Equip all unequipped items into empty slots
 */

import type { MudObject, Living, Room, Weapon, Armor } from '../../lib/std.js';
import type { EquipmentSlot } from '../../std/equipment.js';
import { parseItemInput, findItem, countMatching } from '../../lib/item-utils.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['equip'];
export const description = 'Wear or wield items from your inventory';
export const usage = 'equip <item> | equip all';

/**
 * Get the slot an armor piece uses.
 */
function getArmorSlot(armor: Armor): EquipmentSlot {
  return armor.slot as EquipmentSlot;
}

/**
 * Get the slot(s) a weapon uses.
 */
function getWeaponSlots(weapon: Weapon): EquipmentSlot[] {
  if (weapon.handedness === 'two_handed') {
    return ['main_hand', 'off_hand'];
  }
  return ['main_hand'];
}

/**
 * Equip a single item (either wear or wield it).
 */
function equipItem(
  ctx: CommandContext,
  living: Living,
  item: MudObject,
  silent: boolean = false
): boolean {
  const room = living.environment as Room | null;

  if (efuns.isWeapon(item)) {
    const weapon = item as Weapon;

    // Skip if already wielded
    if (weapon.isWielded) {
      if (!silent) {
        ctx.sendLine(`You are already wielding ${weapon.shortDesc}.`);
      }
      return false;
    }

    // Try to wield
    const result = weapon.wield(living);
    if (result.success) {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      if (room && typeof room.broadcast === 'function') {
        room.broadcast(`${living.name} wields ${weapon.shortDesc}.`, { exclude: [living] });
      }
      return true;
    } else {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      return false;
    }
  }

  if (efuns.isArmor(item)) {
    const armor = item as Armor;

    // Skip if already worn
    if (armor.isWorn) {
      if (!silent) {
        ctx.sendLine(`You are already wearing ${armor.shortDesc}.`);
      }
      return false;
    }

    // Try to wear
    const result = armor.wear(living);
    if (result.success) {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      if (room && typeof room.broadcast === 'function') {
        room.broadcast(`${living.name} puts on ${armor.shortDesc}.`, { exclude: [living] });
      }
      return true;
    } else {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      return false;
    }
  }

  if (!silent) {
    ctx.sendLine(`You can't equip ${item.shortDesc}.`);
  }
  return false;
}

/**
 * Equip all unequipped items into empty slots.
 */
function equipAll(ctx: CommandContext, living: Living): void {
  const equipped: string[] = [];
  const skipped: string[] = [];

  // Get list of items to try equipping (copy since we're iterating)
  const items = [...living.inventory];

  for (const item of items) {
    // Skip items that aren't equippable
    if (!efuns.isWeapon(item) && !efuns.isArmor(item)) {
      continue;
    }

    if (efuns.isWeapon(item)) {
      const weapon = item as Weapon;

      // Skip if already wielded
      if (weapon.isWielded) {
        continue;
      }

      // Check if the slot is available
      const slots = getWeaponSlots(weapon);
      const mainHandOccupied = living.isSlotOccupied('main_hand');
      const offHandAvailable = living.isOffHandAvailable();

      // For two-handed weapons, both slots must be free
      if (weapon.handedness === 'two_handed') {
        if (mainHandOccupied || !offHandAvailable) {
          skipped.push(weapon.shortDesc);
          continue;
        }
      } else {
        // For one-handed, try main hand first, then off-hand if available
        if (mainHandOccupied && !offHandAvailable) {
          skipped.push(weapon.shortDesc);
          continue;
        }
      }

      // Try to equip
      const result = weapon.wield(living);
      if (result.success) {
        equipped.push(weapon.shortDesc);
      } else {
        skipped.push(weapon.shortDesc);
      }
    } else if (efuns.isArmor(item)) {
      const armor = item as Armor;

      // Skip if already worn
      if (armor.isWorn) {
        continue;
      }

      // Check if the slot is available
      const slot = getArmorSlot(armor);
      if (living.isSlotOccupied(slot)) {
        skipped.push(armor.shortDesc);
        continue;
      }

      // Try to equip
      const result = armor.wear(living);
      if (result.success) {
        equipped.push(armor.shortDesc);
      } else {
        skipped.push(armor.shortDesc);
      }
    }
  }

  // Report results
  if (equipped.length === 0 && skipped.length === 0) {
    ctx.sendLine("You don't have anything to equip.");
    return;
  }

  if (equipped.length > 0) {
    ctx.sendLine('You equip:');
    for (const desc of equipped) {
      ctx.sendLine(`  {green}${desc}{/}`);
    }

    // Broadcast to room
    const room = living.environment as Room | null;
    if (room && typeof room.broadcast === 'function') {
      if (equipped.length === 1) {
        room.broadcast(`${living.name} equips ${equipped[0]}.`, { exclude: [living] });
      } else {
        room.broadcast(`${living.name} equips several items.`, { exclude: [living] });
      }
    }
  }

  if (skipped.length > 0) {
    ctx.sendLine('{dim}Skipped (slots occupied):{/}');
    for (const desc of skipped) {
      ctx.sendLine(`  {dim}${desc}{/}`);
    }
  }

  if (equipped.length === 0) {
    ctx.sendLine('All equipment slots are already occupied.');
  }
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const living = player as Living;

  if (!args) {
    ctx.sendLine('Equip what?');
    ctx.sendLine('');
    ctx.sendLine('Usage: equip <item>   - Wear or wield a specific item');
    ctx.sendLine('       equip all      - Equip all items into empty slots');
    return;
  }

  const parsed = parseItemInput(args.trim());

  // Handle "equip all"
  if (parsed.isAll) {
    equipAll(ctx, living);
    return;
  }

  // Find equippable item in inventory (prefer weapons/armor)
  const equippableItems = player.inventory.filter(
    (item) => efuns.isWeapon(item) || efuns.isArmor(item)
  );
  let targetItem = findItem(parsed.name, equippableItems, parsed.index);

  if (!targetItem) {
    // Check if there's a non-equippable item with that name
    const anyItem = findItem(parsed.name, player.inventory, parsed.index);
    if (anyItem) {
      ctx.sendLine(`You can't equip ${anyItem.shortDesc}.`);
      return;
    }
    if (parsed.index !== undefined) {
      const count = countMatching(parsed.name, equippableItems);
      if (count > 0) {
        ctx.sendLine(count === 1
          ? `You only have 1 ${parsed.name} to equip.`
          : `You only have ${count} ${parsed.name}s to equip.`);
        return;
      }
    }
    ctx.sendLine(`You don't have any "${args}" to equip.`);
    return;
  }

  equipItem(ctx, living, targetItem);
}

export default { name, description, usage, execute };
