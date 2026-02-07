/**
 * Disembark command - Leave a vehicle.
 *
 * Usage:
 *   disembark  - Leave the vehicle you're on (must be docked)
 */

import type { MudObject } from '../../lib/std.js';
import type { Vehicle } from '../../std/vehicle.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

// Type guard for Room with look
interface LookableRoom extends MudObject {
  look?(viewer: MudObject): void;
}

export const name = ['disembark', 'leave', 'exit'];
export const description = 'Leave a vehicle';
export const usage = 'disembark';

export async function execute(ctx: CommandContext): Promise<boolean> {
  const { player } = ctx;
  const environment = player.environment;

  if (!environment) {
    ctx.sendLine("You're not anywhere!");
    return false;
  }

  // Check if player is on a vehicle
  if (!efuns.isVehicle(environment)) {
    ctx.sendLine("You're not on a vehicle.");
    return false;
  }

  const vehicle = environment as unknown as Vehicle;

  // Check if vehicle is docked
  if (!vehicle.isDocked) {
    ctx.sendLine("The vehicle is moving. You can't disembark until it docks.");
    return false;
  }

  // Check if there's a location to disembark to
  if (!vehicle.currentLocation) {
    ctx.sendLine("There's nowhere to disembark to.");
    return false;
  }

  // Disembark
  const living = player as unknown as Living;
  const success = await vehicle.disembarkPassenger(living);

  if (!success) {
    ctx.sendLine("You couldn't disembark.");
    return false;
  }

  ctx.sendLine(`You disembark from ${vehicle.shortDesc}.`);

  // Show the dock room
  const dockRoom = player.environment as LookableRoom;
  if (dockRoom && 'look' in dockRoom && typeof dockRoom.look === 'function') {
    dockRoom.look(player);
  }

  return true;
}

export default { name, description, usage, execute };
