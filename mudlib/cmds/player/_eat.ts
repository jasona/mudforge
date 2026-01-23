/**
 * Eat command - Consume food from inventory.
 *
 * Usage:
 *   eat <food>       - Eat food to restore HP and gain effects
 */

import type { MudObject } from '../../lib/std.js';
import { Consumable } from '../../std/consumable.js';

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

  const targetName = args.toLowerCase();

  // Find food in inventory
  const food = player.inventory.find((item) => {
    // Check if it matches the name
    if (item.id && item.id(targetName)) {
      // Check if it's a food consumable
      if (item instanceof Consumable && item.consumableType === 'food') {
        return true;
      }
    }
    return false;
  }) as Consumable | undefined;

  if (!food) {
    // Check if item exists but isn't food
    const nonFood = player.inventory.find((item) => item.id && item.id(targetName));
    if (nonFood) {
      ctx.sendLine("You can't eat that.");
    } else {
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
