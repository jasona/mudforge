/**
 * Guild command - View and manage guild memberships.
 *
 * Usage:
 *   guild                - Show your guild memberships
 *   guild list           - Show all available guilds
 *   guild info <name>    - Detailed guild info
 *   guild join <name>    - Join a guild (if you meet requirements)
 *   guild leave <name>   - Leave a guild (requires confirmation)
 */

import type { MudObject } from '../../lib/std.js';
import { getGuildDaemon } from '../../daemons/guild.js';
import { type GuildId, GUILD_CONSTANTS, getGuildXPRequired } from '../../std/guild/types.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface GuildPlayer extends MudObject {
  name: string;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
}

export const name = ['guild', 'guilds'];
export const description = 'View and manage guild memberships';
export const usage = 'guild [list|info <name>|join <name>|leave <name>]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();
  const parts = args.split(/\s+/);
  const subcommand = parts[0] || '';
  const guildArg = parts.slice(1).join(' ');

  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;

  if (!subcommand) {
    // Show player's guild memberships
    showMemberships(ctx, player, guildDaemon);
    return;
  }

  switch (subcommand) {
    case 'list':
      showGuildList(ctx, guildDaemon);
      break;

    case 'info':
      if (!guildArg) {
        ctx.sendLine('{yellow}Usage: guild info <guild name>{/}');
        return;
      }
      showGuildInfo(ctx, player, guildDaemon, guildArg);
      break;

    case 'leave':
      if (!guildArg) {
        ctx.sendLine('{yellow}Usage: guild leave <guild name>{/}');
        return;
      }
      handleLeaveGuild(ctx, player, guildDaemon, guildArg);
      break;

    case 'join':
      if (!guildArg) {
        ctx.sendLine('{yellow}Usage: guild join <guild name>{/}');
        return;
      }
      handleJoinGuild(ctx, player, guildDaemon, guildArg);
      break;

    default:
      // Maybe they're trying to get info on a guild by name
      showGuildInfo(ctx, player, guildDaemon, subcommand);
      break;
  }
}

/**
 * Show player's current guild memberships.
 */
function showMemberships(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>
): void {
  const data = guildDaemon.getPlayerGuildData(player);

  if (data.guilds.length === 0) {
    ctx.sendLine('{dim}You are not a member of any guilds.{/}');
    ctx.sendLine('{dim}Use "guild list" to see available guilds.{/}');
    return;
  }

  ctx.sendLine('{bold}{cyan}=== Your Guild Memberships ==={/}');
  ctx.sendLine('');

  for (const membership of data.guilds) {
    const guild = guildDaemon.getGuild(membership.guildId);
    if (!guild) continue;

    const xpRequired = getGuildXPRequired(membership.guildLevel);
    const xpProgress = membership.guildLevel >= GUILD_CONSTANTS.MAX_GUILD_LEVEL
      ? '{green}MAX{/}'
      : `${membership.guildXP}/${xpRequired}`;

    ctx.sendLine(`{bold}${guild.name}{/}`);
    ctx.sendLine(`  Level: {cyan}${membership.guildLevel}{/}/${GUILD_CONSTANTS.MAX_GUILD_LEVEL}  |  XP: ${xpProgress}`);

    // Show skills count
    const guildSkills = data.skills.filter(s => {
      const skill = guildDaemon.getSkill(s.skillId);
      return skill && skill.guild === membership.guildId;
    });
    ctx.sendLine(`  Skills learned: {cyan}${guildSkills.length}{/}`);
    ctx.sendLine('');
  }

  ctx.sendLine(`{dim}Guild slots: ${data.guilds.length}/${GUILD_CONSTANTS.MAX_GUILDS}{/}`);
}

/**
 * Show list of all available guilds.
 */
function showGuildList(
  ctx: CommandContext,
  guildDaemon: ReturnType<typeof getGuildDaemon>
): void {
  const guilds = guildDaemon.getAllGuilds();

  if (guilds.length === 0) {
    ctx.sendLine('{dim}No guilds are currently available.{/}');
    return;
  }

  ctx.sendLine('{bold}{cyan}=== Available Guilds ==={/}');
  ctx.sendLine('');

  for (const guild of guilds) {
    const stats = guild.primaryStats.map(s => s.toUpperCase().slice(0, 3)).join('/');
    ctx.sendLine(`{bold}${guild.name}{/} {dim}(${stats}){/}`);
    ctx.sendLine(`  {dim}${guild.motto || guild.description.slice(0, 60)}...{/}`);
    ctx.sendLine('');
  }

  ctx.sendLine('{dim}Use "guild info <name>" for detailed information.{/}');
}

/**
 * Show detailed info about a specific guild.
 */
