/**
 * Update command - Reload an object from disk without restarting the server.
 *
 * This is true hot-reload: the blueprint is recompiled and updated in memory.
 * Existing clones keep their old behavior; new clones use the updated code.
 *
 * Usage:
 *   update <path>     - Reload an object (e.g., update /std/room)
 *   update here       - Reload the room you're currently in
 */

import type { MudObject } from '../../std/object.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  reloadObject(path: string): Promise<{
    success: boolean;
    error?: string;
    existingClones: number;
  }>;
};

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['update'];
export const description = 'Reload an object from disk (hot-reload)';
export const usage = 'update <path> | update here';

export async function execute(ctx: CommandContext): Promise<void> {
  let objectPath = ctx.args.trim();

  if (!objectPath) {
    ctx.sendLine('Usage: update <path>');
    ctx.sendLine('       update here');
    ctx.sendLine('');
    ctx.sendLine('Reloads an object from disk without restarting the server.');
    ctx.sendLine('Existing clones keep their old behavior; new clones use updated code.');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  update /std/room');
    ctx.sendLine('  update /areas/town/tavern');
    ctx.sendLine('  update here');
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

  // Normalize path
  if (!objectPath.startsWith('/')) {
    objectPath = '/' + objectPath;
  }

  // Remove .ts extension if provided
  objectPath = objectPath.replace(/\.ts$/, '');

  ctx.sendLine(`{cyan}Reloading ${objectPath}...{/}`);

  if (typeof efuns === 'undefined' || !efuns.reloadObject) {
    ctx.sendLine('{red}Error: reloadObject efun not available.{/}');
    return;
  }

  const result = await efuns.reloadObject(objectPath);

  if (result.success) {
    ctx.sendLine(`{green}Successfully reloaded ${objectPath}{/}`);
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
