/**
 * train - Train with a trainer NPC to level up or improve stats.
 *
 * Usage:
 *   train                  - Show training options from a trainer in the room
 *   train level            - Train to level up (costs XP)
 *   train <stat>           - Train a specific stat (costs XP)
 *
 * Stats that can be trained:
 *   strength, intelligence, wisdom, charisma, dexterity, constitution, luck
 *   (or short forms: str, int, wis, cha, dex, con, luk)
 *
 * Notes:
 *   - You must be in the same room as a trainer
 *   - Stats cannot exceed your current level (unless builder+)
 *   - Stat training costs increase exponentially as stats get higher
 *
 * Examples:
 *   train                  - See what training is available
 *   train level            - Level up if you have enough XP
 *   train strength         - Increase strength by 1
 *   train str              - Same as above (short form)
 */

import type { MudObject } from '../../lib/std.js';
import type { StatName } from '../../std/living.js';
import { isTrainer, ALL_STATS } from '../../std/trainer.js';
import type { Trainer } from '../../std/trainer.js';

interface CommandContext {
  player: MudObject & {
    environment?: MudObject & { inventory?: MudObject[] };
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'train';
export const description = 'Train with a trainer to level up or improve stats';
export const usage = 'train [level|<stat>]';

/**
 * Map short stat names to full names.
 */
const STAT_ALIASES: Record<string, StatName> = {
  str: 'strength',
  strength: 'strength',
  int: 'intelligence',
  intelligence: 'intelligence',
  wis: 'wisdom',
  wisdom: 'wisdom',
  cha: 'charisma',
  charisma: 'charisma',
  dex: 'dexterity',
  dexterity: 'dexterity',
  con: 'constitution',
  constitution: 'constitution',
  luk: 'luck',
  luck: 'luck',
};

/**
 * Find a trainer in the player's current room.
 */
function findTrainer(player: MudObject): Trainer | null {
  const room = (player as MudObject & { environment?: MudObject }).environment;
  if (!room) return null;

  const inventory = (room as MudObject & { inventory?: MudObject[] }).inventory;
  if (!inventory) return null;

  for (const obj of inventory) {
    if (isTrainer(obj)) {
      return obj;
    }
  }

  return null;
}

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  // Find a trainer in the room
  const trainer = findTrainer(ctx.player);
  if (!trainer) {
    ctx.sendLine("{yellow}There is no trainer here.{/}");
    ctx.sendLine("{dim}Find a trainer NPC to train your stats or level.{/}");
    return;
  }

  // No args - show training options
  if (!args) {
    trainer.showTrainingOptions(ctx.player);
    return;
  }

  // Train level
  if (args === 'level' || args === 'lvl') {
    trainer.trainLevel(ctx.player);
    return;
  }

  // Train a stat
  const stat = STAT_ALIASES[args];
  if (stat) {
    trainer.trainStat(ctx.player, stat);
    return;
  }

  // Unknown argument
  ctx.sendLine(`{yellow}Unknown training option: ${args}{/}`);
  ctx.sendLine("{dim}Use 'train' to see available options, or 'train <stat>' to train a specific stat.{/}");
  ctx.sendLine(`{dim}Valid stats: ${ALL_STATS.join(', ')}{/}`);
}

export default { name, description, usage, execute };
