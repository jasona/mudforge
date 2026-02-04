/**
 * Berserker Rage - Fighter buff skill.
 * Enter a berserker rage, greatly increasing damage but reducing defense.
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
  setProperty(key: string, value: unknown): void;
}

export const name = ['berserker_rage', 'berserkerrage', 'berserk', 'rage'];
export const description = 'Enter a berserker rage, increasing damage';
export const usage = 'berserker_rage';

export async function execute(ctx: CommandContext): Promise<void> {
  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;
  const skillId = 'fighter:berserker_rage';

  if (!guildDaemon.hasSkill(player, skillId)) {
    ctx.sendLine('{yellow}You have not learned Berserker Rage yet.{/}');
    return;
  }

  const result = guildDaemon.useSkill(player, skillId);

  if (result.success) {
    ctx.send(result.message);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

export default { name, description, usage, execute };
