/**
 * Go command - Move in a direction.
 */

import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  verb: string;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Room extends MudObject {
  getExit?(direction: string): MudObject | null;
  look?(viewer: MudObject): void;
}

// Direction aliases
const DIRECTION_ALIASES: Record<string, string> = {
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  u: 'up',
  d: 'down',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
};

// All valid direction names and aliases
export const name = [
  'go',
  'north', 'south', 'east', 'west', 'up', 'down',
  'n', 's', 'e', 'w', 'u', 'd',
  'northeast', 'northwest', 'southeast', 'southwest',
  'ne', 'nw', 'se', 'sw',
];
export const description = 'Move in a direction';
export const usage = 'go <direction> or just <direction>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, verb, args } = ctx;
  const room = player.environment as Room | null;

  if (!room) {
    ctx.sendLine("You can't go anywhere from here.");
    return;
  }

  // Determine direction
  let direction: string;
  if (verb === 'go') {
    if (!args) {
      ctx.sendLine('Go where?');
      return;
    }
    direction = args.toLowerCase();
  } else {
    // The verb itself is the direction
    direction = verb.toLowerCase();
  }

  // Expand aliases
  direction = DIRECTION_ALIASES[direction] || direction;

  // Try to find the exit
  if (!room.getExit) {
    ctx.sendLine("There's nowhere to go.");
    return;
  }

  const destination = room.getExit(direction);
  if (!destination) {
    ctx.sendLine(`You can't go ${direction}.`);
    return;
  }

  // Move the player
  const moved = await player.moveTo(destination);
  if (!moved) {
    ctx.sendLine("Something prevents you from going that way.");
    return;
  }

  // Look at the new room
  const newRoom = destination as Room;
  if (newRoom.look) {
    newRoom.look(player);
  } else {
    ctx.sendLine(newRoom.shortDesc);
    ctx.sendLine(newRoom.longDesc);
  }
}

export default { name, description, usage, execute };
