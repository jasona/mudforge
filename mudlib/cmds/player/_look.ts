/**
 * Look command - Examine your surroundings or objects.
 *
 * Usage:
 *   look                    - Look at the room
 *   look <object>           - Examine an object (opens modal with AI image)
 *   look in <container>     - Look inside a container
 */

import type { MudObject } from '../../lib/std.js';
import { Container, NPC } from '../../lib/std.js';
import { openLookModal } from '../../lib/look-modal.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Room extends MudObject {
  look?(viewer: MudObject): void;
  getExits?(): string[];
}

interface Item extends MudObject {
  id(name: string): boolean;
}

export const name = ['look', 'l'];
export const description = 'Look at your surroundings or examine something';
export const usage = 'look [target] | look in <container>';

/**
 * Find an item by name in a list of objects.
 */
function findItem(name: string, items: MudObject[]): MudObject | undefined {
  const lowerName = name.toLowerCase();
  return items.find((item) => {
    const i = item as Item;
    return i.id && i.id(lowerName);
  });
}

/**
 * Get the description of an object, with container state if applicable.
 */
function getObjectDescription(obj: MudObject): string {
  if (obj instanceof Container) {
    return obj.getFullDescription();
  }
  return obj.longDesc;
}

/**
 * Format a short description with "The" prefix, avoiding double articles.
 * e.g. "a chest" -> "The chest", "the corpse" -> "The corpse"
 */
function formatWithThe(shortDesc: string): string {
  const lower = shortDesc.toLowerCase();
  // Already starts with "the"
  if (lower.startsWith('the ')) {
    return shortDesc.charAt(0).toUpperCase() + shortDesc.slice(1);
  }
  // Starts with an article (a, an) - replace it
  if (lower.startsWith('a ')) {
    return 'The ' + shortDesc.slice(2);
  }
  if (lower.startsWith('an ')) {
    return 'The ' + shortDesc.slice(3);
  }
  // No article - add "The"
  return 'The ' + shortDesc;
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const room = player.environment as Room | null;

  if (!room) {
    ctx.sendLine('You are floating in a void.');
    return;
  }

  if (!args) {
    // Look at the room - stays text-based
    lookAtRoom(ctx, room, player);
    return;
  }

  // Check for "look in <container>" syntax - stays text-based
  const inMatch = args.match(/^in\s+(.+)$/i);
  if (inMatch) {
    const containerName = inMatch[1].trim();
    lookInContainer(ctx, room, player, containerName);
    return;
  }

  // Look at something specific - use modal with AI image
  const target = args.toLowerCase();

  // Check room contents
  const roomItem = findItem(target, room.inventory);
  if (roomItem) {
    // Open the look modal with AI-generated image
    await openLookModal(player, roomItem);
    return;
  }

  // Check player's inventory
  const invItem = findItem(target, player.inventory);
  if (invItem) {
    // Open the look modal with AI-generated image
    await openLookModal(player, invItem);
    return;
  }

  ctx.sendLine(`You don't see any "${args}" here.`);
}

/**
 * Look at the room.
 */
function lookAtRoom(ctx: CommandContext, room: Room, player: MudObject): void {
  if (room.look) {
    room.look(player);
  } else {
    // Default room description
    ctx.sendLine(room.shortDesc);
    ctx.sendLine(room.longDesc);

    // Show exits
    if (room.getExits) {
      const exits = room.getExits();
      if (exits.length > 0) {
        ctx.sendLine(`Exits: ${exits.join(', ')}`);
      }
    }

    // Show contents (with container state indicators)
    // Sort: players first, NPCs second, items last
    const contents = room.inventory.filter((obj) => obj !== player);
    if (contents.length > 0) {
      const isPlayerObj = (obj: MudObject): boolean => {
        const p = obj as MudObject & { isConnected?: () => boolean };
        return typeof p.isConnected === 'function';
      };

      const sortedContents = [...contents].sort((a, b) => {
        const aIsPlayer = isPlayerObj(a);
        const bIsPlayer = isPlayerObj(b);
        const aIsNPC = a instanceof NPC;
        const bIsNPC = b instanceof NPC;

        // Players first
        if (aIsPlayer && !bIsPlayer) return -1;
        if (!aIsPlayer && bIsPlayer) return 1;
        // NPCs second
        if (aIsNPC && !bIsNPC) return -1;
        if (!aIsNPC && bIsNPC) return 1;
        // Items last
        return 0;
      });

      ctx.sendLine('You see:');
      for (const obj of sortedContents) {
        let desc = obj.shortDesc;
        // Add open/closed indicator for containers that support it
        if (obj instanceof Container && obj.canOpenClose) {
          desc += obj.isOpen ? ' {dim}(open){/}' : ' {dim}(closed){/}';
        }
        // NPCs displayed in red (non-bold)
        if (obj instanceof NPC) {
          desc = `{red}${desc}{/}`;
        }
        ctx.sendLine(`  ${desc}`);
      }
    }
  }
}

/**
 * Look inside a container.
 */
function lookInContainer(
  ctx: CommandContext,
  room: Room,
  player: MudObject,
  containerName: string
): void {
  // Find container in room or player's inventory
  let container = findItem(containerName, room.inventory);
  if (!container) {
    container = findItem(containerName, player.inventory);
  }

  if (!container) {
    ctx.sendLine("You don't see that here.");
    return;
  }

  if (!(container instanceof Container)) {
    ctx.sendLine("That's not a container.");
    return;
  }

  if (!container.isOpen) {
    ctx.sendLine(`${formatWithThe(container.shortDesc)} is closed.`);
    return;
  }

  if (container.inventory.length === 0) {
    ctx.sendLine(`${formatWithThe(container.shortDesc)} is empty.`);
    return;
  }

  ctx.sendLine(`${formatWithThe(container.shortDesc)} contains:`);
  for (const item of container.inventory) {
    ctx.sendLine(`  ${item.shortDesc}`);
  }
}

export default {
  name,
  description,
  usage,
  execute,
};
