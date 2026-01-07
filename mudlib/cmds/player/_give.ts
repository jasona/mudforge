/**
 * Give command - Give items or gold to other players or NPCs.
 *
 * Usage:
 *   give <item> to <target>     - Give an item to someone
 *   give <amount> gold to <target> - Give gold coins to someone
 *   give gold to <target>       - Give all your gold to someone
 */

import type { MudObject, Living, Weapon, Armor } from '../../lib/std.js';
import { Item } from '../../lib/std.js';

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
export const usage = 'give <item> to <target> | give [amount] gold to <target>';

/**
 * Find an item by name in a list of objects.
 */
function findItem(name: string, items: MudObject[]): MudObject | undefined {
  const lowerName = name.toLowerCase();
  return items.find((item) => item.id(lowerName));
}

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
 * Unequip an item if it's equipped.
 */
function unequipIfNeeded(item: MudObject): void {
  // Check if it's a wielded weapon
  if ('unwield' in item) {
    const weapon = item as Weapon;
    if (weapon.isWielded) {
      weapon.unwield();
    }
  }
  // Check if it's worn armor
  if ('remove' in item && 'isWorn' in item) {
    const armor = item as Armor;
    if (armor.isWorn) {
      armor.remove();
    }
  }
}

/**
 * Check if an item can be given (similar to drop check).
 */
function canGive(item: MudObject, giver: MudObject): { canGive: boolean; reason?: string } {
  if (item instanceof Item) {
    if (!item.dropable) {
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

  // Giving an item
  const item = findItem(itemStr, player.inventory);
  if (!item) {
    ctx.sendLine("You're not carrying that.");
    return;
  }

  // Can't give to yourself
  if (target === player) {
    ctx.sendLine("You can't give something to yourself.");
    return;
  }

  // Check if item can be given
  const giveCheck = canGive(item, player);
  if (!giveCheck.canGive) {
    ctx.sendLine(giveCheck.reason || "You can't give that away.");
    return;
  }

  // Unequip if needed
  unequipIfNeeded(item);

  // Move item to target
  await item.moveTo(target);

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

export default { name, description, usage, execute };
