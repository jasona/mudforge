/**
 * Drop command - Drop items from your inventory.
 *
 * Usage:
 *   drop <item>               - Drop an item on the floor
 *   drop <item> <number>      - Drop the Nth matching item (e.g., "drop sword 2")
 *   drop all                  - Drop all droppable items
 *   drop gold                 - Drop all your gold
 *   drop <amount> gold        - Drop a specific amount of gold
 *   drop <item> in <container> - Put an item in a container
 *   drop all in <container>   - Put all items in a container
 */

import type { MudObject, Living, Weapon, Armor } from '../../lib/std.js';
import { Item, Container } from '../../lib/std.js';
import { GoldPile } from '../../std/gold-pile.js';
import { parseItemInput, findItem, findAllMatching, countMatching, unequipIfNeeded } from '../../lib/item-utils.js';

// Pet interface for type checking (avoids circular dependency)
interface PetLike {
  canHold(item: MudObject): boolean;
  getCannotHoldReason(item: MudObject): string | null;
  getDisplayShortDesc(): string;
  inventory: MudObject[];
  inCombat: boolean;
  itemCount: number;
  maxItems: number;
  currentWeight: number;
  maxWeight: number;
}

interface PlayerWithGold extends MudObject {
  gold?: number;
  spendGold?(amount: number): boolean;
}

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

  const argLower = args.trim().toLowerCase();

  // Check for gold drop first
  const goldMatch = argLower.match(/^(\d+)\s+gold$/) || argLower.match(/^(\d+)\s+coins?$/);
  const allGoldMatch = argLower === 'gold' || argLower === 'coins';

  if (goldMatch || allGoldMatch) {
    await dropGold(ctx, room, goldMatch ? parseInt(goldMatch[1], 10) : undefined);
    return;
  }

  // Parse "in <container>" syntax
  const inMatch = args.match(/^(.+?)\s+in\s+(.+)$/i);

  if (inMatch) {
    // Put in container
    const [, itemName, containerName] = inMatch;
    await putInContainer(ctx, room, itemName.trim(), containerName.trim());
  } else if (argLower === 'all') {
    // Drop all
    await dropAll(ctx, room);
  } else {
    // Drop single item
    await dropItem(ctx, room, args.trim());
  }
}

/**
 * Drop items, with support for indexed selection and "all <type>".
 * e.g., "drop sword 2" drops the second sword, "drop all sword" drops all swords.
 */
