/**
 * Skills command - View learned skills.
 *
 * Usage:
 *   skills               - List all learned skills
 *   skills <guild>       - List skills from a specific guild
 *   skill info <name>    - Detailed skill info
 *   skill available      - Show skills available to learn
 *
 * Note: To use skills, type the skill name directly (e.g., "bash goblin", "heal").
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';
import { getGuildDaemon } from '../../daemons/guild.js';
import type { GuildId, SkillDefinition } from '../../std/guild/types.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface GuildPlayer extends Living {
  name: string;
  environment?: MudObject;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
}

export const name = ['skills', 'skill', 'spells', 'abilities'];
export const description = 'View your skills';
export const usage = 'skills [guild] | skill info <name> | skill available';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const parts = args.split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() || '';
  const remainder = parts.slice(1).join(' ');

  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;

  if (!subcommand) {
    // Show all learned skills
    showAllSkills(ctx, player, guildDaemon);
    return;
  }

  switch (subcommand) {
    case 'info':
      if (!remainder) {
        ctx.sendLine('{yellow}Usage: skill info <skill name>{/}');
        return;
      }
      showSkillInfo(ctx, player, guildDaemon, remainder);
      break;

    case 'available':
      showAvailableSkills(ctx, player, guildDaemon);
      break;

    default:
      // Check if it's a guild filter
      const guilds = guildDaemon.getAllGuilds();
      const matchedGuild = guilds.find(
        g => g.id === subcommand || g.name.toLowerCase().includes(subcommand)
      );

      if (matchedGuild) {
        showGuildSkills(ctx, player, guildDaemon, matchedGuild.id);
      } else {
        // Try as skill info
        showSkillInfo(ctx, player, guildDaemon, args);
      }
      break;
  }
}

/**
 * Show all learned skills.
 */
function showAllSkills(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>
): void {
  const playerSkills = guildDaemon.getPlayerSkills(player);

  if (playerSkills.length === 0) {
    ctx.sendLine('{dim}You have not learned any skills yet.{/}');
    ctx.sendLine('{dim}Join a guild and visit a guildmaster to learn skills.{/}');
    return;
  }

  ctx.sendLine('{bold}{cyan}=== Your Skills ==={/}');
  ctx.sendLine('');

  // Group by guild
  const byGuild = new Map<GuildId, Array<{ skill: SkillDefinition; level: number }>>();
  for (const ps of playerSkills) {
    const guildId = ps.skill.guild;
    if (!byGuild.has(guildId)) {
      byGuild.set(guildId, []);
    }
    byGuild.get(guildId)!.push(ps);
  }

  for (const [guildId, skills] of byGuild) {
    const guild = guildDaemon.getGuild(guildId);
    ctx.sendLine(`{bold}${guild?.name || guildId}{/}`);

    for (const { skill, level } of skills) {
      const typeColor = getTypeColor(skill.type);
      const cooldownInfo = getCooldownInfo(player, guildDaemon, skill.id);
      const levelBar = createLevelBar(level, skill.maxLevel);

      ctx.sendLine(`  {${typeColor}}${skill.name}{/} ${levelBar} ${cooldownInfo}`);
    }
    ctx.sendLine('');
  }

  ctx.sendLine('{dim}Use "skill info <name>" for details. Type a skill name to use it (e.g., "bash goblin").{/}');
}

/**
 * Show skills for a specific guild.
 */
function showGuildSkills(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>,
  guildId: GuildId
): void {
  const guild = guildDaemon.getGuild(guildId);
  if (!guild) {
    ctx.sendLine(`{red}Unknown guild: ${guildId}{/}`);
    return;
  }

  const allGuildSkills = guildDaemon.getGuildSkills(guildId);

  ctx.sendLine(`{bold}{cyan}=== ${guild.name} Skills ==={/}`);
  ctx.sendLine('');

  for (const skill of allGuildSkills) {
    const playerSkillLevel = guildDaemon.getSkillLevel(player, skill.id);
    const learned = playerSkillLevel > 0;
    const typeColor = getTypeColor(skill.type);

    if (learned) {
      const levelBar = createLevelBar(playerSkillLevel, skill.maxLevel);
      const cooldownInfo = getCooldownInfo(player, guildDaemon, skill.id);
      ctx.sendLine(`  {${typeColor}}${skill.name}{/} ${levelBar} ${cooldownInfo}`);
    } else {
      ctx.sendLine(`  {dim}${skill.name} (Level ${skill.guildLevelRequired}){/}`);
    }
  }

  ctx.sendLine('');
}

/**
 * Show skills available to learn.
 */
function showAvailableSkills(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>
): void {
  const available = guildDaemon.getAvailableSkills(player);

  if (available.length === 0) {
    ctx.sendLine('{dim}No new skills available to learn.{/}');
    ctx.sendLine('{dim}Advance your guild level or join a new guild.{/}');
    return;
  }

  ctx.sendLine('{bold}{cyan}=== Available Skills to Learn ==={/}');
  ctx.sendLine('');

  for (const skill of available) {
    const guild = guildDaemon.getGuild(skill.guild);
    const typeColor = getTypeColor(skill.type);
    ctx.sendLine(`  {${typeColor}}${skill.name}{/} {dim}(${guild?.name}, ${skill.learnCost} gold){/}`);
  }

  ctx.sendLine('');
  ctx.sendLine('{dim}Visit a guildmaster to learn skills.{/}');
}

