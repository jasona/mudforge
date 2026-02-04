/**
 * Meteor Storm - Mage combat skill.
 * Calls down a devastating rain of meteors upon all enemies.
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
  environment?: MudObject;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
}

export const name = ['meteor_storm', 'meteorstorm', 'meteor'];
export const description = 'Calls down a devastating rain of meteors';
export const usage = 'meteor_storm';

export async function execute(ctx: CommandContext): Promise<void> {
  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;
  const skillId = 'mage:meteor_storm';

  if (!guildDaemon.hasSkill(player, skillId)) {
    ctx.sendLine('{yellow}You have not learned Meteor Storm yet.{/}');
    return;
  }

  // Room-wide skill - get any target in room for the skill check
  let target: Living | undefined;
  const room = player.environment;
  if (room && 'inventory' in room) {
    const inventory = (room as MudObject & { inventory: MudObject[] }).inventory;
    const found = inventory.find(obj =>
      obj !== player && 'health' in obj && (obj as Living).alive
    );
    if (found) {
      target = found as Living;
    }
  }

  const result = guildDaemon.useSkill(player, skillId, target);

  if (result.success) {
    ctx.send(result.message);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

export default { name, description, usage, execute };
