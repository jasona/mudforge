/**
 * Say command - Speak to others in the room.
 */

import type { MudObject } from '../../lib/std.js';
import { getPlayerColor, formatWithColor } from './_colors.js';
import { canSee, getVisibleDisplayName } from '../../std/visibility/index.js';
import type { Living } from '../../std/living.js';
import type { Room } from '../../std/room.js';

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

  // Check if player is muted
  const playerLiving = player as Living;
  if (playerLiving.isMute && playerLiving.isMute()) {
    ctx.sendLine("{red}You try to speak but no sound comes out - you are muted!{/}");
    return;
  }

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
  // Check visibility for each listener to determine how to display speaker's name
  if (room) {
    const speakerLiving = player as Living;

    for (const obj of room.inventory) {
      if (obj !== player) {
        const other = obj as PlayerLike;
        const listenerLiving = other as Living;

        // Skip deaf or sleeping listeners (they don't hear anything)
        if (listenerLiving.isDeaf?.() || listenerLiving.isSleeping?.()) {
          continue;
        }

        // Determine the speaker's name based on listener's visibility of them
        const roomObj = room as Room;
        const { name: displayedName } = getVisibleDisplayName(listenerLiving, speakerLiving, roomObj);

        if (other.receive) {
          const otherColor = getPlayerColor(other, 'say');
          other.receive(formatWithColor(otherColor, `${displayedName} says: ${args}`) + '\n');

          // Send to comm panel for each listener
          efuns.sendComm(other, {
            type: 'comm',
            commType: 'say',
            sender: displayedName,
            message: args,
            timestamp,
            isSender: false,
          });
        }
        // Notify NPCs so they can respond (only if they can see the speaker)
        if (other.hearSay) {
          const visResult = canSee(listenerLiving, speakerLiving, roomObj);
          if (visResult.canSee) {
            other.hearSay(player, args);
          }
        }
      }
    }
  }
}

export default { name, description, usage, execute };