/**
 * Show detailed info about a skill.
 */
function showSkillInfo(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>,
  skillName: string
): void {
  // Find skill by name
  const allSkills = Array.from(guildDaemon.getAllGuilds())
    .flatMap(g => guildDaemon.getGuildSkills(g.id));

  const skill = allSkills.find(
    s => s.id.toLowerCase() === skillName.toLowerCase() ||
         s.name.toLowerCase() === skillName.toLowerCase() ||
         s.name.toLowerCase().includes(skillName.toLowerCase())
  );

  if (!skill) {
    ctx.sendLine(`{red}No skill found matching "${skillName}".{/}`);
    return;
  }

  const guild = guildDaemon.getGuild(skill.guild);
  const playerLevel = guildDaemon.getSkillLevel(player, skill.id);
  const learned = playerLevel > 0;

  ctx.sendLine(`{bold}{cyan}=== ${skill.name} ==={/}`);
  ctx.sendLine('');
  ctx.sendLine(skill.description);
  ctx.sendLine('');

  // Type and targeting
  const typeColor = getTypeColor(skill.type);
  ctx.sendLine(`Type: {${typeColor}}${skill.type}{/}  |  Target: {dim}${skill.target}{/}`);
  ctx.sendLine(`Guild: {bold}${guild?.name}{/}  |  Required Level: {cyan}${skill.guildLevelRequired}{/}`);
  ctx.sendLine('');

  // Cost info
  if (skill.manaCost > 0) {
    ctx.sendLine(`Mana Cost: {blue}${skill.manaCost} MP{/}`);
  }
  if (skill.cooldown > 0) {
    ctx.sendLine(`Cooldown: {dim}${skill.cooldown / 1000} seconds{/}`);
  }

  ctx.sendLine('');

  // Effect info
  const effect = skill.effect;
  if (effect.baseMagnitude > 0) {
    const magAtLevel1 = effect.baseMagnitude;
    const magAtMax = effect.baseMagnitude + (effect.magnitudePerLevel * (skill.maxLevel - 1));
    const effectType = effect.healing ? 'Healing' : 'Damage';
    ctx.sendLine(`${effectType}: {green}${Math.round(magAtLevel1)}{/} at level 1, {green}${Math.round(magAtMax)}{/} at level ${skill.maxLevel}`);
  }
  if (effect.duration) {
    ctx.sendLine(`Duration: {dim}${effect.duration / 1000} seconds{/}`);
  }
  if (effect.statModifier) {
    ctx.sendLine(`Stat Bonus: {cyan}+${effect.baseMagnitude} ${effect.statModifier}{/} per level`);
  }

  ctx.sendLine('');

  // Prerequisites
  if (skill.prerequisites && skill.prerequisites.length > 0) {
    const prereqNames = skill.prerequisites.map(id => {
      const prereq = guildDaemon.getSkill(id);
      return prereq?.name || id;
    }).join(', ');
    ctx.sendLine(`Prerequisites: {yellow}${prereqNames}{/}`);
    ctx.sendLine('');
  }

  // Player's status with this skill
  if (learned) {
    const levelBar = createLevelBar(playerLevel, skill.maxLevel);
    ctx.sendLine(`Your Level: ${levelBar}`);

    const cooldownRemaining = guildDaemon.getCooldownRemaining(player, skill.id);
    if (cooldownRemaining > 0) {
      ctx.sendLine(`{yellow}On cooldown: ${cooldownRemaining} seconds remaining{/}`);
    }
  } else {
    ctx.sendLine(`{dim}You have not learned this skill.{/}`);
    ctx.sendLine(`Learn Cost: {yellow}${skill.learnCost} gold{/}`);
  }
}

/**
 * Get color for skill type.
 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'combat':
      return 'red';
    case 'buff':
      return 'green';
    case 'debuff':
      return 'magenta';
    case 'passive':
      return 'cyan';
    case 'utility':
      return 'yellow';
    case 'crafting':
      return 'blue';
    default:
      return 'white';
  }
}

/**
 * Create a visual level bar.
 */
function createLevelBar(level: number, maxLevel: number): string {
  const barLength = 10;
  const filled = Math.round((level / maxLevel) * barLength);
  const empty = barLength - filled;
  const bar = '{green}' + '\u2588'.repeat(filled) + '{/}{dim}' + '\u2591'.repeat(empty) + '{/}';
  return `[${bar}] {cyan}${level}{/}/${maxLevel}`;
}

/**
 * Get cooldown info string.
 */
function getCooldownInfo(
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>,
  skillId: string
): string {
  const remaining = guildDaemon.getCooldownRemaining(player, skillId);
  if (remaining > 0) {
    return `{yellow}(${remaining}s){/}`;
  }
  return '{green}[READY]{/}';
}

export default { name, description, usage, execute };
