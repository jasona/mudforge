/**
 * Say command - Speak to others in the room.
 */

import type { MudObject } from '../../lib/std.js';
import { getPlayerColor, formatWithColor } from './_colors.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerLike extends MudObject {
  name: string;
  receive?(message: string): void;
  getProperty?(key: string): unknown;
}

export const name = ['say', "'"];
export const description = 'Say something to others in the room';
export const usage = "say <message> or '<message>";

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const room = player.environment;

  if (!args) {
    ctx.sendLine('Say what?');
    return;
  }

  const playerName = (player as PlayerLike).name || 'Someone';

  // Tell the player what they said (use their own color preference)
  const selfColor = getPlayerColor(player, 'say');
  ctx.sendLine(formatWithColor(selfColor, `You say: ${args}`));

  // Tell everyone else in the room (use each recipient's color preference)
  if (room) {
    for (const obj of room.inventory) {
      if (obj !== player) {
        const other = obj as PlayerLike;
        if (other.receive) {
          const otherColor = getPlayerColor(other, 'say');
          other.receive(formatWithColor(otherColor, `${playerName} says: ${args}`) + '\n');
        }
      }
    }
  }
}

export default { name, description, usage, execute };