async function dropItem(ctx: CommandContext, room: MudObject, itemName: string): Promise<void> {
  const { player } = ctx;

  // Parse for indexed selection (e.g., "sword 2") or "all <type>"
  const parsed = parseItemInput(itemName);

  // Handle "drop all <type>" - drop all items of a specific type
  if (parsed.isAllOfType) {
    await dropAllOfType(ctx, room, parsed.name);
    return;
  }

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

  const dropCheck = canDrop(item, player);
  if (!dropCheck.canDrop) {
    ctx.sendLine(dropCheck.reason || "You can't drop that.");
    return;
  }

  // Unequip if needed
  unequipIfNeeded(item);

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
 * Drop gold coins.
 */
async function dropGold(ctx: CommandContext, room: MudObject, amount?: number): Promise<void> {
  const { player } = ctx;
  const playerWithGold = player as PlayerWithGold;
  const playerGold = playerWithGold.gold || 0;

  if (playerGold <= 0) {
    ctx.sendLine("You don't have any gold to drop.");
    return;
  }

  // Determine amount to drop
  const toDrop = amount !== undefined ? Math.min(amount, playerGold) : playerGold;

  if (toDrop <= 0) {
    ctx.sendLine("You don't have any gold to drop.");
    return;
  }

  if (amount !== undefined && playerGold < amount) {
    ctx.sendLine(`You only have ${playerGold} gold.`);
    return;
  }

  // Remove gold from player
  if (playerWithGold.spendGold) {
    playerWithGold.spendGold(toDrop);
  } else {
    playerWithGold.gold = playerGold - toDrop;
  }

  // Create gold pile in room (it will auto-merge with existing piles)
  const pile = new GoldPile(toDrop);
  await pile.moveTo(room);

  ctx.sendLine(`{yellow}You drop ${toDrop} gold coin${toDrop !== 1 ? 's' : ''}.{/}`);

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} drops some gold coins.\n`);
    }
  }
}

/**
 * Drop all items of a specific type.
 * e.g., "drop all sword" drops all swords.
 */
async function dropAllOfType(ctx: CommandContext, room: MudObject, typeName: string): Promise<void> {
  const { player } = ctx;
  const living = player as Living;

  // Get all equipped items to exclude them
  const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();

  // Find all matching items
  const matchingItems = findAllMatching(typeName, player.inventory);

  // Filter to only droppable, non-equipped items
  const droppableItems = matchingItems.filter((item) => {
    if (equipped.has(item)) return false;
    if (!(item instanceof Item)) return false;
    const check = canDrop(item, player);
    return check.canDrop;
  });

  if (droppableItems.length === 0) {
    if (matchingItems.length === 0) {
      ctx.sendLine(`You don't have any ${typeName}s.`);
    } else {
      ctx.sendLine(`You can't drop any of those.`);
    }
    return;
  }

  const dropped: string[] = [];
  for (const item of droppableItems) {
    // Unequip if needed (should be excluded, but just in case)
    unequipIfNeeded(item);
    await item.moveTo(room);
    dropped.push(item.shortDesc);
  }

  // Output message
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
 * Put an item in a container, with support for indexed selection.
 * e.g., "drop sword 2 in chest" puts the second sword in the chest.
 */
