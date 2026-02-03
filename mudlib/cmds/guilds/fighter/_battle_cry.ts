/**
 * Battle Cry - Fighter buff skill.
 * A fearsome war cry that increases damage.
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

export const name = ['battle_cry', 'battlecry', 'bc'];
export const description = 'A fearsome war cry that increases damage';
export const usage = 'battle_cry';

export async function execute(ctx: CommandContext): Promise<void> {
  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;
  const skillId = 'fighter:battle_cry';

  if (!guildDaemon.hasSkill(player, skillId)) {
    ctx.sendLine('{yellow}You have not learned Battle Cry yet.{/}');
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
