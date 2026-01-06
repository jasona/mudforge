/**
 * Drop command - Drop items from your inventory.
 *
 * Usage:
 *   drop <item>               - Drop an item on the floor
 *   drop all                  - Drop all droppable items
 *   drop <item> in <container> - Put an item in a container
 *   drop all in <container>   - Put all items in a container
 */

import type { MudObject } from '../../std/object.js';
import { Item } from '../../std/item.js';
import { Container } from '../../std/container.js';
import type { Living } from '../../std/living.js';
import type { Weapon } from '../../std/weapon.js';
import type { Armor } from '../../std/armor.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['drop', 'put'];
export const description = 'Drop items or put them in containers';
export const usage = 'drop <item> | drop all | drop <item> in <container>';

/**
 * Check if an item can be dropped.
 */
function canDrop(item: MudObject, dropper: MudObject): { canDrop: boolean; reason?: string } {
  if (item instanceof Item) {
    if (!item.dropable) {
      return { canDrop: false, reason: "You can't drop that." };
    }
    const result = item.onDrop(dropper);
    if (result === false) {
      return { canDrop: false, reason: "You can't drop that." };
    }
  }
  return { canDrop: true };
}

/**
 * Find an item by name in a list of objects.
 */
function findItem(name: string, items: MudObject[]): MudObject | undefined {
  const lowerName = name.toLowerCase();
  return items.find((item) => item.id(lowerName));
}

/**
 * Unequip an item if it's equipped.
 */
function unequipIfNeeded(item: MudObject, player: MudObject): void {
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

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return;
  }

  if (!args.trim()) {
    ctx.sendLine('Drop what?');
    return;
  }

  // Parse "in <container>" syntax
  const inMatch = args.match(/^(.+?)\s+in\s+(.+)$/i);

  if (inMatch) {
    // Put in container
    const [, itemName, containerName] = inMatch;
    await putInContainer(ctx, room, itemName.trim(), containerName.trim());
  } else if (args.trim().toLowerCase() === 'all') {
    // Drop all
    await dropAll(ctx, room);
  } else {
    // Drop single item
    await dropItem(ctx, room, args.trim());
  }
}

/**
 * Drop a single item.
 */
async function dropItem(ctx: CommandContext, room: MudObject, itemName: string): Promise<void> {
  const { player } = ctx;
  const item = findItem(itemName, player.inventory);

  if (!item) {
    ctx.sendLine("You're not carrying that.");
    return;
  }

  const dropCheck = canDrop(item, player);
  if (!dropCheck.canDrop) {
    ctx.sendLine(dropCheck.reason || "You can't drop that.");
    return;
  }

  // Unequip if needed
  unequipIfNeeded(item, player);

  await item.moveTo(room);
  ctx.sendLine(`You drop ${item.shortDesc}.`);

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} drops ${item.shortDesc}.\n`);
    }
  }
}

/**
 * Drop all droppable items.
 */
async function dropAll(ctx: CommandContext, room: MudObject): Promise<void> {
  const { player } = ctx;
  const living = player as Living;

  // Get all droppable items (exclude equipped items)
  const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();
  const droppableItems = player.inventory.filter((item) => {
    if (equipped.has(item)) return false; // Skip equipped items
    if (!(item instanceof Item)) return false;
    const check = canDrop(item, player);
    return check.canDrop;
  });

  if (droppableItems.length === 0) {
    ctx.sendLine("You're not carrying anything you can drop.");
    return;
  }

  const dropped: string[] = [];
  for (const item of droppableItems) {
    await item.moveTo(room);
    dropped.push(item.shortDesc);
  }

  if (dropped.length === 1) {
    ctx.sendLine(`You drop ${dropped[0]}.`);
  } else {
    ctx.sendLine(`You drop ${dropped.length} items:`);
    for (const desc of dropped) {
      ctx.sendLine(`  ${desc}`);
    }
  }

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      if (dropped.length === 1) {
        recv.receive(`${playerName} drops ${dropped[0]}.\n`);
      } else {
        recv.receive(`${playerName} drops several items.\n`);
      }
    }
  }
}

/**
 * Put an item in a container.
 */
async function putInContainer(
  ctx: CommandContext,
  room: MudObject,
  itemName: string,
  containerName: string
): Promise<void> {
  const { player } = ctx;

  // Find the container in room or player's inventory
  let container = findItem(containerName, room.inventory);
  if (!container) {
    container = findItem(containerName, player.inventory);
  }

  if (!container) {
    ctx.sendLine("You don't see that container here.");
    return;
  }

  if (!(container instanceof Container)) {
    ctx.sendLine("That's not a container.");
    return;
  }

  if (!container.isOpen) {
    ctx.sendLine(`The ${container.shortDesc} is closed.`);
    return;
  }

  if (itemName.toLowerCase() === 'all') {
    // Put all in container
    await putAllInContainer(ctx, container);
  } else {
    // Put single item in container
    const item = findItem(itemName, player.inventory);

    if (!item) {
      ctx.sendLine("You're not carrying that.");
      return;
    }

    if (item === container) {
      ctx.sendLine("You can't put something inside itself!");
      return;
    }

    if (!container.canHold(item)) {
      const reason = container.getCannotHoldReason(item);
      ctx.sendLine(reason || "You can't put that in there.");
      return;
    }

    // Unequip if needed
    unequipIfNeeded(item, player);

    await item.moveTo(container);
    await container.onPut(item, player);

    ctx.sendLine(`You put ${item.shortDesc} in ${container.shortDesc}.`);

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} puts ${item.shortDesc} in ${container.shortDesc}.\n`);
      }
    }
  }
}

/**
 * Put all items in a container.
 */
async function putAllInContainer(ctx: CommandContext, container: Container): Promise<void> {
  const { player } = ctx;
  const room = player.environment;
  const living = player as Living;

  // Get all items that can be put in the container (exclude equipped)
  const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();
  const itemsToPut = player.inventory.filter((item) => {
    if (item === container) return false; // Can't put container in itself
    if (equipped.has(item)) return false; // Skip equipped items
    if (!(item instanceof Item)) return false;
    return container.canHold(item);
  });

  if (itemsToPut.length === 0) {
    ctx.sendLine("You don't have anything you can put in there.");
    return;
  }

  const put: string[] = [];
  for (const item of itemsToPut) {
    if (!container.canHold(item)) break; // Stop if container is full
    await item.moveTo(container);
    await container.onPut(item, player);
    put.push(item.shortDesc);
  }

  if (put.length === 1) {
    ctx.sendLine(`You put ${put[0]} in ${container.shortDesc}.`);
  } else {
    ctx.sendLine(`You put ${put.length} items in ${container.shortDesc}:`);
    for (const desc of put) {
      ctx.sendLine(`  ${desc}`);
    }
  }

  // Notify room
  if (room) {
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        if (put.length === 1) {
          recv.receive(`${playerName} puts ${put[0]} in ${container.shortDesc}.\n`);
        } else {
          recv.receive(`${playerName} puts several items in ${container.shortDesc}.\n`);
        }
      }
    }
  }
}

export default { name, description, usage, execute };