async function putInContainer(
  ctx: CommandContext,
  room: MudObject,
  itemName: string,
  containerName: string
): Promise<void> {
  const { player } = ctx;

  // Find the container in room or player's inventory (no indexed selection for containers)
  let container = findItem(containerName, room.inventory);
  if (!container) {
    container = findItem(containerName, player.inventory);
  }

  if (!container) {
    ctx.sendLine("You don't see that container here.");
    return;
  }

  // Check if it's a Pet (Pets can hold items but aren't Containers)
  if (efuns.isPet(container)) {
    await putInPet(ctx, container as PetLike, itemName, room);
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

  // Parse for indexed selection (e.g., "sword 2") or "all <type>"
  const parsed = parseItemInput(itemName);

  if (parsed.isAll) {
    // Put all in container
    await putAllInContainer(ctx, container);
  } else if (parsed.isAllOfType) {
    // Put all of a specific type in container
    await putAllOfTypeInContainer(ctx, container, parsed.name, room);
  } else {
    // Put single item (with optional index)
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
    unequipIfNeeded(item);

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

/**
 * Put all items of a specific type in a container.
 * e.g., "drop all sword in chest" puts all swords in the chest.
 */
async function putAllOfTypeInContainer(
  ctx: CommandContext,
  container: Container,
  typeName: string,
  room: MudObject
): Promise<void> {
  const { player } = ctx;
  const living = player as Living;

  // Get all equipped items to exclude them
  const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();

  // Find all matching items
  const matchingItems = findAllMatching(typeName, player.inventory);

  // Filter to items that can be put in the container
  const itemsToPut = matchingItems.filter((item) => {
    if (item === container) return false;
    if (equipped.has(item)) return false;
    if (!(item instanceof Item)) return false;
    return container.canHold(item);
  });

  if (itemsToPut.length === 0) {
    if (matchingItems.length === 0) {
      ctx.sendLine(`You don't have any ${typeName}s.`);
    } else {
      ctx.sendLine(`You can't put any of those in there.`);
    }
    return;
  }

  const put: string[] = [];
  for (const item of itemsToPut) {
    if (!container.canHold(item)) break; // Stop if container is full
    // Unequip if needed (should be excluded, but just in case)
    unequipIfNeeded(item);
    await item.moveTo(container);
    await container.onPut(item, player);
    put.push(item.shortDesc);
  }

  // Output message
  if (put.length === 1) {
    ctx.sendLine(`You put ${put[0]} in ${container.shortDesc}.`);
  } else {
    ctx.sendLine(`You put ${put.length} items in ${container.shortDesc}:`);
    for (const desc of put) {
      ctx.sendLine(`  ${desc}`);
    }
  }

  // Notify room
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

/**
 * Put items in a pet's inventory.
 * Anyone can give items to a pet (ownership not required for putting).
 */
async function putInPet(
  ctx: CommandContext,
  pet: PetLike,
  itemName: string,
  room: MudObject
): Promise<void> {
  const { player } = ctx;
  const petDesc = pet.getDisplayShortDesc();
  const living = player as Living;

  // Parse for indexed selection (e.g., "sword 2") or "all"
  const parsed = parseItemInput(itemName);

  if (parsed.isAll) {
    // Put all items in pet
    const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();
    const itemsToPut = player.inventory.filter((item) => {
      if (equipped.has(item)) return false;
      if (!(item instanceof Item)) return false;
      return pet.canHold(item);
    });

    if (itemsToPut.length === 0) {
      ctx.sendLine("You don't have anything you can give to the pet.");
      return;
    }

    const put: string[] = [];
    for (const item of itemsToPut) {
      if (!pet.canHold(item)) break;
      await item.moveTo(pet);
      put.push(item.shortDesc);
    }

    if (put.length === 1) {
      ctx.sendLine(`You give ${put[0]} to ${petDesc}.`);
    } else {
      ctx.sendLine(`You give ${put.length} items to ${petDesc}:`);
      for (const desc of put) {
        ctx.sendLine(`  ${desc}`);
      }
    }

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && observer !== pet && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} gives items to ${petDesc}.\n`);
      }
    }
    return;
  }

  if (parsed.isAllOfType) {
    // Put all of a specific type in pet
    const equipped = living.getAllEquipped ? new Set(living.getAllEquipped().values()) : new Set();
    const matchingItems = findAllMatching(parsed.name, player.inventory);
    const itemsToPut = matchingItems.filter((item) => {
      if (equipped.has(item)) return false;
      if (!(item instanceof Item)) return false;
      return pet.canHold(item);
    });

    if (itemsToPut.length === 0) {
      if (matchingItems.length === 0) {
        ctx.sendLine(`You don't have any ${parsed.name}s.`);
      } else {
        ctx.sendLine(`You can't give any of those to the pet.`);
      }
      return;
    }

    const put: string[] = [];
    for (const item of itemsToPut) {
      if (!pet.canHold(item)) break;
      unequipIfNeeded(item);
      await item.moveTo(pet);
      put.push(item.shortDesc);
    }

    if (put.length === 1) {
      ctx.sendLine(`You give ${put[0]} to ${petDesc}.`);
    } else {
      ctx.sendLine(`You give ${put.length} items to ${petDesc}:`);
      for (const desc of put) {
        ctx.sendLine(`  ${desc}`);
      }
    }

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && observer !== pet && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} gives items to ${petDesc}.\n`);
      }
    }
    return;
  }

  // Put single item
  const item = findItem(parsed.name, player.inventory, parsed.index);

  if (!item) {
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

  if (!pet.canHold(item)) {
    const reason = pet.getCannotHoldReason(item);
    ctx.sendLine(reason || `${petDesc} can't carry that.`);
    return;
  }

  // Unequip if needed
  unequipIfNeeded(item);

  await item.moveTo(pet);
  ctx.sendLine(`You give ${item.shortDesc} to ${petDesc}.`);

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && observer !== pet && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`${playerName} gives ${item.shortDesc} to ${petDesc}.\n`);
    }
  }
}

export default { name, description, usage, execute };
