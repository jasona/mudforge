/**
 * Get command - Pick up items from the room or from containers.
 *
 * Usage:
 *   get <item>                - Pick up an item from the room
 *   get <item> <number>       - Pick up the Nth matching item (e.g., "get sword 2")
 *   get all                   - Pick up all takeable items from the room
 *   get gold                  - Pick up gold coins from the room
 *   get <item> from <container> - Get an item from a container
 *   get all from <container>  - Get all items from a container
 *   get gold from <corpse>    - Loot gold from a corpse
 */

import type { MudObject, Living } from '../../lib/std.js';
import { Item, Container } from '../../lib/std.js';
import { Corpse } from '../../std/corpse.js';
import { GoldPile } from '../../std/gold-pile.js';

// Pet interface for type checking (avoids circular dependency)
interface PetLike {
  canAccessInventory(who: MudObject): boolean;
  getDisplayShortDesc(): string;
  inventory: MudObject[];
}

// Helper to check if object is a Pet
function isPet(obj: unknown): obj is PetLike {
  return obj !== null &&
    typeof obj === 'object' &&
    'canAccessInventory' in obj &&
    'getDisplayShortDesc' in obj &&
    'petId' in obj &&
    'ownerName' in obj;
}
import {
  parseItemInput,
  findItem,
  findAllMatching,
  countMatching,
  isGoldKeyword,
} from '../../lib/item-utils.js';
import { canSeeInRoom } from '../../std/visibility/index.js';
import type { Room } from '../../std/room.js';

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
    // Check for immovable items first
    if (item.size === 'immovable') {
      return { canTake: false, reason: "You can't pick that up. It's immovable." };
    }

    if (!item.takeable) {
      return { canTake: false, reason: "You can't take that." };
    }

    // Check encumbrance (if taker is a Living)
    const living = taker as Living;
    if (typeof living.canCarryItem === 'function') {
      const carryCheck = living.canCarryItem(item);
      if (!carryCheck.canCarry) {
        return { canTake: false, reason: carryCheck.reason };
      }
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
 * Find a container by name in a list of objects.
 * This is a simple single-match function for containers.
 */
function findContainer(name: string, items: MudObject[]): MudObject | undefined {
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

  // Check visibility for room-based operations
  const playerLiving = player as Living;
  const roomObj = room as unknown as Room;
  const lightCheck = canSeeInRoom(playerLiving, roomObj);

  // Parse "from <container>" syntax
  const fromMatch = args.match(/^(.+?)\s+from\s+(.+)$/i);

  if (fromMatch) {
    // Get from container - check if container is in inventory (OK in dark) or room (needs light)
    const [, itemName, containerName] = fromMatch;
    await getFromContainer(ctx, room, itemName.trim(), containerName.trim(), lightCheck.canSee);
  } else if (args.trim().toLowerCase() === 'all') {
    // Get all from room - requires light
    if (!lightCheck.canSee) {
      ctx.sendLine("It's too dark! You can't see what to pick up.");
      return;
    }
    await getAllFromRoom(ctx, room);
  } else {
    // Get single item from room - requires light
    if (!lightCheck.canSee) {
      ctx.sendLine("It's too dark! You can't see what to pick up.");
      return;
    }
    await getFromRoom(ctx, room, args.trim());
  }
}

/**
 * Get items from the room, with support for indexed selection and "all <type>".
 * e.g., "get sword 2" gets the second sword, "get all sword" gets all swords.
 */
async function getFromRoom(
  ctx: CommandContext,
  room: MudObject,
  itemName: string
): Promise<void> {
  const { player } = ctx;
  const playerWithGold = player as PlayerWithGold;

  // Check for gold pile pickup first (don't apply index parsing to gold)
  if (isGoldKeyword(itemName)) {
    // Find gold pile in room
    const goldPile = room.inventory.find((item) => item instanceof GoldPile) as GoldPile | undefined;
    if (!goldPile) {
      ctx.sendLine("You don't see any gold here.");
      return;
    }

    const amount = goldPile.amount;

    // Add gold to player
    if (playerWithGold.addGold) {
      playerWithGold.addGold(amount);
    } else {
      playerWithGold.gold = (playerWithGold.gold || 0) + amount;
    }

    // Destroy gold pile
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.destruct(goldPile);
    }

    ctx.sendLine(`{yellow}You pick up ${amount} gold coin${amount !== 1 ? 's' : ''}.{/}`);

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} picks up some gold coins.\n`);
      }
    }
    return;
  }

  // Parse the item input for indexed selection (e.g., "sword 2") or "all <type>"
  const parsed = parseItemInput(itemName);

  // Handle "get all <type>" - get all matching items of a specific type
  if (parsed.isAllOfType) {
    await getAllOfTypeFromRoom(ctx, room, parsed.name);
    return;
  }

  const item = findItem(parsed.name, room.inventory, parsed.index);

  if (!item) {
    // Check if item exists but index is out of range
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
    ctx.sendLine("You don't see that here.");
    return;
  }

  // Handle GoldPile items that match by other IDs
  if (item instanceof GoldPile) {
    const amount = item.amount;

    // Add gold to player
    if (playerWithGold.addGold) {
      playerWithGold.addGold(amount);
    } else {
      playerWithGold.gold = (playerWithGold.gold || 0) + amount;
    }

    // Destroy gold pile
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.destruct(item);
    }

    ctx.sendLine(`{yellow}You pick up ${amount} gold coin${amount !== 1 ? 's' : ''}.{/}`);

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} picks up some gold coins.\n`);
      }
    }
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
  const playerWithGold = player as PlayerWithGold;
  const takeableItems = getTakeableItems(room.inventory, player);

  // Filter out players/living beings - only get items, but handle gold piles separately
  const goldPiles: GoldPile[] = [];
  const itemsToTake = takeableItems.filter((item) => {
    if (item instanceof GoldPile) {
      goldPiles.push(item);
      return false; // Handle separately
    }
    return item instanceof Item;
  });

  // Calculate total gold from piles
  let totalGold = 0;
  for (const pile of goldPiles) {
    totalGold += pile.amount;
  }

  if (itemsToTake.length === 0 && totalGold === 0) {
    ctx.sendLine("There's nothing here you can take.");
    return;
  }

  const taken: string[] = [];

  // Pick up regular items
  for (const item of itemsToTake) {
    await item.moveTo(player);
    taken.push(item.shortDesc);
  }

  // Pick up gold
  if (totalGold > 0) {
    if (playerWithGold.addGold) {
      playerWithGold.addGold(totalGold);
    } else {
      playerWithGold.gold = (playerWithGold.gold || 0) + totalGold;
    }

    // Destroy gold piles
    for (const pile of goldPiles) {
      if (typeof efuns !== 'undefined' && efuns.destruct) {
        efuns.destruct(pile);
      }
    }
  }

  // Build output message
  if (taken.length > 0 || totalGold > 0) {
    if (taken.length === 1 && totalGold === 0) {
      ctx.sendLine(`You pick up ${taken[0]}.`);
    } else if (taken.length === 0 && totalGold > 0) {
      ctx.sendLine(`{yellow}You pick up ${totalGold} gold coin${totalGold !== 1 ? 's' : ''}.{/}`);
    } else {
      ctx.sendLine('You pick up:');
      for (const desc of taken) {
        ctx.sendLine(`  ${desc}`);
      }
      if (totalGold > 0) {
        ctx.sendLine(`  {yellow}${totalGold} gold coin${totalGold !== 1 ? 's' : ''}{/}`);
      }
    }
  }

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      if (taken.length <= 1 && totalGold === 0) {
        recv.receive(`${playerName} picks up ${taken[0] || 'something'}.\n`);
      } else {
        recv.receive(`${playerName} picks up several items.\n`);
      }
    }
  }
}

