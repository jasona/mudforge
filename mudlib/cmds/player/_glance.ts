/**
 * Glance command - Quick one-line summary of the current room.
 *
 * Shows the room's short description and available exits on a single line.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Room extends MudObject {
  getExitDirections?(): string[];
}

export const name = ['glance', 'gl'];
export const description = 'Quick look at your surroundings';
export const usage = 'glance';

export function execute(ctx: CommandContext): void {
  const { player } = ctx;
  const room = player.environment as Room | null;

  if (!room) {
    ctx.sendLine('You are floating in a void.');
    return;
  }

  // Get exits
  let exitsStr = '';
  if (room.getExitDirections) {
    const exits = room.getExitDirections();
    if (exits.length > 0) {
      exitsStr = ` {dim}[${exits.join(', ')}]{/}`;
    }
  }

  // Output: "Room Name [n, s, e, w]"
  ctx.sendLine(`{bold}${room.shortDesc}{/}${exitsStr}`);
}

export default { name, description, usage, execute };
