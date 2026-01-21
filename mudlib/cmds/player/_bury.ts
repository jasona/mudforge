/**
 * Bury command - Bury a corpse for a small gold reward.
 *
 * This helps new players earn coins from low-level monsters that
 * don't drop gold, but doesn't scale well for higher-level play.
 *
 * Formula: 1 + floor(corpseLevel / 5) gold, capped at 5g
 *
 * Usage:
 *   bury corpse              - Bury a corpse in the room
 *   bury <corpse name>       - Bury a specific corpse
 */

import type { MudObject } from '../../lib/std.js';
import { Corpse } from '../../std/corpse.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerWithGold extends MudObject {
  gold?: number;
  addGold?(amount: number): void;
}

export const name = 'bury';
export const description = 'Bury a corpse for a small gold reward';
export const usage = 'bury <corpse>';

/**
 * Calculate gold reward for burying a corpse.
 * Formula: 1 + floor(level / 5), capped at 5 gold
 */
function calculateBuryReward(corpseLevel: number): number {
  return Math.min(5, 1 + Math.floor(corpseLevel / 5));
}

/**
 * Find a corpse in the room by name.
 */
function findCorpse(name: string, items: MudObject[]): Corpse | undefined {
  const lowerName = name.toLowerCase();
  for (const item of items) {
    if (item instanceof Corpse && item.id(lowerName)) {
      return item;
    }
  }
  return undefined;
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return;
  }

  // Default to "corpse" if no argument given
  const targetName = args.trim() || 'corpse';

  // Find the corpse in the room
  const corpse = findCorpse(targetName, room.inventory);

  if (!corpse) {
    ctx.sendLine("You don't see any corpse to bury here.");
    return;
  }

  // Cannot bury player corpses
  if (corpse.isPlayerCorpse) {
    ctx.sendLine("You cannot bury a player's corpse. They may need it for resurrection!");
    return;
  }

  // Calculate reward
  const reward = calculateBuryReward(corpse.level);

  // Give gold to player
  const playerWithGold = player as PlayerWithGold;
  if (playerWithGold.addGold) {
    playerWithGold.addGold(reward);
  } else {
    playerWithGold.gold = (playerWithGold.gold || 0) + reward;
  }

  // Store corpse info for messages before destroying
  const corpseDesc = corpse.shortDesc;
  const corpseName = corpse.ownerName;

  // Drop any items from the corpse onto the ground
  const droppedItems: string[] = [];
  const items = [...corpse.inventory];
  for (const item of items) {
    await item.moveTo(room);
    droppedItems.push(item.shortDesc);
  }

  // Drop any gold from the corpse onto the ground
  const droppedGold = corpse.gold;
  if (droppedGold > 0) {
    // Create a gold pile in the room
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      try {
        const goldPile = await efuns.cloneObject('/std/gold-pile');
        if (goldPile && 'amount' in goldPile) {
          (goldPile as MudObject & { amount: number }).amount = droppedGold;
          await goldPile.moveTo(room);
        }
      } catch {
        // If gold pile creation fails, just note it
      }
    }
    corpse.gold = 0;
  }

  // Destroy the corpse
  if (typeof efuns !== 'undefined' && efuns.destruct) {
    await efuns.destruct(corpse);
  }

  // Send messages
  ctx.sendLine(`You dig a shallow grave and bury ${corpseDesc}.`);

  // Notify about dropped items
  if (droppedItems.length > 0 || droppedGold > 0) {
    const dropped: string[] = [...droppedItems];
    if (droppedGold > 0) {
      dropped.push(`{yellow}${droppedGold} gold coin${droppedGold !== 1 ? 's' : ''}{/}`);
    }
    if (dropped.length === 1) {
      ctx.sendLine(`${dropped[0]} falls to the ground.`);
    } else {
      ctx.sendLine('The following items fall to the ground:');
      for (const desc of dropped) {
        ctx.sendLine(`  ${desc}`);
      }
    }
  }

  ctx.sendLine(`{yellow}The gods reward your piety with ${reward} gold coin${reward !== 1 ? 's' : ''}.{/}`);

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} buries the remains of ${corpseName}.\n`);
    }
  }
}

export default { name, description, usage, execute };
