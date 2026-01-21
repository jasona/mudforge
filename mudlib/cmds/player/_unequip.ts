/**
 * Unequip command - Remove or unwield equipped items.
 *
 * Usage:
 *   unequip <item>   - Remove or unwield a specific item
 *   unequip all      - Unequip all worn/wielded items
 */

import type { MudObject, Living, Room, Weapon, Armor } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['unequip'];
export const description = 'Remove or unwield equipped items';
export const usage = 'unequip <item> | unequip all';

/**
 * Check if an item is a weapon (has unwield method).
 */
function isWeapon(item: MudObject): item is Weapon {
  return 'unwield' in item && typeof (item as Weapon).unwield === 'function';
}

/**
 * Check if an item is armor (has remove method).
 */
function isArmor(item: MudObject): item is Armor {
  return 'remove' in item && typeof (item as Armor).remove === 'function';
}

/**
 * Unequip a single item (either remove or unwield it).
 */
function unequipItem(
  ctx: CommandContext,
  living: Living,
  item: Weapon | Armor,
  silent: boolean = false
): boolean {
  const room = living.environment as Room | null;

  if (isWeapon(item)) {
    const weapon = item as Weapon;

    // Skip if not wielded
    if (!weapon.isWielded) {
      if (!silent) {
        ctx.sendLine(`You aren't wielding ${weapon.shortDesc}.`);
      }
      return false;
    }

    // Try to unwield
    const result = weapon.unwield();
    if (result.success) {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      if (room && typeof room.broadcast === 'function') {
        room.broadcast(`${living.name} stops wielding ${weapon.shortDesc}.`, { exclude: [living] });
      }
      return true;
    } else {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      return false;
    }
  }

  if (isArmor(item)) {
    const armor = item as Armor;

    // Skip if not worn
    if (!armor.isWorn) {
      if (!silent) {
        ctx.sendLine(`You aren't wearing ${armor.shortDesc}.`);
      }
      return false;
    }

    // Try to remove
    const result = armor.remove();
    if (result.success) {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      if (room && typeof room.broadcast === 'function') {
        room.broadcast(`${living.name} removes ${armor.shortDesc}.`, { exclude: [living] });
      }
      return true;
    } else {
      if (!silent) {
        ctx.sendLine(result.message);
      }
      return false;
    }
  }

  return false;
}

/**
 * Unequip all equipped items.
 */
function unequipAll(ctx: CommandContext, living: Living): void {
  const unequipped: string[] = [];
  const equipped = living.getAllEquipped();

  if (equipped.size === 0) {
    ctx.sendLine("You don't have anything equipped.");
    return;
  }

  // Collect all equipped items first (to avoid modifying map while iterating)
  const items = Array.from(equipped.values());

  // Track items we've already processed (for two-handed weapons in both slots)
  const processed = new Set<MudObject>();

  for (const item of items) {
    // Skip if already processed (e.g., two-handed weapon appears in both slots)
    if (processed.has(item)) {
      continue;
    }
    processed.add(item);

    if (isWeapon(item)) {
      const weapon = item as Weapon;
      if (weapon.isWielded) {
        const result = weapon.unwield();
        if (result.success) {
          unequipped.push(weapon.shortDesc);
        }
      }
    } else if (isArmor(item)) {
      const armor = item as Armor;
      if (armor.isWorn) {
        const result = armor.remove();
        if (result.success) {
          unequipped.push(armor.shortDesc);
        }
      }
    }
  }

  // Report results
  if (unequipped.length === 0) {
    ctx.sendLine("Couldn't unequip anything.");
    return;
  }

  ctx.sendLine('You unequip:');
  for (const desc of unequipped) {
    ctx.sendLine(`  {yellow}${desc}{/}`);
  }

  // Broadcast to room
  const room = living.environment as Room | null;
  if (room && typeof room.broadcast === 'function') {
    if (unequipped.length === 1) {
      room.broadcast(`${living.name} unequips ${unequipped[0]}.`, { exclude: [living] });
    } else {
      room.broadcast(`${living.name} unequips several items.`, { exclude: [living] });
    }
  }
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const living = player as Living;

  if (!args) {
    ctx.sendLine('Unequip what?');
    ctx.sendLine('');
    ctx.sendLine('Usage: unequip <item>   - Remove or unwield a specific item');
    ctx.sendLine('       unequip all      - Unequip all worn/wielded items');
    return;
  }

  const input = args.trim().toLowerCase();

  // Handle "unequip all"
  if (input === 'all') {
    unequipAll(ctx, living);
    return;
  }

  // Find equipped item by name
  const equipped = living.getAllEquipped();
  let targetItem: Weapon | Armor | undefined;

  // Track items we've already checked (for two-handed weapons)
  const checked = new Set<MudObject>();

  for (const [, item] of equipped) {
    if (checked.has(item)) continue;
    checked.add(item);

    if (item.id(input)) {
      targetItem = item;
      break;
    }
  }

  if (!targetItem) {
    ctx.sendLine(`You don't have any "${args}" equipped.`);
    return;
  }

  unequipItem(ctx, living, targetItem);
}

export default { name, description, usage, execute };
