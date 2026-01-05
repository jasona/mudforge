/**
 * Look command - Examine your surroundings or objects.
 */

import type { MudObject } from '../../std/object.js';

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
export const usage = 'look [target]';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const room = player.environment as Room | null;

  if (!room) {
    ctx.sendLine('You are floating in a void.');
    return;
  }

  if (!args) {
    // Look at the room
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

      // Show contents
      const contents = room.inventory.filter((obj) => obj !== player);
      if (contents.length > 0) {
        ctx.sendLine('You see:');
        for (const obj of contents) {
          ctx.sendLine(`  ${obj.shortDesc}`);
        }
      }
    }
  } else {
    // Look at something specific
    const target = args.toLowerCase();

    // Check room contents
    for (const obj of room.inventory) {
      const item = obj as Item;
      if (item.id && item.id(target)) {
        ctx.sendLine(obj.longDesc);
        return;
      }
    }

    // Check player's inventory
    for (const obj of player.inventory) {
      const item = obj as Item;
      if (item.id && item.id(target)) {
        ctx.sendLine(obj.longDesc);
        return;
      }
    }

    ctx.sendLine(`You don't see any "${args}" here.`);
  }
}

export default { name, description, usage, execute };
