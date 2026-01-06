/**
 * Clone command - Create an instance of an object and add it to your inventory.
 *
 * Usage:
 *   clone <path>     - Clone an object (e.g., clone /users/acer/sword)
 */

import type { MudObject } from '../../std/object.js';

interface Player extends MudObject {
  cwd: string;
}

interface CommandContext {
  player: Player;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['clone'];
export const description = 'Create an instance of an object';
export const usage = 'clone <path>';

/**
 * Resolve a path relative to the player's cwd.
 */
function resolvePath(path: string, cwd: string): string {
  // Already absolute
  if (path.startsWith('/')) {
    return path;
  }

  // Relative path - resolve against cwd
  if (cwd === '/') {
    return '/' + path;
  }

  return cwd + '/' + path;
}

export async function execute(ctx: CommandContext): Promise<void> {
  let objectPath = ctx.args.trim();

  if (!objectPath) {
    ctx.sendLine('Usage: clone <path>');
    ctx.sendLine('');
    ctx.sendLine('Creates an instance of an object and adds it to your inventory.');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  clone /users/acer/sword');
    ctx.sendLine('  clone /std/weapon');
    ctx.sendLine('  clone sword.ts        (relative to cwd)');
    return;
  }

  // Remove .ts extension if provided
  objectPath = objectPath.replace(/\.ts$/, '');

  // Resolve relative paths
  const cwd = ctx.player.cwd || '/';
  objectPath = resolvePath(objectPath, cwd);

  // Normalize path (remove double slashes, etc.)
  objectPath = objectPath.replace(/\/+/g, '/');

  ctx.sendLine(`{cyan}Cloning ${objectPath}...{/}`);

  if (typeof efuns === 'undefined' || !efuns.cloneObject) {
    ctx.sendLine('{red}Error: cloneObject efun not available.{/}');
    return;
  }

  try {
    const clonedObject = await efuns.cloneObject(objectPath);

    if (!clonedObject) {
      ctx.sendLine(`{red}Failed to clone ${objectPath}{/}`);
      ctx.sendLine('{dim}Make sure the path is correct and the object exists.{/}');
      return;
    }

    // Move the cloned object into the player's inventory
    const moved = await efuns.move(clonedObject, ctx.player);

    if (moved) {
      ctx.sendLine(`{green}Cloned ${objectPath}{/}`);
      ctx.sendLine(`{cyan}${clonedObject.shortDesc}{/} appears in your inventory.`);
    } else {
      ctx.sendLine(`{yellow}Cloned ${objectPath} but could not move to inventory.{/}`);
      ctx.sendLine('{dim}The object may have been created in limbo.{/}');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error cloning ${objectPath}: ${errorMsg}{/}`);
  }
}

export default { name, description, usage, execute };