function showGuildInfo(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>,
  guildName: string
): void {
  // Find guild by name or ID
  const guilds = guildDaemon.getAllGuilds();
  const guild = guilds.find(
    g => g.id === guildName || g.name.toLowerCase().includes(guildName.toLowerCase())
  );

  if (!guild) {
    ctx.sendLine(`{red}No guild found matching "${guildName}".{/}`);
    ctx.sendLine('{dim}Use "guild list" to see available guilds.{/}');
    return;
  }

  ctx.sendLine(`{bold}{cyan}=== ${guild.name} ==={/}`);
  ctx.sendLine('');
  ctx.sendLine(guild.description);
  ctx.sendLine('');

  if (guild.motto) {
    ctx.sendLine(`{dim}"${guild.motto}"{/}`);
    ctx.sendLine('');
  }

  // Primary stats
  const stats = guild.primaryStats.map(s => {
    const name = s.charAt(0).toUpperCase() + s.slice(1);
    return `{cyan}${name}{/}`;
  }).join(', ');
  ctx.sendLine(`Primary Stats: ${stats}`);

  // Requirements
  if (guild.statRequirements && Object.keys(guild.statRequirements).length > 0) {
    const reqs = Object.entries(guild.statRequirements)
      .map(([stat, value]) => `${stat.charAt(0).toUpperCase() + stat.slice(1)} ${value}+`)
      .join(', ');
    ctx.sendLine(`Requirements: {yellow}${reqs}{/}`);
  }

  // Opposing guilds
  if (guild.opposingGuilds && guild.opposingGuilds.length > 0) {
    const opposing = guild.opposingGuilds.map(id => {
      const g = guildDaemon.getGuild(id);
      return g?.name || id;
    }).join(', ');
    ctx.sendLine(`Cannot join with: {red}${opposing}{/}`);
  }

  ctx.sendLine('');

  // Skill tree
  ctx.sendLine('{bold}Skill Tree:{/}');
  for (const tier of guild.skillTree) {
    const skillNames = tier.skills.map(skillId => {
      const skill = guildDaemon.getSkill(skillId);
      return skill?.name || skillId;
    }).join(', ');
    ctx.sendLine(`  Level ${tier.guildLevel}: {dim}${skillNames}{/}`);
  }

  ctx.sendLine('');

  // Check if player is a member
  const isMember = guildDaemon.isMember(player, guild.id);
  if (isMember) {
    const membership = guildDaemon.getMembership(player, guild.id);
    ctx.sendLine(`{green}You are a level ${membership?.guildLevel} member of this guild.{/}`);
  } else {
    const canJoin = guildDaemon.canJoinGuild(player, guild.id);
    if (canJoin.canJoin) {
      ctx.sendLine('{dim}Visit a guildmaster to join this guild.{/}');
    } else {
      ctx.sendLine(`{yellow}${canJoin.reason}{/}`);
    }
  }
}

/**
 * Handle leaving a guild.
 */
function handleLeaveGuild(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>,
  guildName: string
): void {
  // Find guild by name or ID
  const guilds = guildDaemon.getAllGuilds();
  const guild = guilds.find(
    g => g.id === guildName || g.name.toLowerCase().includes(guildName.toLowerCase())
  );

  if (!guild) {
    ctx.sendLine(`{red}No guild found matching "${guildName}".{/}`);
    return;
  }

  // Check for confirmation
  const lastLeaveAttempt = player.getProperty('lastGuildLeaveAttempt') as { guildId: string; time: number } | undefined;
  const now = Date.now();

  if (lastLeaveAttempt && lastLeaveAttempt.guildId === guild.id && (now - lastLeaveAttempt.time) < 30000) {
    // Confirmed - do the leave
    const result = guildDaemon.leaveGuild(player, guild.id);

    if (result.success) {
      ctx.sendLine(`{yellow}${result.message}{/}`);
    } else {
      ctx.sendLine(`{red}${result.message}{/}`);
    }

    player.setProperty('lastGuildLeaveAttempt', null);
    return;
  }

  // First attempt - ask for confirmation
  const membership = guildDaemon.getMembership(player, guild.id);
  if (!membership) {
    ctx.sendLine(`{red}You are not a member of the ${guild.name}.{/}`);
    return;
  }

  // Count skills that will be lost
  const data = guildDaemon.getPlayerGuildData(player);
  const skillsToLose = data.skills.filter(s => {
    const skill = guildDaemon.getSkill(s.skillId);
    return skill && skill.guild === guild.id;
  });

  ctx.sendLine(`{yellow}WARNING: You are about to leave the ${guild.name}.{/}`);
  ctx.sendLine(`  - You are level {cyan}${membership.guildLevel}{/} in this guild.`);
  ctx.sendLine(`  - You will lose {red}${skillsToLose.length}{/} skills.`);
  ctx.sendLine(`  - All progress will be lost if you rejoin later.`);
  ctx.sendLine('');
  ctx.sendLine('{bold}Type "guild leave ' + guild.id + '" again within 30 seconds to confirm.{/}');

  player.setProperty('lastGuildLeaveAttempt', { guildId: guild.id, time: now });
}

/**
 * Handle joining a guild.
 */
function handleJoinGuild(
  ctx: CommandContext,
  player: GuildPlayer,
  guildDaemon: ReturnType<typeof getGuildDaemon>,
  guildName: string
): void {
  // Find guild by name or ID
  const guilds = guildDaemon.getAllGuilds();
  const guild = guilds.find(
    g => g.id === guildName || g.name.toLowerCase().includes(guildName.toLowerCase())
  );

  if (!guild) {
    ctx.sendLine(`{red}No guild found matching "${guildName}".{/}`);
    ctx.sendLine('{dim}Use "guild list" to see available guilds.{/}');
    return;
  }

  // Check if already a member
  if (guildDaemon.isMember(player, guild.id)) {
    ctx.sendLine(`{yellow}You are already a member of the ${guild.name}.{/}`);
    return;
  }

  // Try to join
  const result = guildDaemon.joinGuild(player, guild.id);

  if (result.success) {
    ctx.sendLine(`{bold}{green}${result.message}{/}`);
    ctx.sendLine('');
    ctx.sendLine(`{dim}Use "skills" to see your available skills.{/}`);
    ctx.sendLine(`{dim}Use "guild info ${guild.id}" to learn more about your new guild.{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

export default { name, description, usage, execute };
