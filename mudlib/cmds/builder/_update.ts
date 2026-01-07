/**
 * Update command - Reload an object or command from disk without restarting the server.
 *
 * This is true hot-reload: the code is recompiled and updated in memory.
 * For objects: existing clones keep their old behavior; new clones use updated code.
 * For commands: the command is immediately updated for all players.
 *
 * Usage:
 *   update            - Reload the object at current working directory
 *   update <path>     - Reload an object (e.g., update /std/room)
 *   update _look      - Reload a command (searches cmds/ directories)
 *   update here       - Reload the room you're currently in
 */

import type { MudObject } from '../../lib/std.js';
import { resolvePath } from '../../lib/path-utils.js';

interface PlayerWithCwd extends MudObject {
  cwd: string;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['update'];
export const description = 'Reload an object or command from disk (hot-reload)';
export const usage = 'update [path] | update _command | update here';

export async function execute(ctx: CommandContext): Promise<void> {
  let objectPath = ctx.args.trim();

  // If no path given, use current working directory
  if (!objectPath) {
    const player = ctx.player as PlayerWithCwd;
    objectPath = player.cwd || '/';
    ctx.sendLine(`{dim}Using current directory: ${objectPath}{/}`);
  }

  // Handle "here" - reload current room
  if (objectPath.toLowerCase() === 'here') {
    const env = ctx.player.environment;
    if (!env) {
      ctx.sendLine('{red}You are not in a room.{/}');
      return;
    }
    objectPath = env.objectPath;
    if (!objectPath) {
      ctx.sendLine('{red}Cannot determine current room path.{/}');
      return;
    }
  }

  // Remove .ts extension if provided
  objectPath = objectPath.replace(/\.ts$/, '');

  // Check if this is a command (starts with _ and no slashes, or /cmds/ path)
  const isCommand = objectPath.startsWith('_') && !objectPath.includes('/');
  const isCommandPath = objectPath.includes('/cmds/') || objectPath.startsWith('cmds/');

  if (isCommand) {
    // Search for command in standard directories
    const cmdName = objectPath;
    const cmdDirs = ['/cmds/player', '/cmds/builder', '/cmds/admin', '/cmds/wizard'];

    if (typeof efuns === 'undefined' || !efuns.reloadCommand) {
      ctx.sendLine('{red}Error: reloadCommand efun not available.{/}');
      return;
    }

    for (const dir of cmdDirs) {
      const testPath = `${dir}/${cmdName}`;
      const result = await efuns.reloadCommand(testPath);
      if (result.success) {
        ctx.sendLine(`{green}Successfully reloaded command ${testPath}{/}`);
        return;
      }
    }

    ctx.sendLine(`{red}Command ${cmdName} not found in standard directories.{/}`);
    ctx.sendLine('{dim}Searched: /cmds/player, /cmds/builder, /cmds/admin, /cmds/wizard{/}');
    return;
  }

  if (isCommandPath) {
    // Direct command path like /cmds/player/_look
    if (!objectPath.startsWith('/')) {
      objectPath = '/' + objectPath;
    }

    ctx.sendLine(`{cyan}Reloading command ${objectPath}...{/}`);

    if (typeof efuns === 'undefined' || !efuns.reloadCommand) {
      ctx.sendLine('{red}Error: reloadCommand efun not available.{/}');
      return;
    }

    const result = await efuns.reloadCommand(objectPath);

    if (result.success) {
      ctx.sendLine(`{green}Successfully reloaded command ${objectPath}{/}`);
    } else {
      ctx.sendLine(`{red}Failed to reload command ${objectPath}{/}`);
      if (result.error) {
        ctx.sendLine(`{red}Error: ${result.error}{/}`);
      }
    }
    return;
  }

  // Regular object reload - resolve relative paths against cwd
  if (!objectPath.startsWith('/')) {
    const player = ctx.player as PlayerWithCwd;
    const currentCwd = player.cwd || '/';
    objectPath = resolvePath(currentCwd, objectPath, '/');
  }

  ctx.sendLine(`{cyan}Reloading ${objectPath}...{/}`);

  if (typeof efuns === 'undefined' || !efuns.reloadObject) {
    ctx.sendLine('{red}Error: reloadObject efun not available.{/}');
    return;
  }

  const result = await efuns.reloadObject(objectPath);

  if (result.success) {
    ctx.sendLine(`{green}Successfully reloaded ${objectPath}{/}`);
    if (result.migratedObjects > 0) {
      ctx.sendLine(`{cyan}Migrated ${result.migratedObjects} object(s) to the new instance.{/}`);
    }
    if (result.existingClones > 0) {
      ctx.sendLine(`{yellow}Note: ${result.existingClones} existing clone(s) still use old code.{/}`);
      ctx.sendLine('{dim}New clones will use the updated code.{/}');
    }
  } else {
    ctx.sendLine(`{red}Failed to reload ${objectPath}{/}`);
    if (result.error) {
      ctx.sendLine(`{red}Error: ${result.error}{/}`);
    }
  }
}

export default { name, description, usage, execute };
