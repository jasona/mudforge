/**
 * Say command - Speak to others in the room.
 */

import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerLike extends MudObject {
  name: string;
  receive?(message: string): void;
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

  // Tell the player what they said
  ctx.sendLine(`You say: ${args}`);

  // Tell everyone else in the room
  if (room) {
    for (const obj of room.inventory) {
      if (obj !== player) {
        const other = obj as PlayerLike;
        if (other.receive) {
          other.receive(`${playerName} says: ${args}\n`);
        }
      }
    }
  }
}

export default { name, description, usage, execute };
