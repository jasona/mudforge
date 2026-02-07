/**
 * Close command - Close containers or doors.
 *
 * Usage:
 *   close <container>
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

export const name = ['close', 'shut'];
export const description = 'Close a container or door';
export const usage = 'close <container>';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return;
  }

  if (!args.trim()) {
    ctx.sendLine('Close what?');
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
      ctx.sendLine("You can't close that.");
      return;
    }

    if (!target.isOpen) {
      ctx.sendLine(`The ${target.shortDesc} is already closed.`);
      return;
    }

    target.close();
    ctx.sendLine(`You close the ${target.shortDesc}.`);

    // Notify room
    const playerName = player.name || 'Someone';
    for (const observer of room.inventory) {
      if (observer !== player && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`${playerName} closes ${target.shortDesc}.\n`);
      }
    }
    return;
  }

  // Could add door support here in the future
  ctx.sendLine("You can't close that.");
}

export default { name, description, usage, execute };
