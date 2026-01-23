/**
 * Craft command - Create items from materials.
 *
 * Usage:
 *   craft list           - Show available recipes
 *   craft <item>         - Craft an item if you have materials
 *
 * Aliases: make, build
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';
import { Item } from '../../std/item.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

/**
 * Material requirement for a recipe.
 */
interface MaterialRequirement {
  /** Item ID to match */
  id: string;
  /** Display name */
  name: string;
  /** Quantity needed */
  count: number;
}

/**
 * Crafting recipe definition.
 */
interface Recipe {
  /** Name of the craftable item */
  name: string;
  /** Blueprint path to clone */
  resultPath: string;
  /** Materials required */
  materials: MaterialRequirement[];
  /** Message shown on successful craft */
  craftMessage?: string;
  /** Whether result goes in room (true) or inventory (false) */
  placeInRoom?: boolean;
}

/**
 * Available crafting recipes.
 */
const RECIPES: Recipe[] = [
  {
    name: 'campfire',
    resultPath: '/std/campfire',
    materials: [
      { id: 'firewood', name: 'firewood', count: 3 },
      { id: 'tinder', name: 'tinder', count: 1 },
    ],
    craftMessage: 'You arrange the firewood and use the tinder to start a crackling campfire.',
    placeInRoom: true,
  },
];

export const name = ['craft', 'make', 'build'];
export const description = 'Craft items from materials';
export const usage = 'craft list | craft <item>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const living = player as Living;

  if (!args || args.toLowerCase() === 'list') {
    showRecipes(ctx);
    return;
  }

  const recipeName = args.toLowerCase();
  const recipe = RECIPES.find((r) => r.name.toLowerCase() === recipeName);

  if (!recipe) {
    ctx.sendLine(`Unknown recipe: ${args}`);
    ctx.sendLine('Use "craft list" to see available recipes.');
    return;
  }

  // Check materials
  const missingMaterials: string[] = [];
  const consumeMaterials: Array<{ item: MudObject; count: number }> = [];

  for (const material of recipe.materials) {
    const matchingItems = player.inventory.filter((item) => {
      if (item instanceof Item && item.id && item.id(material.id)) {
        return true;
      }
      return false;
    });

    const totalCount = matchingItems.length;
    if (totalCount < material.count) {
      missingMaterials.push(`${material.count - totalCount} more ${material.name}`);
    } else {
      // Queue items to consume
      for (let i = 0; i < material.count; i++) {
        consumeMaterials.push({ item: matchingItems[i], count: 1 });
      }
    }
  }

  if (missingMaterials.length > 0) {
    ctx.sendLine(`You don't have enough materials to craft ${recipe.name}.`);
    ctx.sendLine(`You need: ${missingMaterials.join(', ')}`);
    return;
  }

  // Consume materials
  for (const { item } of consumeMaterials) {
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      await efuns.destruct(item);
    }
  }

  // Create the result
  let result: MudObject | null = null;
  if (typeof efuns !== 'undefined' && efuns.cloneObject) {
    result = await efuns.cloneObject(recipe.resultPath);
  }

  if (!result) {
    ctx.sendLine('Crafting failed! The materials are lost.');
    return;
  }

  // Place result
  if (recipe.placeInRoom) {
    const room = player.environment;
    if (room) {
      await result.moveTo(room);
    }
  } else {
    await result.moveTo(player);
  }

  // Success messages
  if (recipe.craftMessage) {
    ctx.sendLine(recipe.craftMessage);
  } else {
    ctx.sendLine(`You craft ${result.shortDesc}.`);
  }

  // Notify room
  const room = player.environment;
  if (room && 'broadcast' in room) {
    const name = typeof efuns !== 'undefined' ? efuns.capitalize(living.name) : living.name;
    (room as { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
      .broadcast(`${name} crafts ${result.shortDesc}.\n`, { exclude: [player] });
  }
}

/**
 * Show available recipes.
 */
function showRecipes(ctx: CommandContext): void {
  ctx.sendLine('{bold}=== Available Recipes ==={/}');
  ctx.sendLine('');

  for (const recipe of RECIPES) {
    ctx.sendLine(`{cyan}${recipe.name}{/}`);
    ctx.sendLine('  Materials needed:');
    for (const material of recipe.materials) {
      ctx.sendLine(`    - ${material.count}x ${material.name}`);
    }
    ctx.sendLine('');
  }

  ctx.sendLine('Use "craft <item>" to craft an item.');
}

export default {
  name,
  description,
  usage,
  execute,
};
