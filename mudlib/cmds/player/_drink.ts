/**
 * Drink command - Consume drinks or potions from inventory.
 *
 * Usage:
 *   drink <item>     - Drink a potion or beverage
 *   quaff <item>     - Same as drink
 */

import type { MudObject } from '../../lib/std.js';
import { Consumable } from '../../std/consumable.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['drink', 'quaff'];
export const description = 'Drink a potion or beverage from your inventory';
export const usage = 'drink <item>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;

  if (!args) {
    ctx.sendLine('Drink what?');
    return;
  }

  const targetName = args.toLowerCase();

  // Find drinkable in inventory
  const drink = player.inventory.find((item) => {
    // Check if it matches the name
    if (item.id && item.id(targetName)) {
      // Check if it's a drink or potion consumable
      if (item instanceof Consumable && (item.consumableType === 'drink' || item.consumableType === 'potion')) {
        return true;
      }
    }
    return false;
  }) as Consumable | undefined;

  if (!drink) {
    // Check if item exists but isn't drinkable
    const nonDrink = player.inventory.find((item) => item.id && item.id(targetName));
    if (nonDrink) {
      ctx.sendLine("You can't drink that.");
    } else {
      ctx.sendLine(`You don't have any "${args}".`);
    }
    return;
  }

  // Consume the drink
  const success = await drink.consume(player as import('../../std/living.js').Living);
  if (!success) {
    ctx.sendLine("You couldn't drink that.");
  }
}

export default {
  name,
  description,
  usage,
  execute,
};
