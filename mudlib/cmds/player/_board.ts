/**
 * Board command - Board a vehicle.
 *
 * Usage:
 *   board <vehicle>  - Board a docked vehicle in the room
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

// Type guard for Room with broadcast
interface BroadcastableRoom extends MudObject {
  broadcast(message: string, options?: { exclude?: MudObject[] }): void;
  look?(viewer: MudObject): void;
}

function isBroadcastableRoom(obj: unknown): obj is BroadcastableRoom {
  return obj !== null && typeof obj === 'object' && 'broadcast' in obj;
}

export const name = 'board';
export const description = 'Board a vehicle';
export const usage = 'board <vehicle>';

export async function execute(ctx: CommandContext): Promise<boolean> {
  const { player, args } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You're not anywhere!");
    return false;
  }

  if (!args.trim()) {
    ctx.sendLine('Board what?');
    return false;
  }

  const targetName = args.trim().toLowerCase();

  // Find a vehicle in the room matching the name
  let vehicle: Vehicle | null = null;

  for (const obj of room.inventory) {
    if (efuns.isVehicle(obj) && obj.id(targetName)) {
      vehicle = obj as Vehicle;
      break;
    }
  }

  if (!vehicle) {
    ctx.sendLine("You don't see that vehicle here.");
    return false;
  }

  // Check if vehicle is docked
  if (!vehicle.isDocked) {
    ctx.sendLine("The vehicle is not docked. You can't board.");
    return false;
  }

  // Check capacity
  if (!vehicle.hasCapacity) {
    ctx.sendLine('The vehicle is full.');
    return false;
  }

  // Board the vehicle
  const living = player as unknown as Living;
  const success = await vehicle.boardPassenger(living);

  if (!success) {
    ctx.sendLine("You couldn't board the vehicle.");
    return false;
  }

  ctx.sendLine(`You board ${vehicle.shortDesc}.`);

  // Show the vehicle interior
  if ('look' in vehicle && typeof vehicle.look === 'function') {
    vehicle.look(player);
  }

  return true;
}

export default { name, description, usage, execute };
