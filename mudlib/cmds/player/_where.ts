/**
 * Where command - Show the player's current location in friendly terms.
 *
 * Usage:
 *   where - Display your current area and region
 */

import type { MudObject } from '../../lib/std.js';
import { getAreaDaemon } from '../../daemons/area.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'where';
export const description = 'Show your current location';
export const usage = 'where';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const room = player.environment;

  if (!room) {
    ctx.sendLine("You don't seem to be anywhere at all.");
    return;
  }

  // Get map coordinates which include the area path
  const roomWithCoords = room as MudObject & {
    getMapCoordinates?: () => { x?: number; y?: number; z?: number; area?: string } | undefined;
  };

  if (typeof roomWithCoords.getMapCoordinates !== 'function') {
    ctx.sendLine("You're in an unknown location.");
    return;
  }

  const coords = roomWithCoords.getMapCoordinates();
  if (!coords?.area) {
    ctx.sendLine("You're in an uncharted area.");
    return;
  }

  // Parse the area path: /areas/region/subregion -> region:subregion
  const areaPath = coords.area;
  const pathMatch = areaPath.match(/^\/areas\/([^/]+)\/([^/]+)/);

  if (!pathMatch) {
    ctx.sendLine("You're in an uncharted area.");
    return;
  }

  const [, region, subregion] = pathMatch;
  const areaId = `${region}:${subregion}`;

  // Try to get area info from the Area Daemon
  const daemon = getAreaDaemon();
  await daemon.ensureLoaded();
  const areaInfo = daemon.getArea(areaId);

  // Format region name (capitalize, replace underscores with spaces)
  const formatName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Build the output
  if (areaInfo) {
    // We have full area info from the daemon
    const regionDisplay = formatName(region);
    ctx.sendLine(`You are in {cyan}${areaInfo.name}{/}, on the continent of {yellow}${regionDisplay}{/}.`);

    if (areaInfo.owner) {
      const ownerDisplay = areaInfo.owner.charAt(0).toUpperCase() + areaInfo.owner.slice(1);
      ctx.sendLine(`This area was created by {green}${ownerDisplay}{/}.`);
    }
  } else {
    // Fallback: format from path segments
    const areaDisplay = formatName(subregion);
    const regionDisplay = formatName(region);
    ctx.sendLine(`You are in {cyan}${areaDisplay}{/}, on the continent of {yellow}${regionDisplay}{/}.`);
  }
}

export default { name, description, usage, execute };
