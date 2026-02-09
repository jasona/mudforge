/**
 * Craft command - Create items from materials.
 *
 * Integrates with the profession system for use-based skill improvement.
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
import { getProfessionDaemon } from '../../daemons/profession.js';
import { PROFESSION_DEFINITIONS } from '../../std/profession/definitions.js';
import { getMaterial } from '../../std/profession/materials.js';
import { RECIPE_DEFINITIONS, getRecipesByProfession } from '../../std/profession/recipes.js';
import type { RecipeDefinition, MaterialQuality, ProfessionId } from '../../std/profession/types.js';
import { QUALITY_NAMES, QUALITY_COLORS } from '../../std/profession/types.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

/**
 * Material requirement for a simple recipe.
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
 * Simple crafting recipe definition (non-profession).
 */
interface SimpleRecipe {
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
 * Simple crafting recipes (no profession required).
 */
const SIMPLE_RECIPES: SimpleRecipe[] = [
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
export const usage = 'craft list | craft <recipe name>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const living = player as Living;

  if (!args || args.toLowerCase() === 'list') {
    showAllRecipes(ctx);
    return;
  }

  const recipeName = args.trim().toLowerCase();

  // First check simple recipes
  const simpleRecipe = SIMPLE_RECIPES.find((r) => r.name.toLowerCase() === recipeName);
  if (simpleRecipe) {
    await craftSimple(ctx, simpleRecipe);
    return;
  }

  // Then check profession recipes
  const professionRecipe = findProfessionRecipe(recipeName);
  if (professionRecipe) {
    await craftProfession(ctx, professionRecipe);
    return;
  }

  ctx.sendLine(`{red}Unknown recipe: ${args}{/}`);
  ctx.sendLine('{dim}Use "craft list" or "recipes" to see available recipes.{/}');
}

/**
 * Find a profession recipe by name.
 */
function findProfessionRecipe(name: string): RecipeDefinition | null {
  const lowerName = name.toLowerCase();

  // Exact match first
  for (const recipe of Object.values(RECIPE_DEFINITIONS)) {
    if (recipe.name.toLowerCase() === lowerName || recipe.id.toLowerCase() === lowerName) {
      return recipe;
    }
  }

  // Partial match
  for (const recipe of Object.values(RECIPE_DEFINITIONS)) {
    if (recipe.name.toLowerCase().includes(lowerName)) {
      return recipe;
    }
  }

  return null;
}

/**
 * Craft using the profession system.
 */
async function craftProfession(ctx: CommandContext, recipe: RecipeDefinition): Promise<void> {
  const { player } = ctx;
  const daemon = getProfessionDaemon();

  // Check if player knows the recipe
  if (!daemon.knowsRecipe(player, recipe.id)) {
    const profession = PROFESSION_DEFINITIONS[recipe.profession];
    const skill = daemon.getPlayerSkill(player, recipe.profession);

    if (skill.level < recipe.levelRequired) {
      ctx.sendLine(`{red}You need ${profession.name} level ${recipe.levelRequired} to craft ${recipe.name}. You are level ${skill.level}.{/}`);
    } else if (recipe.requiresLearning) {
      ctx.sendLine(`{red}You haven't learned this recipe yet.{/}`);
    }
    return;
  }

  // Check station requirement
  if (recipe.stationRequired) {
    const stationCheck = daemon.hasStation(player, recipe.stationRequired);
    if (!stationCheck.has) {
      const stationName = formatName(recipe.stationRequired);
      ctx.sendLine(`{red}You need to be at a ${stationName} to craft this.{/}`);
      return;
    }
  }

  // Check tool requirement
  if (recipe.toolRequired) {
    const toolCheck = daemon.hasTool(player, recipe.toolRequired);
    if (!toolCheck.has) {
      ctx.sendLine(`{red}You need a ${formatName(recipe.toolRequired)} to craft this.{/}`);
      return;
    }
  }

  // Check materials
  const materialCheck = daemon.hasMaterials(player, recipe);
  if (!materialCheck.has) {
    ctx.sendLine('{red}You are missing materials:{/}');
    for (const missing of materialCheck.missing) {
      ctx.sendLine(`  - ${missing}`);
    }
    return;
  }

  // Begin crafting
  const profession = PROFESSION_DEFINITIONS[recipe.profession];
  ctx.send(`You begin crafting ${recipe.name}...`);

  // Simulate craft time
  await new Promise((resolve) => setTimeout(resolve, Math.min(recipe.craftTime * 100, 2000)));
  ctx.send('\n');

  // Get station and tool bonuses
  let stationTier = 0;
  let toolTier = 0;

  if (recipe.stationRequired) {
    const stationCheck = daemon.hasStation(player, recipe.stationRequired);
    stationTier = stationCheck.tier;
  }

  if (recipe.toolRequired) {
    const toolCheck = daemon.hasTool(player, recipe.toolRequired);
    toolTier = toolCheck.tier;
  }

  // Consume materials and get average quality
  const inputQuality = daemon.consumeMaterials(player, recipe);

  // Calculate output quality
  const outputQuality = daemon.calculateCraftQuality(
    player,
    recipe,
    inputQuality,
    toolTier,
    stationTier
  );

  // Check if this is first time crafting this recipe
  const data = daemon.getPlayerData(player);
  const isFirstCraft = !data.unlockedRecipes.includes(`crafted_${recipe.id}`);
  if (isFirstCraft) {
    data.unlockedRecipes.push(`crafted_${recipe.id}`);
  }

  // Create the crafted item
  const success = await createCraftedItem(ctx, recipe, outputQuality);

  if (success) {
    const qualityColor = QUALITY_COLORS[outputQuality];
    const qualityName = QUALITY_NAMES[outputQuality];

    ctx.sendLine(`{green}You successfully craft ${recipe.resultQuantity > 1 ? recipe.resultQuantity + 'x ' : ''}${recipe.name}!{/}`);

    if (recipe.qualityAffected) {
      ctx.sendLine(`Quality: {${qualityColor}}${qualityName}{/}`);
    }

    // Award XP
    const skill = daemon.getPlayerSkill(player, recipe.profession);
    daemon.awardXP(player, recipe.profession, recipe.xpReward, {
      isFirstCraft,
      isChallenge: recipe.levelRequired > skill.level,
      isTrivial: recipe.levelRequired < skill.level - 10,
    });

    if (isFirstCraft) {
      ctx.sendLine('{yellow}First time crafting this recipe! Bonus XP!{/}');
    }

    // Notify room
    const room = player.environment;
    if (room && 'broadcast' in room) {
      const name = typeof efuns !== 'undefined' ? efuns.capitalize(player.name) : player.name;
      (room as { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`${name} crafts ${recipe.name}.\n`, { exclude: [player] });
    }
  } else {
    ctx.sendLine('{red}Crafting failed! Materials were consumed.{/}');
  }
}

/**
 * Craft using simple recipes (backwards compatible).
 */
async function craftSimple(ctx: CommandContext, recipe: SimpleRecipe): Promise<void> {
  const { player } = ctx;
  const living = player as Living;

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
 * Create a crafted item from a profession recipe.
 */
async function createCraftedItem(
  ctx: CommandContext,
  recipe: RecipeDefinition,
  quality: MaterialQuality
): Promise<boolean> {
  const { player } = ctx;

  try {
    switch (recipe.resultType) {
      case 'material':
        return await createMaterialResult(ctx, recipe, quality);
      default:
        return await createEquipmentResult(ctx, recipe, quality);
    }
  } catch (error) {
    console.error('[Craft] Error creating item:', error);
    return false;
  }
}

/**
 * Create a material result (e.g., ingots, planks).
 */
async function createMaterialResult(
  ctx: CommandContext,
  recipe: RecipeDefinition,
  quality: MaterialQuality
): Promise<boolean> {
  const { player } = ctx;
  const config = recipe.resultConfig as { materialId: string; quantity: number };

  if (typeof efuns !== 'undefined' && efuns.cloneObject) {
    try {
      const item = await efuns.cloneObject('/std/profession/material-item');
      if (item) {
        const { MaterialItem } = await import('../../std/profession/material-item.js');
        if (item instanceof MaterialItem) {
          item.initFromMaterial(config.materialId, config.quantity || recipe.resultQuantity, quality);
          await item.moveTo(player as unknown as MudObject);
          return true;
        }
      }
    } catch {
      // Fallback below
    }
  }

  ctx.sendLine(`{green}You crafted ${config.materialId}.{/}`);
  return true;
}

/**
 * Create an equipment result (weapon, armor, etc.).
 */
async function createEquipmentResult(
  ctx: CommandContext,
  recipe: RecipeDefinition,
  quality: MaterialQuality
): Promise<boolean> {
  const { player } = ctx;
  const config = recipe.resultConfig as Record<string, unknown>;

  if (typeof efuns !== 'undefined' && efuns.cloneObject) {
    const basePath = (config.basePath as string) || '/std/item';

    for (let i = 0; i < recipe.resultQuantity; i++) {
      try {
        const item = await efuns.cloneObject(basePath);
        if (item) {
          item.name = (config.name as string) || recipe.name.toLowerCase();
          item.shortDesc = applyCraftedQuality((config.shortDesc as string) || `a ${recipe.name}`, quality);
          item.longDesc = (config.longDesc as string) || `A crafted ${recipe.name}.`;

          for (const [key, value] of Object.entries(config)) {
            if (key !== 'basePath' && key !== 'name' && key !== 'shortDesc' && key !== 'longDesc') {
              item.setProperty(key, value);
            }
          }

          applyCraftedQualityBonuses(item, quality, recipe.resultType);
          item.setProperty('crafted', true);
          item.setProperty('craftedQuality', quality);
          item.setProperty('craftedFrom', recipe.id);

          await item.moveTo(player as unknown as MudObject);
        }
      } catch {
        // Continue with next item
      }
    }
    return true;
  }

  ctx.sendLine(`{green}You crafted ${recipe.name}.{/}`);
  return true;
}

/**
 * Apply quality prefix to item description.
 */
function applyCraftedQuality(desc: string, quality: MaterialQuality): string {
  if (quality === 'common') return desc;

  const qualityName = QUALITY_NAMES[quality].toLowerCase();
  const color = QUALITY_COLORS[quality];

  if (desc.startsWith('a ') || desc.startsWith('an ')) {
    const article = desc.startsWith('an ') ? 'an' : 'a';
    const rest = desc.startsWith('an ') ? desc.slice(3) : desc.slice(2);
    return `{${color}}${article} ${qualityName} ${rest}{/}`;
  }

  return `{${color}}${qualityName} ${desc}{/}`;
}

/**
 * Apply stat bonuses based on crafted quality.
 */
function applyCraftedQualityBonuses(item: MudObject, quality: MaterialQuality, itemType: string): void {
  const qualityMultipliers: Record<MaterialQuality, number> = {
    poor: 0.75,
    common: 1.0,
    fine: 1.15,
    superior: 1.30,
    exceptional: 1.50,
    legendary: 2.0,
  };

  const multiplier = qualityMultipliers[quality];

  if (itemType === 'weapon') {
    const minDamage = item.getProperty<number>('minDamage');
    const maxDamage = item.getProperty<number>('maxDamage');
    if (minDamage) item.setProperty('minDamage', Math.round(minDamage * multiplier));
    if (maxDamage) item.setProperty('maxDamage', Math.round(maxDamage * multiplier));
  }

  if (itemType === 'armor') {
    const armor = item.getProperty<number>('armor');
    if (armor) item.setProperty('armor', Math.round(armor * multiplier));
  }

  if (itemType === 'consumable') {
    const magnitude = item.getProperty<number>('magnitude');
    if (magnitude) item.setProperty('magnitude', Math.round(magnitude * multiplier));
    const duration = item.getProperty<number>('duration');
    if (duration) item.setProperty('duration', Math.round(duration * multiplier));
  }

  const value = item.getProperty<number>('value');
  if (value) {
    item.setProperty('value', Math.round(value * multiplier * multiplier));
  }
}

function formatName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Show all available recipes.
 */
function showAllRecipes(ctx: CommandContext): void {
  const daemon = getProfessionDaemon();
  const { player } = ctx;

  ctx.sendLine('{bold}{cyan}═══════════════════════════════════════════════════════════════{/}');
  ctx.sendLine('{bold}{cyan}                      AVAILABLE RECIPES{/}');
  ctx.sendLine('{bold}{cyan}═══════════════════════════════════════════════════════════════{/}');
  ctx.sendLine('');

  // Simple recipes
  if (SIMPLE_RECIPES.length > 0) {
    ctx.sendLine('{bold}Basic Crafting:{/}');
    for (const recipe of SIMPLE_RECIPES) {
      ctx.sendLine(`  {cyan}${recipe.name}{/}`);
      for (const material of recipe.materials) {
        ctx.sendLine(`    - ${material.count}x ${material.name}`);
      }
    }
    ctx.sendLine('');
  }

  // Profession recipes summary
  ctx.sendLine('{bold}Profession Recipes:{/}');
  ctx.sendLine('{dim}Use "recipes" command for detailed profession recipe lists.{/}');
  ctx.sendLine('');

  const craftingProfessions: ProfessionId[] = [
    'alchemy',
    'blacksmithing',
    'woodworking',
    'leatherworking',
    'cooking',
    'jeweling',
  ];
  for (const profId of craftingProfessions) {
    const profession = PROFESSION_DEFINITIONS[profId];
    if (profession) {
      const recipes = getRecipesByProfession(profId);
      const skill = daemon.getPlayerSkill(player, profId);
      const available = recipes.filter((r) => r.levelRequired <= skill.level).length;
      ctx.sendLine(`  ${profession.name}: {yellow}${available}{/}/${recipes.length} recipes (skill ${skill.level})`);
    }
  }

  ctx.sendLine('');
  ctx.sendLine('{dim}Use "craft <item>" to craft an item.{/}');
}

export default {
  name,
  description,
  usage,
  execute,
};
