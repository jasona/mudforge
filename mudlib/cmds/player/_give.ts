/**
 * Give command - Give items or gold to other players or NPCs.
 *
 * Usage:
 *   give <item> to <target>            - Give an item to someone
 *   give <item> <number> to <target>   - Give the Nth matching item (e.g., "give sword 2 to bob")
 *   give all to <target>               - Give all non-equipped items
 *   give all <item> to <target>        - Give all matching items (e.g., "give all sword to bob")
 *   give <amount> gold to <target>     - Give gold coins to someone
 *   give gold to <target>              - Give all your gold to someone
 */

import type { MudObject, Living, Weapon, Armor } from '../../lib/std.js';
import { Item } from '../../lib/std.js';
import { parseItemInput, findItem, findAllMatching, countMatching, unequipIfNeeded } from '../../lib/item-utils.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface LivingWithGold extends Living {
  gold: number;
  addGold?(amount: number): void;
  spendGold?(amount: number): boolean;
}

export const name = ['give'];
export const description = 'Give items or gold to another player or NPC';
export const usage = 'give <item> to <target> | give all to <target> | give [amount] gold to <target>';

/**
 * Find a living target by name in the room.
 */
function findTarget(name: string, room: MudObject, excludePlayer: MudObject): Living | undefined {
  const lowerName = name.toLowerCase();
  for (const obj of room.inventory) {
    if (obj === excludePlayer) continue;
    // Check if it's a living being (has health/receive method)
    if ('health' in obj && 'receive' in obj) {
      if (obj.id(lowerName)) {
        return obj as Living;
      }
    }
  }
  return undefined;
}

/**
 * Check if an item can be given (similar to drop check).
 * Quest delivery items can be given to the correct NPC target.
 */
