/**
 * Eat command - Consume food from inventory.
 *
 * Usage:
 *   eat <food>       - Eat food to restore HP and gain effects
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

export const name = 'eat';
export const description = 'Eat food from your inventory';
export const usage = 'eat <food>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;

  if (!args) {
    ctx.sendLine('Eat what?');
    return;
  }

  const parsed = parseItemInput(args);

  // Find food in inventory - filter to food consumables first
  const foodItems = player.inventory.filter(
    (item) => item instanceof Consumable && item.consumableType === 'food'
  );
  const food = findItem(parsed.name, foodItems, parsed.index) as Consumable | undefined;

  if (!food) {
    // Check if index was out of range for food items
    if (parsed.index !== undefined) {
      const foodCount = countMatching(parsed.name, foodItems);
      if (foodCount > 0) {
        ctx.sendLine(foodCount === 1
          ? `You only have 1 ${parsed.name} to eat.`
          : `You only have ${foodCount} ${parsed.name}s to eat.`);
        return;
      }
    }
    // Check if item exists but isn't food
    const nonFood = findItem(parsed.name, player.inventory, parsed.index);
    if (nonFood) {
      ctx.sendLine("You can't eat that.");
    } else {
      // Check if index out of range on non-food items
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

  // Consume the food
  const success = await food.consume(player as import('../../std/living.js').Living);
  if (!success) {
    ctx.sendLine("You couldn't eat that.");
  }
}

export default {
  name,
  description,
  usage,
  execute,
};
