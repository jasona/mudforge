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
import { parseItemInput, findItem, countMatching } from '../../lib/item-utils.js';

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
export const usage = 'bury [corpse] | bury corpse 2 | bury all';

/**
 * Calculate gold reward for burying a corpse.
 * Formula: 1 + floor(level / 5), capped at 5 gold
 */
function calculateBuryReward(corpseLevel: number): number {
  return Math.min(5, 1 + Math.floor(corpseLevel / 5));
}

/**
 * Find all corpses in a list of objects.
 */
function getCorpses(items: MudObject[]): Corpse[] {
  return items.filter((item): item is Corpse => item instanceof Corpse);
}

/**
 * Bury a single corpse: drop items, give reward, destroy.
 * Returns the reward amount, or -1 if it was a player corpse (skipped).
 */
async function buryOne(
  corpse: Corpse,
  player: MudObject,
  room: MudObject,
  ctx: CommandContext
): Promise<number> {
  if (corpse.isPlayerCorpse) return -1;

  const reward = calculateBuryReward(corpse.level);

  // Give gold
  const playerWithGold = player as PlayerWithGold;
  if (playerWithGold.addGold) {
    playerWithGold.addGold(reward);
  } else {
    playerWithGold.gold = (playerWithGold.gold || 0) + reward;
  }

  const corpseDesc = corpse.shortDesc;
  const corpseName = corpse.ownerName;

  // Drop items from the corpse
  const droppedItems: string[] = [];
  const items = [...corpse.inventory];
  for (const item of items) {
    await item.moveTo(room);
    droppedItems.push(item.shortDesc);
  }

  // Drop gold from the corpse
  const droppedGold = corpse.gold;
  if (droppedGold > 0) {
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      try {
        const goldPile = await efuns.cloneObject('/std/gold-pile');
        if (goldPile && 'amount' in goldPile) {
          (goldPile as MudObject & { amount: number }).amount = droppedGold;
          await goldPile.moveTo(room);
        }
      } catch {
        // Gold pile creation failed
      }
    }
    corpse.gold = 0;
  }

  // Destroy corpse
  if (typeof efuns !== 'undefined' && efuns.destruct) {
    await efuns.destruct(corpse);
  }

  // Messages
  ctx.sendLine(`You dig a shallow grave and bury ${corpseDesc}.`);

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

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} buries the remains of ${corpseName}.\n`);
    }
  }

  return reward;
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return;
  }

  const targetName = args.trim() || 'corpse';
  const parsed = parseItemInput(targetName);

  // Handle "bury all" — bury all NPC corpses in the room
  if (parsed.isAll || parsed.isAllOfType) {
    const corpses = getCorpses(room.inventory);
    const buryable = corpses.filter((c) => !c.isPlayerCorpse);
    if (buryable.length === 0) {
      ctx.sendLine("You don't see any corpses to bury here.");
      return;
    }

    let totalReward = 0;
    for (const corpse of buryable) {
      const reward = await buryOne(corpse, player, room, ctx);
      if (reward > 0) totalReward += reward;
    }

    if (totalReward > 0) {
      ctx.sendLine(`{yellow}The gods reward your piety with ${totalReward} gold coin${totalReward !== 1 ? 's' : ''} total.{/}`);
    }
    return;
  }

  // Find corpse with optional index (e.g., "corpse 2")
  const item = findItem(parsed.name, room.inventory, parsed.index);

  if (!item || !(item instanceof Corpse)) {
    // Give helpful message if index was out of range
    if (parsed.index !== undefined) {
      const count = countMatching(parsed.name, room.inventory);
      if (count > 0) {
        if (count === 1) {
          ctx.sendLine(`There is only 1 ${parsed.name} here.`);
        } else {
          ctx.sendLine(`There are only ${count} ${parsed.name}s here.`);
        }
        return;
      }
    }
    ctx.sendLine("You don't see any corpse to bury here.");
    return;
  }

  const corpse = item as Corpse;

  if (corpse.isPlayerCorpse) {
    ctx.sendLine("You cannot bury a player's corpse. They may need it for resurrection!");
    return;
  }

  const reward = await buryOne(corpse, player, room, ctx);
  if (reward > 0) {
    ctx.sendLine(`{yellow}The gods reward your piety with ${reward} gold coin${reward !== 1 ? 's' : ''}.{/}`);
  }
}

export default { name, description, usage, execute };