async function canGive(
  item: MudObject,
  giver: MudObject,
  target: MudObject
): Promise<{ canGive: boolean; reason?: string; isQuestDelivery?: boolean }> {
  if (item instanceof Item) {
    if (!item.dropable) {
      // Check if this is a quest delivery to the correct NPC
      const giverWithQuests = giver as MudObject & { getProperty?: (key: string) => unknown };
      if (giverWithQuests.getProperty) {
        try {
          const { getQuestDaemon } = await import('../../daemons/quest.js');
          const questDaemon = getQuestDaemon();
          const questData = giverWithQuests.getProperty('questData') as {
            active?: Array<{ questId: string; status: string }>;
          } | undefined;

          if (questData?.active) {
            for (const activeQuest of questData.active) {
              if (activeQuest.status !== 'active') continue;

              const quest = questDaemon.getQuest(activeQuest.questId);
              if (!quest) continue;

              for (const obj of quest.objectives) {
                if (obj.type === 'deliver') {
                  // Check if item matches and target NPC matches
                  const itemPath = item.objectPath || '';
                  const targetPath = target.objectPath || '';
                  const itemMatches = itemPath.includes(obj.itemPath) || itemPath === obj.itemPath;
                  const npcMatches = targetPath.includes(obj.targetNpc) || targetPath === obj.targetNpc;

                  if (itemMatches && npcMatches) {
                    return { canGive: true, isQuestDelivery: true };
                  }
                }
              }
            }
          }
        } catch {
          // Quest system not available
        }
      }
      return { canGive: false, reason: "You can't give that away." };
    }
  }
  return { canGive: true };
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return;
  }

  if (!args.trim()) {
    ctx.sendLine('Give what to whom?');
    ctx.sendLine('Usage: give <item> to <target>');
    ctx.sendLine('       give [amount] gold to <target>');
    return;
  }

  // Parse "to <target>" syntax
  const toMatch = args.match(/^(.+?)\s+to\s+(.+)$/i);
  if (!toMatch) {
    ctx.sendLine('Give what to whom?');
    ctx.sendLine('Usage: give <item> to <target>');
    return;
  }

  const [, itemPart, targetName] = toMatch;
  const itemStr = itemPart.trim();
  const targetStr = targetName.trim();

  // Find the target
  const target = findTarget(targetStr, room, player);
  if (!target) {
    ctx.sendLine(`You don't see ${targetStr} here.`);
    return;
  }

  const targetLiving = target as LivingWithGold;
  const playerLiving = player as LivingWithGold;
  const playerName = player.name || 'Someone';
  const targetNameStr = target.name || 'someone';

  // Check if giving gold
  const goldMatch = itemStr.match(/^(\d+)\s+gold$/i) || itemStr.match(/^(\d+)\s+coins?$/i);
  const allGoldMatch = itemStr.toLowerCase() === 'gold' || itemStr.toLowerCase() === 'coins';

  if (goldMatch || allGoldMatch) {
    // Giving gold
    let amount: number;

    if (allGoldMatch) {
      amount = playerLiving.gold || 0;
    } else {
      amount = parseInt(goldMatch![1], 10);
    }

    if (amount <= 0) {
      ctx.sendLine("You don't have any gold to give.");
      return;
    }

    if ((playerLiving.gold || 0) < amount) {
      ctx.sendLine(`You only have ${playerLiving.gold || 0} gold.`);
      return;
    }

    // Transfer gold
    if (playerLiving.spendGold) {
      playerLiving.spendGold(amount);
    } else {
      playerLiving.gold = (playerLiving.gold || 0) - amount;
    }

    if (targetLiving.addGold) {
      targetLiving.addGold(amount);
    } else {
      targetLiving.gold = (targetLiving.gold || 0) + amount;
    }

    ctx.sendLine(`{yellow}You give ${amount} gold coin${amount !== 1 ? 's' : ''} to ${targetNameStr}.{/}`);

    // Notify target
    if ('receive' in target) {
      const recv = target as MudObject & { receive: (msg: string) => void };
      recv.receive(`{yellow}${playerName} gives you ${amount} gold coin${amount !== 1 ? 's' : ''}.{/}\n`);
    }

    // Notify room
    for (const observer of room.inventory) {
      if (observer !== player && observer !== target && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} gives some gold to ${targetNameStr}.\n`);
      }
    }
    return;
  }

  // Can't give to yourself
  if (target === player) {
    ctx.sendLine("You can't give something to yourself.");
    return;
  }

  // Parse for indexed selection (e.g., "sword 2") or "all <type>"
  const parsed = parseItemInput(itemStr);

  // Handle "give all to <target>" - give all non-equipped items
  if (parsed.isAll) {
    await giveAll(ctx, player, target, room);
    return;
  }

  // Handle "give all <type> to <target>" - give all items of a specific type
  if (parsed.isAllOfType) {
    await giveAllOfType(ctx, player, target, room, parsed.name);
    return;
  }

  // Give single item (with optional index)
  const item = findItem(parsed.name, player.inventory, parsed.index);

  if (!item) {
    // Check if item exists but index is out of range
    if (parsed.index !== undefined) {
      const count = countMatching(parsed.name, player.inventory);
      if (count > 0) {
        if (count === 1) {
          ctx.sendLine(`You only have 1 ${parsed.name}.`);
        } else {
          ctx.sendLine(`You only have ${count} ${parsed.name}s.`);
        }
        return;
      }
    }
    ctx.sendLine("You're not carrying that.");
    return;
  }

  // Check if item can be given
  const giveCheck = await canGive(item, player, target);
  if (!giveCheck.canGive) {
    ctx.sendLine(giveCheck.reason || "You can't give that away.");
    return;
  }

  // Unequip if needed
  unequipIfNeeded(item);

  // Move item to target
  await item.moveTo(target);

  // If this was a quest delivery, update the objective
  if (giveCheck.isQuestDelivery) {
    try {
      const { getQuestDaemon } = await import('../../daemons/quest.js');
      const questDaemon = getQuestDaemon();
      const itemPath = item.objectPath || '';
      const targetPath = target.objectPath || '';
      type QuestPlayer = Parameters<typeof questDaemon.updateDeliverObjective>[0];
      questDaemon.updateDeliverObjective(player as unknown as QuestPlayer, itemPath, targetPath);
    } catch {
      // Quest system error
    }
  }

  ctx.sendLine(`You give ${item.shortDesc} to ${targetNameStr}.`);

  // Notify target
  if ('receive' in target) {
    const recv = target as MudObject & { receive: (msg: string) => void };
    recv.receive(`${playerName} gives you ${item.shortDesc}.\n`);
  }

  // Notify room
  for (const observer of room.inventory) {
    if (observer !== player && observer !== target && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} gives ${item.shortDesc} to ${targetNameStr}.\n`);
    }
  }
}

/**
 * Give all non-equipped, droppable items to the target.
 */
