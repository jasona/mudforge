/**
 * Poison Blade - Thief buff skill.
 * Coat your weapon in deadly poison.
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

export const name = ['poison_blade', 'poisonblade', 'pb', 'envenom'];
export const description = 'Coat your weapon in deadly poison';
export const usage = 'poison_blade';

export async function execute(ctx: CommandContext): Promise<void> {
  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;
  const skillId = 'thief:poison_blade';

  if (!guildDaemon.hasSkill(player, skillId)) {
    ctx.sendLine('{yellow}You have not learned Poison Blade yet.{/}');
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
