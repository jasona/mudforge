/**
 * Heal - Cleric combat skill.
 * Restore health to a target.
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

export const name = ['heal'];
export const description = 'Restore health to a target';
export const usage = 'heal [target]';

export async function execute(ctx: CommandContext): Promise<void> {
  const guildDaemon = getGuildDaemon();
  const player = ctx.player as GuildPlayer;
  const skillId = 'cleric:heal';

  if (!guildDaemon.hasSkill(player, skillId)) {
    ctx.sendLine('{yellow}You have not learned Heal yet.{/}');
    return;
  }

  // Find target from args or self
  let target: Living | undefined;
  const targetName = ctx.args.trim();

  if (targetName) {
    const room = player.environment;
    if (room && 'inventory' in room) {
      const inventory = (room as MudObject & { inventory: MudObject[] }).inventory;
      const found = inventory.find(obj => {
        const living = obj as Living & { name?: string; shortDesc?: string };
        const name = living.name?.toLowerCase() || living.shortDesc?.toLowerCase() || '';
        return name.includes(targetName.toLowerCase());
      });
      if (found && 'health' in found) {
        target = found as Living;
      }
    }
    if (!target) {
      ctx.sendLine(`{red}Cannot find "${targetName}" here.{/}`);
      return;
    }
  } else {
    // Default to self
    target = player;
  }

  const result = guildDaemon.useSkill(player, skillId, target);

  if (result.success) {
    ctx.send(result.message);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

export default { name, description, usage, execute };
