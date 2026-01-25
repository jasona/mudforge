/**
 * Whereami command - Show the current room's path (builder only).
 *
 * Usage:
 *   whereami - Display the path and filename of the current room
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'whereami';
export const description = 'Show the current room path (builder only)';
export const usage = 'whereami';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;

  const room = player.environment;

  if (!room) {
    ctx.sendLine('{red}You are not in a room.{/}');
    return;
  }

  const roomPath = room.objectPath || 'unknown';
  const roomShortDesc = room.shortDesc || 'unnamed room';

  ctx.sendLine('{cyan}Current Location:{/}');
  ctx.sendLine(`  {yellow}Path:{/} ${roomPath}`);
  ctx.sendLine(`  {yellow}Room:{/} ${roomShortDesc}`);

  // Show additional info if available
  const roomWithTerrain = room as MudObject & { getTerrain?: () => string };
  if (typeof roomWithTerrain.getTerrain === 'function') {
    ctx.sendLine(`  {yellow}Terrain:{/} ${roomWithTerrain.getTerrain()}`);
  }

  const roomWithCoords = room as MudObject & { getMapCoordinates?: () => { x?: number; y?: number; z?: number; area?: string } | undefined };
  if (typeof roomWithCoords.getMapCoordinates === 'function') {
    const coords = roomWithCoords.getMapCoordinates();
    if (coords && (coords.x !== undefined || coords.y !== undefined || coords.z !== undefined)) {
      ctx.sendLine(`  {yellow}Coords:{/} (${coords.x ?? '?'}, ${coords.y ?? '?'}, ${coords.z ?? '?'})`);
      if (coords.area) {
        ctx.sendLine(`  {yellow}Area:{/} ${coords.area}`);
      }
    }
  }
}

export default { name, description, usage, execute };