/**
 * Get all items of a specific type from the room.
 * e.g., "get all sword" gets all swords.
 */
async function getAllOfTypeFromRoom(
  ctx: CommandContext,
  room: MudObject,
  typeName: string
): Promise<void> {
  const { player } = ctx;

  // Find all matching items
  const matchingItems = findAllMatching(typeName, room.inventory);

  // Filter to only takeable items
  const takeableItems = matchingItems.filter((item) => {
    if (!(item instanceof Item)) return false;
    const check = canTake(item, player);
    return check.canTake;
  });

  if (takeableItems.length === 0) {
    if (matchingItems.length === 0) {
      ctx.sendLine(`You don't see any ${typeName}s here.`);
    } else {
      ctx.sendLine(`You can't take any of those.`);
    }
    return;
  }

  const taken: string[] = [];
  for (const item of takeableItems) {
    await item.moveTo(player);
    taken.push(item.shortDesc);
  }

  // Output message
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
 * Get an item from a container, with support for indexed selection.
 * e.g., "get sword 2 from chest" gets the second sword from the chest.
 */
async function getFromContainer(
  ctx: CommandContext,
  room: MudObject,
  itemName: string,
  containerName: string,
  canSeeRoom: boolean
): Promise<void> {
  const { player } = ctx;

  // Find the container - check inventory first (can access in darkness by feel)
  let container = findContainer(containerName, player.inventory);
  let containerInInventory = !!container;

  // If not in inventory, check room (requires light)
  if (!container) {
    if (!canSeeRoom) {
      ctx.sendLine("It's too dark! You can't see any containers here.");
      return;
    }
    container = findContainer(containerName, room.inventory);
  }

  if (!container) {
    ctx.sendLine("You don't see that container here.");
    return;
  }

  if (!(container instanceof Container)) {
    // Check if it's a Pet (Pets are not Containers but can hold items)
    if (isPet(container)) {
      if (!container.canAccessInventory(player)) {
        const petDesc = container.getDisplayShortDesc();
        ctx.sendLine(`${petDesc} won't let you take that.`);
        return;
      }
      // Pet found and accessible - continue to get item
      await getFromPet(ctx, container as PetLike, itemName, room);
      return;
    }
    ctx.sendLine("That's not a container.");
    return;
  }

  if (!container.isOpen) {
    ctx.sendLine(`The ${container.shortDesc} is closed.`);
    return;
  }

  // Special handling for "get gold from corpse" (don't apply index parsing)
  if (isGoldKeyword(itemName)) {
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

  // Parse for indexed selection (e.g., "sword 2") or "all <type>"
  const parsed = parseItemInput(itemName);

  if (parsed.isAll) {
    // Get all from container
    await getAllFromContainer(ctx, container);
  } else if (parsed.isAllOfType) {
    // Get all of a specific type from container
    await getAllOfTypeFromContainer(ctx, container, parsed.name, room);
  } else {
    // Get single item (with optional index)
    const item = findItem(parsed.name, container.inventory, parsed.index);

    if (!item) {
      // Check if item exists but index is out of range
      if (parsed.index !== undefined) {
        const count = countMatching(parsed.name, container.inventory);
        if (count > 0) {
          if (count === 1) {
            ctx.sendLine(`There is only 1 ${parsed.name} in the ${container.shortDesc}.`);
          } else {
            ctx.sendLine(`There are only ${count} ${parsed.name}s in the ${container.shortDesc}.`);
          }
          return;
        }
      }
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

/**
 * Get all items of a specific type from a container.
 * e.g., "get all sword from chest" gets all swords from the chest.
 */
async function getAllOfTypeFromContainer(
  ctx: CommandContext,
  container: Container,
  typeName: string,
  room: MudObject
): Promise<void> {
  const { player } = ctx;

  // Find all matching items in the container
  const matchingItems = findAllMatching(typeName, container.inventory);

  if (matchingItems.length === 0) {
    ctx.sendLine(`You don't see any ${typeName}s in the ${container.shortDesc}.`);
    return;
  }

  const taken: string[] = [];
  for (const item of matchingItems) {
    await item.moveTo(player);
    await container.onGet(item, player);
    taken.push(item.shortDesc);
  }

  // Output message
  if (taken.length === 1) {
    ctx.sendLine(`You get ${taken[0]} from ${container.shortDesc}.`);
  } else {
    ctx.sendLine(`You get from ${container.shortDesc}:`);
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
        recv.receive(`${playerName} gets ${taken[0]} from ${container.shortDesc}.\n`);
      } else {
        recv.receive(`${playerName} gets several items from ${container.shortDesc}.\n`);
      }
    }
  }
}

/**
 * Get items from a pet's inventory.
 */
async function getFromPet(
  ctx: CommandContext,
  pet: PetLike,
  itemName: string,
  room: MudObject
): Promise<void> {
  const { player } = ctx;
  const petDesc = pet.getDisplayShortDesc();

  // Handle "get all from pet"
  const parsed = parseItemInput(itemName);

  if (parsed.isAll) {
    // Get all from pet
    const items = [...pet.inventory];
    if (items.length === 0) {
      ctx.sendLine(`${petDesc} isn't carrying anything.`);
      return;
    }

    const taken: string[] = [];
    for (const item of items) {
      await item.moveTo(player);
      taken.push(item.shortDesc);
    }

    if (taken.length === 1) {
      ctx.sendLine(`You take ${taken[0]} from ${petDesc}.`);
    } else {
      ctx.sendLine(`You take from ${petDesc}:`);
      for (const desc of taken) {
        ctx.sendLine(`  ${desc}`);
      }
    }

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && observer !== pet && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        if (taken.length === 1) {
          recv.receive(`${playerName} takes ${taken[0]} from ${petDesc}.\n`);
        } else {
          recv.receive(`${playerName} takes several items from ${petDesc}.\n`);
        }
      }
    }
    return;
  }

  if (parsed.isAllOfType) {
    // Get all of a specific type from pet
    const matchingItems = findAllMatching(parsed.name, pet.inventory);
    if (matchingItems.length === 0) {
      ctx.sendLine(`You don't see any ${parsed.name}s on ${petDesc}.`);
      return;
    }

    const taken: string[] = [];
    for (const item of matchingItems) {
      await item.moveTo(player);
      taken.push(item.shortDesc);
    }

    if (taken.length === 1) {
      ctx.sendLine(`You take ${taken[0]} from ${petDesc}.`);
    } else {
      ctx.sendLine(`You take from ${petDesc}:`);
      for (const desc of taken) {
        ctx.sendLine(`  ${desc}`);
      }
    }

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && observer !== pet && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} takes items from ${petDesc}.\n`);
      }
    }
    return;
  }

  // Get single item (with optional index)
  const item = findItem(parsed.name, pet.inventory, parsed.index);

  if (!item) {
    if (parsed.index !== undefined) {
      const count = countMatching(parsed.name, pet.inventory);
      if (count > 0) {
        if (count === 1) {
          ctx.sendLine(`${petDesc} is only carrying 1 ${parsed.name}.`);
        } else {
          ctx.sendLine(`${petDesc} is only carrying ${count} ${parsed.name}s.`);
        }
        return;
      }
    }
    ctx.sendLine(`You don't see that on ${petDesc}.`);
    return;
  }

  await item.moveTo(player);
  ctx.sendLine(`You take ${item.shortDesc} from ${petDesc}.`);

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && observer !== pet && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} takes ${item.shortDesc} from ${petDesc}.\n`);
    }
  }
}

export default { name, description, usage, execute };
