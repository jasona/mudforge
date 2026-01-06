/**
 * Goto command - Teleport to a location (builder only).
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Room extends MudObject {
  look?(viewer: MudObject): void;
}

export const name = ['goto', 'teleport', 'tp'];
export const description = 'Teleport to a location (builder only)';
export const usage = 'goto <room path>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;

  if (!args) {
    ctx.sendLine('Goto where? Usage: goto <room path>');
    ctx.sendLine('Example: goto /areas/void/void');
    return;
  }

  // Find the destination
  const destination = typeof efuns !== 'undefined' ? efuns.findObject(args) : undefined;

  if (!destination) {
    ctx.sendLine(`Cannot find room: ${args}`);
    return;
  }

  // Move the player
  const moved = await player.moveTo(destination);
  if (!moved) {
    ctx.sendLine('Something prevents you from teleporting there.');
    return;
  }

  ctx.sendLine(`You teleport to ${destination.shortDesc}.`);

  // Look at the new room
  const room = destination as Room;
  if (room.look) {
    room.look(player);
  }
}

export default { name, description, usage, execute };
