/**
 * Arcane Knowledge - Mage passive skill.
 * Passive mastery of arcane lore increases intelligence.
 */

import type { MudObject } from '../../../lib/std.js';
import type { Living } from '../../../std/living.js';
import { getGuildDaemon } from '../../../daemons/guild.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface GuildPlayer extends Living {
  name: string;
  getProperty(key: string): unknown;
}

export const name = ['arcane_knowledge', 'arcaneknowledge', 'ak'];
export const description = 'View your Arcane Knowledge passive skill status';
export const usage = 'arcane_knowledge';

export async function execute(ctx: CommandContext): Promise<void> {
  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;
  const skillId = 'mage:arcane_knowledge';

  if (!guildDaemon.hasSkill(player, skillId)) {
    ctx.sendLine('{yellow}You have not learned Arcane Knowledge yet.{/}');
    return;
  }

  const skill = guildDaemon.getSkill(skillId);
  const level = guildDaemon.getSkillLevel(player, skillId);

  if (!skill) {
    ctx.sendLine('{red}Skill not found.{/}');
    return;
  }

  const bonus = Math.floor(skill.effect.baseMagnitude + (skill.effect.magnitudePerLevel * (level - 1)));

  ctx.sendLine('{bold}{cyan}=== Arcane Knowledge ==={/}');
  ctx.sendLine('');
  ctx.sendLine(skill.description);
  ctx.sendLine('');
  ctx.sendLine(`Skill Level: {green}${level}{/}/${skill.maxLevel}`);
  ctx.sendLine(`Current Bonus: {cyan}+${bonus} Intelligence{/}`);
  ctx.sendLine('');
  ctx.sendLine('{dim}This is a passive skill and is always active.{/}');
}

export default { name, description, usage, execute };
