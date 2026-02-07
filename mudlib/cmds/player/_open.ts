/**
 * Open command - Open containers or doors.
 *
 * Usage:
 *   open <container>
 */

import type { MudObject } from '../../lib/std.js';
import { Container } from '../../lib/std.js';
import { findItem } from '../../lib/item-utils.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['open'];
export const description = 'Open a container or door';
export const usage = 'open <container>';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return;
  }

  if (!args.trim()) {
    ctx.sendLine('Open what?');
    return;
  }

  const targetName = args.trim();

  // Find the target in room or player's inventory
  let target = findItem(targetName, room.inventory);
  if (!target) {
    target = findItem(targetName, player.inventory);
  }

  if (!target) {
    ctx.sendLine("You don't see that here.");
    return;
  }

  // Check if it's a container
  if (target instanceof Container) {
    if (!target.canOpenClose) {
      ctx.sendLine("You can't open that.");
      return;
    }

    if (target.isOpen) {
      ctx.sendLine(`The ${target.shortDesc} is already open.`);
      return;
    }

    if (target.isLocked) {
      ctx.sendLine(`The ${target.shortDesc} is locked.`);
      return;
    }

    target.open();
    ctx.sendLine(`You open the ${target.shortDesc}.`);

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} opens ${target.shortDesc}.\n`);
      }
    }
    return;
  }

  // Could add door support here in the future
  ctx.sendLine("You can't open that.");
}

export default { name, description, usage, execute };
