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

interface Exit {
  direction: string;
  destination: string | MudObject;
  description?: string;
  canPass?: (who: MudObject) => boolean | Promise<boolean>;
}

interface Room extends MudObject {
  getExit?(direction: string): Exit | undefined;
  resolveExit?(exit: Exit): MudObject | undefined;
  look?(viewer: MudObject): void;
  glance?(viewer: MudObject): void;
}

interface Player extends MudObject {
  getConfig?<T = unknown>(key: string): T;
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

  const exit = room.getExit(direction);
  if (!exit) {
    ctx.sendLine(`You can't go ${direction}.`);
    return;
  }

  // Check if exit has a condition
  if (exit.canPass) {
    const canPass = await exit.canPass(player);
    if (!canPass) {
      ctx.sendLine("Something prevents you from going that way.");
      return;
    }
  }

  // Resolve the exit to get the actual destination room
  if (!room.resolveExit) {
    ctx.sendLine("There's nowhere to go.");
    return;
  }

  const destination = room.resolveExit(exit);
  if (!destination) {
    ctx.sendLine(`The way ${direction} seems blocked.`);
    return;
  }

  // Move the player
  const moved = await player.moveTo(destination);
  if (!moved) {
    ctx.sendLine("Something prevents you from going that way.");
    return;
  }

  // Look at the new room (brief mode shows glance, normal shows full look)
  const newRoom = destination as Room;
  const playerWithConfig = player as Player;
  const briefMode = playerWithConfig.getConfig?.('brief') ?? false;

  if (briefMode && newRoom.glance) {
    newRoom.glance(player);
  } else if (newRoom.look) {
    newRoom.look(player);
  } else {
    ctx.sendLine(newRoom.shortDesc);
    ctx.sendLine(newRoom.longDesc);
  }
}

export default { name, description, usage, execute };
