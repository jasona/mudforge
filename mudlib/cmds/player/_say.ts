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
  hearSay?(speaker: MudObject, message: string): void;
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
  const timestamp = Date.now();

  // Tell the player what they said (use their own color preference)
  const selfColor = getPlayerColor(player, 'say');
  ctx.sendLine(formatWithColor(selfColor, `You say: ${args}`));

  // Send to comm panel for the speaker
  efuns.sendComm(player, {
    type: 'comm',
    commType: 'say',
    sender: playerName,
    message: args,
    timestamp,
    isSender: true,
  });

  // Tell everyone else in the room (use each recipient's color preference)
  if (room) {
    for (const obj of room.inventory) {
      if (obj !== player) {
        const other = obj as PlayerLike;
        if (other.receive) {
          const otherColor = getPlayerColor(other, 'say');
          other.receive(formatWithColor(otherColor, `${playerName} says: ${args}`) + '\n');

          // Send to comm panel for each listener
          efuns.sendComm(other, {
            type: 'comm',
            commType: 'say',
            sender: playerName,
            message: args,
            timestamp,
            isSender: false,
          });
        }
        // Notify NPCs so they can respond
        if (other.hearSay) {
          other.hearSay(player, args);
        }
      }
    }
  }
}

export default { name, description, usage, execute };
