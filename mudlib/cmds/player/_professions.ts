/**
 * Professions Command
 *
 * View profession skills and progress.
 */

import type { CommandContext } from '../../std/command-context.js';
import { getProfessionDaemon } from '../../daemons/profession.js';
import { PROFESSION_DEFINITIONS, getProfessionsByCategory } from '../../std/profession/definitions.js';
import type { ProfessionId, ProfessionSkill } from '../../std/profession/types.js';
import { getXPRequired, PROFESSION_CONSTANTS } from '../../std/profession/types.js';

export const name = ['professions', 'profs', 'skills'];
export const description = 'View your profession skills and progress';
export const usage = 'professions [category|profession name]';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args, sendLine } = ctx;
  const daemon = getProfessionDaemon();
  const arg = args.trim().toLowerCase();

  // Show specific category
  if (arg === 'crafting' || arg === 'gathering' || arg === 'movement') {
    showCategory(ctx, arg, daemon);
    return;
  }

  // Show specific profession
  if (arg && PROFESSION_DEFINITIONS[arg as ProfessionId]) {
    showProfession(ctx, arg as ProfessionId, daemon);
    return;
  }

  // Show overview of all professions
  sendLine('{bold}{cyan}═══════════════════════════════════════════════════════════════{/}');
  sendLine('{bold}{cyan}                     PROFESSION SKILLS{/}');
  sendLine('{bold}{cyan}═══════════════════════════════════════════════════════════════{/}');
  sendLine('');

  // Get all player skills
  const allSkills = daemon.getAllPlayerSkills(player);

  // Crafting Professions
  sendLine('{bold}{yellow}Crafting Professions{/}');
  sendLine('{dim}───────────────────────────────────────────────────────────────{/}');
  showProfessionList(ctx, 'crafting', allSkills, daemon);
  sendLine('');

  // Gathering Professions
  sendLine('{bold}{green}Gathering Professions{/}');
  sendLine('{dim}───────────────────────────────────────────────────────────────{/}');
  showProfessionList(ctx, 'gathering', allSkills, daemon);
  sendLine('');

  // Movement Skills
  sendLine('{bold}{blue}Movement Skills{/}');
  sendLine('{dim}───────────────────────────────────────────────────────────────{/}');
  showProfessionList(ctx, 'movement', allSkills, daemon);
  sendLine('');

  sendLine('{dim}Use "professions <name>" for detailed info on a specific profession.{/}');
  sendLine('{dim}Use "professions crafting|gathering|movement" to filter by category.{/}');
}

function showProfessionList(
  ctx: CommandContext,
  category: 'crafting' | 'gathering' | 'movement',
  allSkills: ProfessionSkill[],
  daemon: ReturnType<typeof getProfessionDaemon>
): void {
  const { sendLine } = ctx;
  const professions = getProfessionsByCategory(category);

  for (const prof of professions) {
    const skill = allSkills.find((s) => s.professionId === prof.id);
    const level = skill?.level || 1;
    const xp = skill?.experience || 0;
    const xpRequired = getXPRequired(level);
    const rank = daemon.getSkillRank(level);

    // Format level with color based on rank
    let levelColor = 'dim';
    if (level >= 80) levelColor = 'YELLOW';
    else if (level >= 60) levelColor = 'MAGENTA';
    else if (level >= 40) levelColor = 'blue';
    else if (level >= 20) levelColor = 'green';
    else if (level > 0) levelColor = 'white';

    const levelStr = level.toString().padStart(3);
    const nameStr = prof.name.padEnd(16);
    const rankStr = rank.padEnd(12);

    if (level >= PROFESSION_CONSTANTS.MAX_SKILL_LEVEL) {
      sendLine(`  ${nameStr} {${levelColor}}${levelStr}{/} ${rankStr} {yellow}(MAX){/}`);
    } else if (level > 0) {
      const percent = Math.floor((xp / xpRequired) * 100);
      const bar = makeProgressBar(percent, 15);
      sendLine(`  ${nameStr} {${levelColor}}${levelStr}{/} ${rankStr} ${bar} {dim}${percent}%{/}`);
    } else {
      sendLine(`  ${nameStr} {dim}  -{/}  ${rankStr}`);
    }
  }
}

function showCategory(
  ctx: CommandContext,
  category: 'crafting' | 'gathering' | 'movement',
  daemon: ReturnType<typeof getProfessionDaemon>
): void {
  const { player, sendLine } = ctx;
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const allSkills = daemon.getAllPlayerSkills(player);

  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine(`{bold}{cyan}                  ${categoryName.toUpperCase()} PROFESSIONS{/}`);
  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine('');

  const professions = getProfessionsByCategory(category);

  for (const prof of professions) {
    const skill = allSkills.find((s) => s.professionId === prof.id);
    const level = skill?.level || 1;
    const xp = skill?.experience || 0;
    const xpRequired = getXPRequired(level);
    const totalUses = skill?.totalUses || 0;
    const rank = daemon.getSkillRank(level);

    sendLine(`{bold}{yellow}${prof.name}{/} - {dim}${rank}{/}`);
    sendLine(`  ${prof.description}`);

    if (level >= PROFESSION_CONSTANTS.MAX_SKILL_LEVEL) {
      sendLine(`  Level: {yellow}${level}{/} (MAX)`);
    } else {
      const percent = Math.floor((xp / xpRequired) * 100);
      sendLine(`  Level: {yellow}${level}{/}  XP: ${xp}/${xpRequired} (${percent}%)`);
    }
    sendLine(`  Total uses: {cyan}${totalUses}{/}`);

    if (prof.toolRequired) {
      sendLine(`  Requires: ${formatToolName(prof.toolRequired)}`);
    }
    if (prof.stationRequired) {
      sendLine(`  Station: ${formatStationName(prof.stationRequired)}`);
    }

    sendLine('');
  }
}

