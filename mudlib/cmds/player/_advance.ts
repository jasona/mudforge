/**
 * Advance command - Advance guild level or skill level.
 *
 * Usage:
 *   advance               - Show advancement options
 *   advance <guild>       - Advance guild level
 *   advance <skill>       - Advance skill level
 */

import type { MudObject } from '../../lib/std.js';
import { getGuildDaemon } from '../../daemons/guild.js';
import { GUILD_CONSTANTS, getGuildXPRequired, getSkillXPRequired, getSkillUsageXPRequired } from '../../std/guild/types.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface GuildPlayer extends MudObject {
  name: string;
  experience?: number;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
}

export const name = 'advance';
export const description = 'Advance guild level or skill level';
export const usage = 'advance [<guild name>|<skill name>]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;

  if (!args) {
    // Show advancement options
    showAdvancementOptions(ctx, player, guildDaemon);
    return;
  }

  // Try to match as guild first
  const guilds = guildDaemon.getAllGuilds();
  const matchedGuild = guilds.find(
    g => g.id === args.toLowerCase() ||
         g.name.toLowerCase().includes(args.toLowerCase())
  );

  if (matchedGuild) {
    // Check if player is a member
    if (!guildDaemon.isMember(player, matchedGuild.id)) {
      ctx.sendLine(`{red}You are not a member of the ${matchedGuild.name}.{/}`);
      return;
    }

    // Try to advance guild level
    const result = guildDaemon.advanceGuildLevel(player, matchedGuild.id);
    if (result.success) {
      ctx.sendLine(`{green}${result.message}{/}`);
    } else {
      ctx.sendLine(`{yellow}${result.message}{/}`);
    }
    return;
  }

  // Try to match as skill
  const playerSkills = guildDaemon.getPlayerSkills(player);
  const matchedSkill = playerSkills.find(
    ps => ps.skill.id.toLowerCase() === args.toLowerCase() ||
          ps.skill.name.toLowerCase() === args.toLowerCase() ||
          ps.skill.name.toLowerCase().includes(args.toLowerCase())
  );

  if (matchedSkill) {
    const result = guildDaemon.advanceSkill(player, matchedSkill.skill.id);
    if (result.success) {
      ctx.sendLine(`{green}${result.message}{/}`);
    } else {
      ctx.sendLine(`{yellow}${result.message}{/}`);
    }
    return;
  }

  ctx.sendLine(`{red}No guild or skill found matching "${args}".{/}`);
  ctx.sendLine('{dim}Use "advance" with no arguments to see options.{/}');
}

/**
 * Show all advancement options.
 */
function showAdvancementOptions(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>
): void {
  const data = guildDaemon.getPlayerGuildData(player);
  const playerXP = player.experience ?? 0;

  if (data.guilds.length === 0 && data.skills.length === 0) {
    ctx.sendLine('{dim}You have no guilds or skills to advance.{/}');
    ctx.sendLine('{dim}Join a guild and learn some skills first!{/}');
    return;
  }

  ctx.sendLine('{bold}{cyan}=== Advancement Options ==={/}');
  ctx.sendLine('');
  ctx.sendLine(`Your XP: {bold}{green}${playerXP}{/}`);
  ctx.sendLine('');

  // Show guild advancement options
  if (data.guilds.length > 0) {
    ctx.sendLine('{bold}Guild Advancement:{/}');

    for (const membership of data.guilds) {
      const guild = guildDaemon.getGuild(membership.guildId);
      if (!guild) continue;

      if (membership.guildLevel >= GUILD_CONSTANTS.MAX_GUILD_LEVEL) {
        ctx.sendLine(`  ${guild.name}: {green}MAX LEVEL{/}`);
        continue;
      }

      const xpRequired = getGuildXPRequired(membership.guildLevel);
      const canAdvance = membership.guildXP >= xpRequired;
      const status = canAdvance
        ? '{green}[READY]{/}'
        : `{dim}${membership.guildXP}/${xpRequired} Guild XP{/}`;

      ctx.sendLine(`  {bold}${guild.name}{/} Lv ${membership.guildLevel} -> ${membership.guildLevel + 1}: ${status}`);

      if (canAdvance) {
        ctx.sendLine(`    {dim}Type "advance ${guild.id}" to advance{/}`);
      }
    }
    ctx.sendLine('');
  }

  // Show skill advancement options
  if (data.skills.length > 0) {
    ctx.sendLine('{bold}Skill Advancement:{/}');
    ctx.sendLine('{dim}(Skills can be advanced with XP or improved through usage){/}');
    ctx.sendLine('');

    // Group by whether they can be advanced
    const canAdvanceNow: Array<{ name: string; id: string; level: number; maxLevel: number; xpCost: number; usageXP: number; usageXPRequired: number }> = [];
    const needsXP: Array<{ name: string; level: number; maxLevel: number; xpCost: number; currentXP: number; usageXP: number; usageXPRequired: number }> = [];

    for (const playerSkill of data.skills) {
      const skill = guildDaemon.getSkill(playerSkill.skillId);
      if (!skill) continue;

      if (playerSkill.level >= skill.maxLevel) continue;

      const xpCost = getSkillXPRequired(playerSkill.level, skill.advanceCostPerLevel);
      const usageXP = playerSkill.usageXP ?? 0;
      const usageXPRequired = getSkillUsageXPRequired(playerSkill.level, skill.advanceCostPerLevel);

      if (playerXP >= xpCost) {
        canAdvanceNow.push({
          name: skill.name,
          id: skill.id,
          level: playerSkill.level,
          maxLevel: skill.maxLevel,
          xpCost,
          usageXP,
          usageXPRequired,
        });
      } else {
        needsXP.push({
          name: skill.name,
          level: playerSkill.level,
          maxLevel: skill.maxLevel,
          xpCost,
          currentXP: playerXP,
          usageXP,
          usageXPRequired,
        });
      }
    }

    // Show skills ready to advance
    if (canAdvanceNow.length > 0) {
      ctx.sendLine('  {green}Ready to advance (with XP):{/}');
      for (const skill of canAdvanceNow.slice(0, 5)) {
        const usageProgress = `{yellow}${skill.usageXP}/${skill.usageXPRequired}{/}`;
        ctx.sendLine(`    {bold}${skill.name}{/} ${skill.level} -> ${skill.level + 1} ({yellow}${skill.xpCost} XP{/}) | Usage: ${usageProgress}`);
      }
      if (canAdvanceNow.length > 5) {
        ctx.sendLine(`    {dim}...and ${canAdvanceNow.length - 5} more{/}`);
      }
      ctx.sendLine('');
    }

    // Show skills needing more XP
    if (needsXP.length > 0 && canAdvanceNow.length < 3) {
      ctx.sendLine('  {dim}Need more XP (or use skill to level up):{/}');
      for (const skill of needsXP.slice(0, 3)) {
        const needed = skill.xpCost - skill.currentXP;
        const usageProgress = `${skill.usageXP}/${skill.usageXPRequired}`;
        ctx.sendLine(`    {dim}${skill.name} ${skill.level} -> ${skill.level + 1} (need ${needed} XP) | Usage: ${usageProgress}{/}`);
      }
      ctx.sendLine('');
    }
  }

  ctx.sendLine('{dim}Type "advance <name>" to spend XP to advance a skill instantly.{/}');
  ctx.sendLine('{dim}Skills also level up automatically through use!{/}');
}

export default { name, description, usage, execute };
