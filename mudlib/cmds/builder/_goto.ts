/**
 * Goto command - Teleport to a location or player (builder only).
 *
 * Usage:
 *   goto <player>     - Teleport to a player's location
 *   goto <room path>  - Teleport to a room by path
 */

import type { MudObject } from '../../lib/std.js';
import { resolvePath } from '../../lib/path-utils.js';

interface PlayerWithCwd extends MudObject {
  cwd: string;
  name: string;
}

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
export const description = 'Teleport to a player or location (builder only)';
export const usage = 'goto <player | room path>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const p = player as PlayerWithCwd;

  if (!args) {
    ctx.sendLine('Goto where? Usage: goto <player | room path>');
    ctx.sendLine('Examples:');
    ctx.sendLine('  goto acer              - Teleport to player Acer');
    ctx.sendLine('  goto /areas/valdoria/aldric/center - Teleport to a room');
    ctx.sendLine('  goto tavern            - Teleport to room in current directory');
    return;
  }

  let destination: MudObject | undefined;
  let targetDescription: string;

  // First, try to find a player by name (active players, even if disconnected)
  if (typeof efuns !== 'undefined' && efuns.findActivePlayer) {
    const targetPlayer = efuns.findActivePlayer(args);
    if (targetPlayer) {
      // Found a player - get their environment
      const targetEnv = targetPlayer.environment;
      if (!targetEnv) {
        const targetName = (targetPlayer as PlayerWithCwd).name || args;
        ctx.sendLine(`{yellow}${targetName} is not in a room (possibly in limbo).{/}`);
        return;
      }
      destination = targetEnv;
      const targetName = (targetPlayer as PlayerWithCwd).name || args;
      targetDescription = `${targetName}'s location`;
    }
  }

  // If no player found, try to resolve as a room path
  if (!destination) {
    // Resolve path relative to cwd if not absolute
    let roomPath = args.trim();

    // Remove .ts extension if provided
    roomPath = roomPath.replace(/\.ts$/, '');

    // If not an absolute path, resolve relative to cwd
    if (!roomPath.startsWith('/')) {
      const currentCwd = p.cwd || '/';
      roomPath = resolvePath(currentCwd, roomPath, '/');
    }

    destination = typeof efuns !== 'undefined' ? efuns.findObject(roomPath) : undefined;
    targetDescription = roomPath;

    if (!destination) {
      ctx.sendLine(`{red}Cannot find player or room: ${args}{/}`);
      ctx.sendLine('{dim}Tip: Use an absolute path like /areas/town/square or a player name{/}');
      return;
    }
  }

  // Move the player
  const moved = await player.moveTo(destination);
  if (!moved) {
    ctx.sendLine('{red}Something prevents you from teleporting there.{/}');
    return;
  }

  ctx.sendLine(`{cyan}You teleport to ${targetDescription}.{/}`);

  // Look at the new room
  const room = destination as Room;
  if (room.look) {
    room.look(player);
  }
}

export default { name, description, usage, execute };
