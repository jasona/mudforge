/**
 * Glance command - Quick summary of the current room.
 *
 * Shows the room's short description, exits, and a brief colorized
 * list of contents (players, NPCs, items). Used when brief mode is on.
 */

import type { MudObject } from '../../lib/std.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Room extends MudObject {
  glance?(viewer: MudObject): void;
  look?(viewer: MudObject): void;
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

  // Check if player is blinded
  const playerLiving = player as Living;
  if (playerLiving.isBlind && playerLiving.isBlind()) {
    ctx.sendLine("{red}You can't see anything - you are blinded!{/}");
    return;
  }

  // Use the room's glance method which handles visibility, contents, etc.
  if (typeof room.glance === 'function') {
    room.glance(player);
  } else if (typeof room.look === 'function') {
    // Fallback to look if glance not available
    room.look(player);
  } else {
    ctx.sendLine(room.shortDesc || 'You are somewhere.');
  }
}

export default { name, description, usage, execute };