async function giveAll(
  ctx: CommandContext,
  player: MudObject,
  target: Living,
  room: MudObject
): Promise<void> {
  const living = player as Living;
  const playerName = player.name || 'Someone';
  const targetNameStr = target.name || 'someone';

  // Get all equipped items to exclude them
  const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();

  // Find all giveable items (non-equipped, droppable Items)
  const itemsToGive: MudObject[] = [];
  for (const item of player.inventory) {
    if (equipped.has(item)) continue; // Skip equipped items
    if (!(item instanceof Item)) continue; // Only items
    if (!item.dropable) continue; // Must be droppable

    // Check if this specific item can be given
    const giveCheck = await canGive(item, player, target);
    if (giveCheck.canGive) {
      itemsToGive.push(item);
    }
  }

  if (itemsToGive.length === 0) {
    ctx.sendLine("You're not carrying anything you can give away.");
    return;
  }

  const given: string[] = [];
  for (const item of itemsToGive) {
    // Unequip if needed (should already be excluded, but just in case)
    unequipIfNeeded(item);

    // Move item to target
    await item.moveTo(target);

    // Check for quest delivery
    const giveCheck = await canGive(item, player, target);
    if (giveCheck.isQuestDelivery) {
      try {
        const { getQuestDaemon } = await import('../../daemons/quest.js');
        const questDaemon = getQuestDaemon();
        const itemPath = item.objectPath || '';
        const targetPath = target.objectPath || '';
        type QuestPlayer = Parameters<typeof questDaemon.updateDeliverObjective>[0];
        questDaemon.updateDeliverObjective(player as unknown as QuestPlayer, itemPath, targetPath);
      } catch {
        // Quest system error
      }
    }

    given.push(item.shortDesc);
  }

  // Output message to player
  if (given.length === 1) {
    ctx.sendLine(`You give ${given[0]} to ${targetNameStr}.`);
  } else {
    ctx.sendLine(`You give ${given.length} items to ${targetNameStr}:`);
    for (const desc of given) {
      ctx.sendLine(`  ${desc}`);
    }
  }

  // Notify target
  if ('receive' in target) {
    const recv = target as MudObject & { receive: (msg: string) => void };
    if (given.length === 1) {
      recv.receive(`${playerName} gives you ${given[0]}.\n`);
    } else {
      recv.receive(`${playerName} gives you ${given.length} items.\n`);
    }
  }

  // Notify room
  for (const observer of room.inventory) {
    if (observer !== player && observer !== target && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      if (given.length === 1) {
        recv.receive(`${playerName} gives ${given[0]} to ${targetNameStr}.\n`);
      } else {
        recv.receive(`${playerName} gives several items to ${targetNameStr}.\n`);
      }
    }
  }
}

/**
 * Give all items of a specific type to the target.
 * e.g., "give all sword to bob" gives all swords.
 */
async function giveAllOfType(
  ctx: CommandContext,
  player: MudObject,
  target: Living,
  room: MudObject,
  typeName: string
): Promise<void> {
  const living = player as Living;
  const playerName = player.name || 'Someone';
  const targetNameStr = target.name || 'someone';

  // Get all equipped items to exclude them
  const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();

  // Find all matching items
  const matchingItems = findAllMatching(typeName, player.inventory);

  // Filter to giveable items (non-equipped, droppable)
  const itemsToGive: MudObject[] = [];
  for (const item of matchingItems) {
    if (equipped.has(item)) continue;
    if (!(item instanceof Item)) continue;
    if (!item.dropable) continue;

    const giveCheck = await canGive(item, player, target);
    if (giveCheck.canGive) {
      itemsToGive.push(item);
    }
  }

  if (itemsToGive.length === 0) {
    if (matchingItems.length === 0) {
      ctx.sendLine(`You don't have any ${typeName}s.`);
    } else {
      ctx.sendLine(`You can't give any of those away.`);
    }
    return;
  }

  const given: string[] = [];
  for (const item of itemsToGive) {
    unequipIfNeeded(item);
    await item.moveTo(target);

    // Check for quest delivery
    const giveCheck = await canGive(item, player, target);
    if (giveCheck.isQuestDelivery) {
      try {
        const { getQuestDaemon } = await import('../../daemons/quest.js');
        const questDaemon = getQuestDaemon();
        const itemPath = item.objectPath || '';
        const targetPath = target.objectPath || '';
        type QuestPlayer = Parameters<typeof questDaemon.updateDeliverObjective>[0];
        questDaemon.updateDeliverObjective(player as unknown as QuestPlayer, itemPath, targetPath);
      } catch {
        // Quest system error
      }
    }

    given.push(item.shortDesc);
  }

  // Output message
  if (given.length === 1) {
    ctx.sendLine(`You give ${given[0]} to ${targetNameStr}.`);
  } else {
    ctx.sendLine(`You give ${given.length} items to ${targetNameStr}:`);
    for (const desc of given) {
      ctx.sendLine(`  ${desc}`);
    }
  }

  // Notify target
  if ('receive' in target) {
    const recv = target as MudObject & { receive: (msg: string) => void };
    if (given.length === 1) {
      recv.receive(`${playerName} gives you ${given[0]}.\n`);
    } else {
      recv.receive(`${playerName} gives you ${given.length} items.\n`);
    }
  }

  // Notify room
  for (const observer of room.inventory) {
    if (observer !== player && observer !== target && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      if (given.length === 1) {
        recv.receive(`${playerName} gives ${given[0]} to ${targetNameStr}.\n`);
      } else {
        recv.receive(`${playerName} gives several items to ${targetNameStr}.\n`);
      }
    }
  }
}

export default { name, description, usage, execute };
