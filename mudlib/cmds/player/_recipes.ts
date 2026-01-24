/**
 * Recipes Command
 *
 * View available crafting recipes and their requirements.
 */

import type { CommandContext } from '../../std/command-context.js';
import { getProfessionDaemon } from '../../daemons/profession.js';
import { PROFESSION_DEFINITIONS, getProfessionsByCategory } from '../../std/profession/definitions.js';
import { getMaterial } from '../../std/profession/materials.js';
import { RECIPE_DEFINITIONS, getRecipesByProfession } from '../../std/profession/recipes.js';
import type { ProfessionId, RecipeDefinition } from '../../std/profession/types.js';
import { QUALITY_NAMES } from '../../std/profession/types.js';

export const name = ['recipes', 'recipe'];
export const description = 'View crafting recipes for your professions';
export const usage = 'recipes [profession] [recipe name]';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args, sendLine } = ctx;
  const daemon = getProfessionDaemon();
  const parts = args.trim().toLowerCase().split(/\s+/).filter(Boolean);

  // No arguments - show recipe overview
  if (parts.length === 0) {
    showRecipeOverview(ctx, daemon);
    return;
  }

  // Check if first arg is a profession
  const professionId = parts[0] as ProfessionId;
  if (PROFESSION_DEFINITIONS[professionId] && PROFESSION_DEFINITIONS[professionId].category === 'crafting') {
    if (parts.length > 1) {
      // Show specific recipe
      const recipeName = parts.slice(1).join(' ');
      showRecipeDetail(ctx, professionId, recipeName, daemon);
    } else {
      // Show all recipes for profession
      showProfessionRecipes(ctx, professionId, daemon);
    }
    return;
  }

  // Try to find a recipe by name
  const recipeName = parts.join(' ');
  const recipe = findRecipeByName(recipeName);

  if (recipe) {
    showRecipeInfo(ctx, recipe, daemon);
  } else {
    sendLine(`{red}Unknown profession or recipe: ${args}{/}`);
    sendLine('{dim}Use "recipes" to see available recipes.{/}');
  }
}

function showRecipeOverview(ctx: CommandContext, daemon: ReturnType<typeof getProfessionDaemon>): void {
  const { player, sendLine } = ctx;

  sendLine('{bold}{cyan}═══════════════════════════════════════════════════════════════{/}');
  sendLine('{bold}{cyan}                      CRAFTING RECIPES{/}');
  sendLine('{bold}{cyan}═══════════════════════════════════════════════════════════════{/}');
  sendLine('');

  const craftingProfessions = getProfessionsByCategory('crafting');

  for (const prof of craftingProfessions) {
    const skill = daemon.getPlayerSkill(player, prof.id);
    const recipes = getRecipesByProfession(prof.id);
    const availableRecipes = recipes.filter((r) => r.levelRequired <= skill.level);

    const levelColor = skill.level > 0 ? 'yellow' : 'dim';
    sendLine(`{bold}${prof.name}{/} {${levelColor}}[${skill.level}]{/}`);
    sendLine(`  {dim}${availableRecipes.length}/${recipes.length} recipes available{/}`);

    // Show a few sample recipes
    const samples = availableRecipes.slice(0, 3);
    for (const recipe of samples) {
      sendLine(`    - ${recipe.name} [${recipe.levelRequired}]`);
    }
    if (availableRecipes.length > 3) {
      sendLine(`    {dim}... and ${availableRecipes.length - 3} more{/}`);
    }
    sendLine('');
  }

  sendLine('{dim}Use "recipes <profession>" for full recipe list.{/}');
  sendLine('{dim}Use "recipes <profession> <name>" for recipe details.{/}');
}

function showProfessionRecipes(
  ctx: CommandContext,
  professionId: ProfessionId,
  daemon: ReturnType<typeof getProfessionDaemon>
): void {
  const { player, sendLine } = ctx;
  const profession = PROFESSION_DEFINITIONS[professionId];
  const skill = daemon.getPlayerSkill(player, professionId);
  const recipes = getRecipesByProfession(professionId);

  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine(`{bold}{cyan}                    ${profession.name.toUpperCase()} RECIPES{/}`);
  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine(`Your skill: {yellow}${skill.level}{/}`);
  sendLine('');

  // Group recipes by level tiers
  const tiers: Record<string, RecipeDefinition[]> = {
    '1-20': [],
    '21-40': [],
    '41-60': [],
    '61-80': [],
    '81-100': [],
  };

  for (const recipe of recipes) {
    const level = recipe.levelRequired;
    if (level <= 20) tiers['1-20'].push(recipe);
    else if (level <= 40) tiers['21-40'].push(recipe);
    else if (level <= 60) tiers['41-60'].push(recipe);
    else if (level <= 80) tiers['61-80'].push(recipe);
    else tiers['81-100'].push(recipe);
  }

  for (const [tierName, tierRecipes] of Object.entries(tiers)) {
    if (tierRecipes.length === 0) continue;

    const tierMin = parseInt(tierName.split('-')[0]);
    const tierColor = skill.level >= tierMin ? 'white' : 'dim';

    sendLine(`{bold}{${tierColor}}Level ${tierName}:{/}`);

    for (const recipe of tierRecipes) {
      const canCraft = skill.level >= recipe.levelRequired;
      const levelColor = canCraft ? 'green' : 'red';
      const typeIcon = getTypeIcon(recipe.resultType);

      sendLine(`  ${typeIcon} {${levelColor}}[${recipe.levelRequired}]{/} ${recipe.name}`);
      sendLine(`      {dim}${recipe.description}{/}`);
    }
    sendLine('');
  }
}

