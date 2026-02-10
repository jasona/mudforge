/**
 * Wield command - Equip a weapon to your hand.
 *
 * Usage:
 *   wield <weapon>              - Wield in main hand
 *   wield <weapon> in left      - Wield in off-hand (for light weapons)
 *   wield <weapon> in right     - Wield in main hand
 */

import type { MudObject, Weapon, WeaponSlot, Living, Room } from '../../lib/std.js';
import { parseItemInput, findItem, countMatching } from '../../lib/item-utils.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['wield'];
export const description = 'Wield a weapon from your inventory';
export const usage = 'wield <weapon> [in left/right]';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const living = player as Living;

  if (!args) {
    ctx.sendLine('Wield what?');
    ctx.sendLine('Usage: wield <weapon> [in left/right]');
    return;
  }

  // Parse args for optional hand preference (strip "in left/right" BEFORE parseItemInput)
  let itemPortion = args;
  let preferredSlot: WeaponSlot | undefined;

  // Check for "in left/off" pattern
  const leftMatch = args.match(/^(.+?)\s+in\s+(left|off)\s*(?:hand)?$/i);
  const rightMatch = args.match(/^(.+?)\s+in\s+(right|main)\s*(?:hand)?$/i);

  if (leftMatch) {
    itemPortion = leftMatch[1].trim();
    preferredSlot = 'off_hand';
  } else if (rightMatch) {
    itemPortion = rightMatch[1].trim();
    preferredSlot = 'main_hand';
  }

  const parsed = parseItemInput(itemPortion);

  // Check if arm is disabled for the target slot
  if (living.hasArmDisabled) {
    // Right arm = main_hand, Left arm = off_hand
    if (preferredSlot === 'main_hand' && living.hasArmDisabled('right')) {
      ctx.sendLine("{red}Your right arm is disabled - you can't wield anything in your main hand!{/}");
      return;
    }
    if (preferredSlot === 'off_hand' && living.hasArmDisabled('left')) {
      ctx.sendLine("{red}Your left arm is disabled - you can't wield anything in your off hand!{/}");
      return;
    }
    // If no preferred slot, check if both arms are disabled
    if (!preferredSlot && living.areBothArmsDisabled && living.areBothArmsDisabled()) {
      ctx.sendLine("{red}Both of your arms are disabled - you can't wield anything!{/}");
      return;
    }
  }

  // Find weapon in inventory
  const weaponItems = player.inventory.filter((item) => 'wield' in item);
  const weapon = findItem(parsed.name, weaponItems, parsed.index) as Weapon | undefined;

  if (!weapon) {
    if (parsed.index !== undefined) {
      const count = countMatching(parsed.name, weaponItems);
      if (count > 0) {
        ctx.sendLine(count === 1
          ? `You only have 1 ${parsed.name} to wield.`
          : `You only have ${count} ${parsed.name}s to wield.`);
        return;
      }
    }
    ctx.sendLine(`You don't have any "${itemPortion}" to wield.`);
    return;
  }

  // Check if already wielded
  if (weapon.isWielded) {
    ctx.sendLine(`You are already wielding ${weapon.shortDesc}.`);
    return;
  }

  // Attempt to wield
  const result = weapon.wield(living, preferredSlot);
  ctx.sendLine(result.message);

  // Broadcast to room if successful
  if (result.success && living.environment) {
    const room = living.environment as Room;
    if (typeof room.broadcast === 'function') {
      room.broadcast(`${living.name} wields ${weapon.shortDesc}.`, { exclude: [player] });
    }
  }
}

export default { name, description, usage, execute };
