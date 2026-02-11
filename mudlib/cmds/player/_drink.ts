/**
 * Drink command - Consume drinks or potions from inventory.
 *
 * Usage:
 *   drink <item>     - Drink a potion or beverage
 *   quaff <item>     - Same as drink
 */

import type { MudObject } from '../../lib/std.js';
import { Consumable } from '../../std/consumable.js';
import { parseItemInput, findItem, countMatching } from '../../lib/item-utils.js';

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

  const parsed = parseItemInput(args);

  // Find drinkable in inventory - filter to drink/potion consumables first
  const drinkItems = player.inventory.filter(
    (item) => item instanceof Consumable && (item.consumableType === 'drink' || item.consumableType === 'potion')
  );
  const drink = findItem(parsed.name, drinkItems, parsed.index) as Consumable | undefined;

  if (!drink) {
    // Check if index was out of range for drinkable items
    if (parsed.index !== undefined) {
      const drinkCount = countMatching(parsed.name, drinkItems);
      if (drinkCount > 0) {
        ctx.sendLine(drinkCount === 1
          ? `You only have 1 ${parsed.name} to drink.`
          : `You only have ${drinkCount} ${parsed.name}s to drink.`);
        return;
      }
    }
    // Check if item exists but isn't drinkable
    const nonDrink = findItem(parsed.name, player.inventory, parsed.index);
    if (nonDrink) {
      ctx.sendLine("You can't drink that.");
    } else {
      if (parsed.index !== undefined) {
        const count = countMatching(parsed.name, player.inventory);
        if (count > 0) {
          ctx.sendLine(count === 1
            ? `You only have 1 ${parsed.name}.`
            : `You only have ${count} ${parsed.name}s.`);
          return;
        }
      }
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
