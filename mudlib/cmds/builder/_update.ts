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
 *   update cmds       - Rehash all commands
 *   update *.ts       - Reload all .ts files in current directory (wildcard)
 *   update *_armor.ts - Reload all files ending in _armor.ts
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
export const usage = 'update [path|pattern] | update _command | update here | update cmds';

/**
 * Convert a glob pattern to a RegExp.
 * Supports * (any characters) and ? (single character).
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
    .replace(/\*/g, '.*') // * matches any characters
    .replace(/\?/g, '.'); // ? matches single character
  return new RegExp(`^${escaped}$`);
}

/**
 * Check if a path contains wildcard characters.
 */
function hasWildcard(path: string): boolean {
  return path.includes('*') || path.includes('?');
}

export async function execute(ctx: CommandContext): Promise<void> {
  let objectPath = ctx.args.trim();

  // Handle "cmds" - rehash all commands
  if (objectPath === 'cmds' || objectPath === 'commands') {
    ctx.sendLine('{cyan}Rehashing all commands...{/}');
    try {
      const result = await efuns.rehashCommands();
      if (result.success) {
        ctx.sendLine(`{green}✓ Rehashed ${result.commandCount} commands.{/}`);
      } else {
        ctx.sendLine(`{red}✗ Failed: ${result.error}{/}`);
      }
    } catch (error) {
      ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
    }
    return;
  }

  // If no path given, use current working directory
  if (!objectPath) {
    const player = ctx.player as PlayerWithCwd;
    objectPath = player.cwd || '/';
    ctx.sendLine(`{dim}Using current directory: ${objectPath}{/}`);
  }

  // Handle wildcard patterns
  if (hasWildcard(objectPath)) {
    await handleWildcardUpdate(ctx, objectPath);
    return;
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

/**
 * Handle wildcard pattern updates.
 * Finds all matching files and reloads them.
 */
async function handleWildcardUpdate(ctx: CommandContext, pattern: string): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';

  // Resolve the pattern against cwd if relative
  let fullPattern = pattern;
  if (!pattern.startsWith('/')) {
    fullPattern = resolvePath(currentCwd, pattern, '/');
  }

  // Split into directory and file pattern
  const lastSlash = fullPattern.lastIndexOf('/');
  const directory = lastSlash > 0 ? fullPattern.substring(0, lastSlash) : '/';
  const filePattern = lastSlash >= 0 ? fullPattern.substring(lastSlash + 1) : fullPattern;

  if (!filePattern) {
    ctx.sendLine('{red}Invalid pattern: no file pattern specified.{/}');
    return;
  }

  ctx.sendLine(`{cyan}Searching for files matching: ${filePattern} in ${directory}{/}`);

  // Check if readDir is available
  if (typeof efuns === 'undefined' || !efuns.readDir) {
    ctx.sendLine('{red}Error: readDir efun not available.{/}');
    return;
  }

  // List files in the directory
  let files: string[];
  try {
    files = await efuns.readDir(directory);
  } catch (error) {
    ctx.sendLine(`{red}Error reading directory ${directory}: ${error instanceof Error ? error.message : String(error)}{/}`);
    return;
  }

  // Filter to only .ts files and match the pattern
  const regex = globToRegex(filePattern);
  const matchingFiles = files.filter(f => {
    // Only match .ts files (or if pattern explicitly includes extension)
    if (!filePattern.includes('.') && !f.endsWith('.ts')) {
      return false;
    }
    return regex.test(f);
  });

  if (matchingFiles.length === 0) {
    ctx.sendLine(`{yellow}No files matching '${filePattern}' found in ${directory}.{/}`);
    return;
  }

  ctx.sendLine(`{cyan}Found ${matchingFiles.length} matching file(s).{/}`);

  // Reload each matching file
  let successCount = 0;
  let failCount = 0;

  for (const file of matchingFiles.sort()) {
    // Remove .ts extension for the object path
    const objectName = file.replace(/\.ts$/, '');
    const objectPath = `${directory}/${objectName}`;

    // Check if it's a command
    const isCommandPath = directory.includes('/cmds/') || directory.startsWith('/cmds');

    if (isCommandPath) {
      // Reload as command
      if (typeof efuns.reloadCommand === 'function') {
        const result = await efuns.reloadCommand(objectPath);
        if (result.success) {
          ctx.sendLine(`  {green}✓{/} ${file}`);
          successCount++;
        } else {
          ctx.sendLine(`  {red}✗{/} ${file}: ${result.error || 'Unknown error'}`);
          failCount++;
        }
      }
    } else {
      // Reload as object
      if (typeof efuns.reloadObject === 'function') {
        const result = await efuns.reloadObject(objectPath);
        if (result.success) {
          let extra = '';
          if (result.migratedObjects > 0) {
            extra = ` (migrated ${result.migratedObjects})`;
          } else if (result.existingClones > 0) {
            extra = ` (${result.existingClones} clones unchanged)`;
          }
          ctx.sendLine(`  {green}✓{/} ${file}${extra}`);
          successCount++;
        } else {
          ctx.sendLine(`  {red}✗{/} ${file}: ${result.error || 'Unknown error'}`);
          failCount++;
        }
      }
    }
  }

  // Summary
  ctx.sendLine('');
  if (failCount === 0) {
    ctx.sendLine(`{green}Successfully reloaded ${successCount} file(s).{/}`);
  } else {
    ctx.sendLine(`{yellow}Reloaded ${successCount} file(s), ${failCount} failed.{/}`);
  }
}

export default { name, description, usage, execute };