function showRecipeDetail(
  ctx: CommandContext,
  professionId: ProfessionId,
  recipeName: string,
  daemon: ReturnType<typeof getProfessionDaemon>
): void {
  const { sendLine } = ctx;
  const recipes = getRecipesByProfession(professionId);
  const recipe = recipes.find(
    (r) =>
      r.name.toLowerCase() === recipeName ||
      r.name.toLowerCase().includes(recipeName) ||
      r.id.toLowerCase() === recipeName
  );

  if (!recipe) {
    sendLine(`{red}Recipe "${recipeName}" not found in ${PROFESSION_DEFINITIONS[professionId].name}.{/}`);
    return;
  }

  showRecipeInfo(ctx, recipe, daemon);
}

function showRecipeInfo(
  ctx: CommandContext,
  recipe: RecipeDefinition,
  daemon: ReturnType<typeof getProfessionDaemon>
): void {
  const { player, sendLine } = ctx;
  const profession = PROFESSION_DEFINITIONS[recipe.profession];
  const skill = daemon.getPlayerSkill(player, recipe.profession);
  const canCraft = skill.level >= recipe.levelRequired;

  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine(`{bold}{cyan}${recipe.name.toUpperCase()}{/}`);
  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine('');

  sendLine(`{bold}Profession:{/} ${profession.name}`);
  sendLine(`{bold}Level Required:{/} ${canCraft ? '{green}' : '{red}'}${recipe.levelRequired}{/} (you: ${skill.level})`);
  sendLine(`{bold}Type:{/} ${recipe.resultType}`);
  sendLine('');

  sendLine(recipe.description);
  sendLine('');

  // Ingredients
  sendLine('{bold}Ingredients:{/}');
  for (const ingredient of recipe.ingredients) {
    const mat = getMaterial(ingredient.materialId);
    const matName = mat?.name || ingredient.materialId;

    // Check if player has this material
    const playerHas = countPlayerMaterial(player, ingredient.materialId);
    const hasColor = playerHas >= ingredient.quantity ? 'green' : 'red';

    let qualityStr = '';
    if (ingredient.qualityMinimum) {
      qualityStr = ` (${QUALITY_NAMES[ingredient.qualityMinimum]}+)`;
    }

    sendLine(`  - ${matName} x${ingredient.quantity}${qualityStr} {${hasColor}}(have ${playerHas}){/}`);
  }
  sendLine('');

  // Requirements
  if (recipe.stationRequired) {
    const hasStation = daemon.hasStation(player, recipe.stationRequired);
    const stationColor = hasStation.has ? 'green' : 'red';
    sendLine(`{bold}Station:{/} {${stationColor}}${formatStationName(recipe.stationRequired)}{/}`);
  }

  if (recipe.toolRequired) {
    const hasTool = daemon.hasTool(player, recipe.toolRequired);
    const toolColor = hasTool.has ? 'green' : 'red';
    sendLine(`{bold}Tool:{/} {${toolColor}}${recipe.toolRequired}{/}`);
  }

  sendLine(`{bold}Craft Time:{/} ${recipe.craftTime} seconds`);
  sendLine(`{bold}XP Reward:{/} ${recipe.xpReward}`);

  if (recipe.qualityAffected) {
    sendLine(`{bold}Quality:{/} {cyan}Affected by skill, materials, and station{/}`);
  }
}

function findRecipeByName(name: string): RecipeDefinition | null {
  const lowerName = name.toLowerCase();

  for (const recipe of Object.values(RECIPE_DEFINITIONS)) {
    if (
      recipe.name.toLowerCase() === lowerName ||
      recipe.name.toLowerCase().includes(lowerName) ||
      recipe.id.toLowerCase() === lowerName
    ) {
      return recipe;
    }
  }

  return null;
}

function countPlayerMaterial(player: { inventory: MudObject[] }, materialId: string): number {
  let count = 0;
  for (const item of player.inventory) {
    const itemMaterialId = item.getProperty<string>('materialId');
    if (itemMaterialId === materialId) {
      count += item.getProperty<number>('quantity') || 1;
    }
  }
  return count;
}

function getTypeIcon(resultType: string): string {
  const icons: Record<string, string> = {
    weapon: '{red}⚔{/}',
    armor: '{blue}🛡{/}',
    consumable: '{green}⚗{/}',
    material: '{yellow}◆{/}',
    tool: '{cyan}🔧{/}',
    container: '{dim}📦{/}',
    accessory: '{MAGENTA}💎{/}',
  };
  return icons[resultType] || '•';
}

function formatStationName(stationType: string): string {
  return stationType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Import MudObject type
import type { MudObject } from '../../std/object.js';

export default { name, description, usage, execute };
