/**
 * Get command - Pick up items from the room or from containers.
 *
 * Usage:
 *   get <item>                - Pick up an item from the room
 *   get all                   - Pick up all takeable items from the room
 *   get <item> from <container> - Get an item from a container
 *   get all from <container>  - Get all items from a container
 */

import type { MudObject } from '../../lib/std.js';
import { Item, Container } from '../../lib/std.js';
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

export const name = ['get', 'take', 'pick'];
export const description = 'Pick up items';
export const usage = 'get <item> | get all | get <item> from <container>';

/**
 * Check if an item can be taken.
 */
function canTake(item: MudObject, taker: MudObject): { canTake: boolean; reason?: string } {
  // Check if it's an Item with takeable property
  if (item instanceof Item) {
    if (!item.takeable) {
      return { canTake: false, reason: "You can't take that." };
    }
    // Call onTake hook
    const result = item.onTake(taker);
    if (result === false) {
      return { canTake: false, reason: "You can't take that." };
    }
  }
  return { canTake: true };
}

/**
 * Find an item by name in a list of objects.
 */
function findItem(name: string, items: MudObject[]): MudObject | undefined {
  const lowerName = name.toLowerCase();
  return items.find((item) => item.id(lowerName));
}

/**
 * Get all takeable items from a list.
 */
function getTakeableItems(items: MudObject[], taker: MudObject): MudObject[] {
  return items.filter((item) => {
    const result = canTake(item, taker);
    return result.canTake;
  });
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return;
  }

  if (!args.trim()) {
    ctx.sendLine('Get what?');
    return;
  }

  // Parse "from <container>" syntax
  const fromMatch = args.match(/^(.+?)\s+from\s+(.+)$/i);

  if (fromMatch) {
    // Get from container
    const [, itemName, containerName] = fromMatch;
    await getFromContainer(ctx, room, itemName.trim(), containerName.trim());
  } else if (args.trim().toLowerCase() === 'all') {
    // Get all from room
    await getAllFromRoom(ctx, room);
  } else {
    // Get single item from room
    await getFromRoom(ctx, room, args.trim());
  }
}

/**
 * Get a single item from the room.
 */
async function getFromRoom(
  ctx: CommandContext,
  room: MudObject,
  itemName: string
): Promise<void> {
  const { player } = ctx;
  const item = findItem(itemName, room.inventory);

  if (!item) {
    ctx.sendLine("You don't see that here.");
    return;
  }

  const takeCheck = canTake(item, player);
  if (!takeCheck.canTake) {
    ctx.sendLine(takeCheck.reason || "You can't take that.");
    return;
  }

  await item.moveTo(player);
  ctx.sendLine(`You pick up ${item.shortDesc}.`);

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} picks up ${item.shortDesc}.\n`);
    }
  }
}

/**
 * Get all takeable items from the room.
 */
async function getAllFromRoom(ctx: CommandContext, room: MudObject): Promise<void> {
  const { player } = ctx;
  const takeableItems = getTakeableItems(room.inventory, player);

  // Filter out players/living beings - only get items
  const itemsToTake = takeableItems.filter((item) => item instanceof Item);

  if (itemsToTake.length === 0) {
    ctx.sendLine("There's nothing here you can take.");
    return;
  }

  const taken: string[] = [];
  for (const item of itemsToTake) {
    await item.moveTo(player);
    taken.push(item.shortDesc);
  }

  if (taken.length === 1) {
    ctx.sendLine(`You pick up ${taken[0]}.`);
  } else {
    ctx.sendLine(`You pick up ${taken.length} items:`);
    for (const desc of taken) {
      ctx.sendLine(`  ${desc}`);
    }
  }

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      if (taken.length === 1) {
        recv.receive(`${playerName} picks up ${taken[0]}.\n`);
      } else {
        recv.receive(`${playerName} picks up several items.\n`);
      }
    }
  }
}

/**
 * Get an item from a container.
 */
async function getFromContainer(
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

  // Special handling for "get gold from corpse"
  if (itemName.toLowerCase() === 'gold' || itemName.toLowerCase() === 'coins') {
    if (container instanceof Corpse) {
      const corpse = container;
      if (corpse.gold <= 0) {
        ctx.sendLine(`There's no gold on ${corpse.shortDesc}.`);
        return;
      }

      const amount = corpse.lootGold(player);
      ctx.sendLine(`{yellow}You take ${amount} gold coin${amount !== 1 ? 's' : ''} from ${corpse.shortDesc}.{/}`);

      // Notify room
      const playerName = player.name || 'Someone';
      for (const observer of room.inventory) {
        if (observer !== player && 'receive' in observer) {
          const recv = observer as MudObject & { receive: (msg: string) => void };
          recv.receive(`${playerName} takes gold from ${corpse.shortDesc}.\n`);
        }
      }
      return;
    } else {
      ctx.sendLine(`You don't see any gold in the ${container.shortDesc}.`);
      return;
    }
  }

  if (itemName.toLowerCase() === 'all') {
    // Get all from container
    await getAllFromContainer(ctx, container);
  } else {
    // Get single item from container
    const item = findItem(itemName, container.inventory);

    if (!item) {
      ctx.sendLine(`You don't see that in the ${container.shortDesc}.`);
      return;
    }

    await item.moveTo(player);

    // Call container's onGet hook
    await container.onGet(item, player);

    ctx.sendLine(`You get ${item.shortDesc} from ${container.shortDesc}.`);

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} gets ${item.shortDesc} from ${container.shortDesc}.\n`);
      }
    }
  }
}

/**
 * Get all items from a container.
 */
async function getAllFromContainer(ctx: CommandContext, container: Container): Promise<void> {
  const { player } = ctx;
  const room = player.environment;

  const items = [...container.inventory]; // Copy since we're modifying

  // Check if container is a corpse with gold
  let goldAmount = 0;
  if (container instanceof Corpse && container.gold > 0) {
    goldAmount = container.lootGold(player);
  }

  if (items.length === 0 && goldAmount === 0) {
    ctx.sendLine(`The ${container.shortDesc} is empty.`);
    return;
  }

  const taken: string[] = [];
  for (const item of items) {
    await item.moveTo(player);
    await container.onGet(item, player);
    taken.push(item.shortDesc);
  }

  // Build output message
  if (taken.length > 0 || goldAmount > 0) {
    if (taken.length === 1 && goldAmount === 0) {
      ctx.sendLine(`You get ${taken[0]} from ${container.shortDesc}.`);
    } else if (taken.length === 0 && goldAmount > 0) {
      ctx.sendLine(`{yellow}You take ${goldAmount} gold coin${goldAmount !== 1 ? 's' : ''} from ${container.shortDesc}.{/}`);
    } else {
      ctx.sendLine(`You get from ${container.shortDesc}:`);
      for (const desc of taken) {
        ctx.sendLine(`  ${desc}`);
      }
      if (goldAmount > 0) {
        ctx.sendLine(`  {yellow}${goldAmount} gold coin${goldAmount !== 1 ? 's' : ''}{/}`);
      }
    }
  }

  // Notify room
  if (room) {
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        if (taken.length <= 1 && goldAmount === 0) {
          recv.receive(`${playerName} gets ${taken[0] || 'something'} from ${container.shortDesc}.\n`);
        } else {
          recv.receive(`${playerName} empties ${container.shortDesc}.\n`);
        }
      }
    }
  }
}

export default { name, description, usage, execute };