function showProfession(
  ctx: CommandContext,
  professionId: ProfessionId,
  daemon: ReturnType<typeof getProfessionDaemon>
): void {
  const { player, sendLine } = ctx;
  const prof = PROFESSION_DEFINITIONS[professionId];
  if (!prof) {
    sendLine('{red}Unknown profession.{/}');
    return;
  }

  const skill = daemon.getPlayerSkill(player, professionId);
  const xpRequired = getXPRequired(skill.level);
  const rank = daemon.getSkillRank(skill.level);

  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine(`{bold}{cyan}                     ${prof.name.toUpperCase()}{/}`);
  sendLine(`{bold}{cyan}═══════════════════════════════════════════════════════════════{/}`);
  sendLine('');
  sendLine(prof.description);
  sendLine('');

  sendLine(`{bold}Category:{/} ${prof.category.charAt(0).toUpperCase() + prof.category.slice(1)}`);
  sendLine(`{bold}Primary Stat:{/} ${prof.primaryStat.charAt(0).toUpperCase() + prof.primaryStat.slice(1)}`);
  sendLine('');

  sendLine(`{bold}Your Progress:{/}`);
  sendLine(`  Rank: {yellow}${rank}{/}`);

  if (skill.level >= PROFESSION_CONSTANTS.MAX_SKILL_LEVEL) {
    sendLine(`  Level: {yellow}${skill.level}{/} (MAX)`);
  } else {
    const percent = Math.floor((skill.experience / xpRequired) * 100);
    const bar = makeProgressBar(percent, 25);
    sendLine(`  Level: {yellow}${skill.level}{/}`);
    sendLine(`  XP: ${skill.experience} / ${xpRequired}`);
    sendLine(`  ${bar} {dim}${percent}%{/}`);
  }

  sendLine(`  Total uses: {cyan}${skill.totalUses}{/}`);
  sendLine('');

  // Show requirements
  if (prof.toolRequired) {
    const toolCheck = daemon.hasTool(player, prof.toolRequired);
    const status = toolCheck.has ? '{green}(owned){/}' : '{red}(needed){/}';
    sendLine(`{bold}Tool Required:{/} ${formatToolName(prof.toolRequired)} ${status}`);
  }

  if (prof.stationRequired) {
    const stationCheck = daemon.hasStation(player, prof.stationRequired);
    const status = stationCheck.has ? '{green}(nearby){/}' : '{dim}(not nearby){/}';
    sendLine(`{bold}Station Required:{/} ${formatStationName(prof.stationRequired)} ${status}`);
  }

  // Show available recipes for crafting professions
  if (prof.category === 'crafting') {
    sendLine('');
    sendLine('{bold}Available Recipes:{/}');
    const recipes = daemon.getAvailableRecipes(player, professionId);
    if (recipes.length === 0) {
      sendLine('  {dim}None yet - gain more skill to unlock recipes{/}');
    } else {
      for (const recipe of recipes.slice(0, 10)) {
        const levelReq = recipe.levelRequired <= skill.level ? '{green}' : '{red}';
        sendLine(`  ${levelReq}[${recipe.levelRequired}]{/} ${recipe.name}`);
      }
      if (recipes.length > 10) {
        sendLine(`  {dim}... and ${recipes.length - 10} more (use "recipes ${professionId}" to see all){/}`);
      }
    }
  }

  // Show terrain unlocks for movement skills
  if (prof.category === 'movement') {
    sendLine('');
    sendLine('{bold}Terrain Access:{/}');
    showMovementUnlocks(ctx, professionId, skill.level);
  }
}

function showMovementUnlocks(ctx: CommandContext, professionId: ProfessionId, level: number): void {
  const { sendLine } = ctx;

  const terrainLevels: Record<string, { name: string; level: number }[]> = {
    swimming: [
      { name: 'Shallow water', level: 1 },
      { name: 'Rivers & streams', level: 20 },
      { name: 'Deep water', level: 50 },
      { name: 'Ocean currents', level: 80 },
    ],
    climbing: [
      { name: 'Hills & slopes', level: 1 },
      { name: 'Rocky terrain', level: 30 },
      { name: 'Cliffs', level: 50 },
      { name: 'Sheer walls', level: 80 },
    ],
    flying: [
      { name: 'Hover (stationary)', level: 1 },
      { name: 'Glide (downward)', level: 30 },
      { name: 'Free flight', level: 60 },
      { name: 'High altitude', level: 90 },
    ],
  };

  const terrains = terrainLevels[professionId] || [];
  for (const terrain of terrains) {
    const unlocked = level >= terrain.level;
    const status = unlocked ? '{green}✓{/}' : '{dim}✗{/}';
    const levelColor = unlocked ? 'green' : 'dim';
    sendLine(`  ${status} {${levelColor}}[${terrain.level}]{/} ${terrain.name}`);
  }
}

function makeProgressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `{cyan}${'█'.repeat(filled)}{/}{dim}${'░'.repeat(empty)}{/}`;
}

function formatToolName(toolType: string): string {
  return toolType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatStationName(stationType: string): string {
  return stationType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default { name, description, usage, execute };
