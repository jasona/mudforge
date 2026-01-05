/**
 * mkdir command - Create directories.
 *
 * Usage:
 *   mkdir <path>      - Create a directory
 *   mkdir -p <path>   - Create directory and parents if needed
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath } from '../../lib/path-utils.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  fileExists(path: string): Promise<boolean>;
  makeDir(path: string, recursive?: boolean): Promise<void>;
  checkWritePermission(path: string): boolean;
};

interface PlayerWithCwd extends MudObject {
  cwd: string;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['mkdir'];
export const description = 'Create a directory';
export const usage = 'mkdir [-p] <path>';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';

  // Parse arguments
  let args = ctx.args.trim();
  let recursive = false;

  // Check for -p flag
  if (args.startsWith('-p ')) {
    recursive = true;
    args = args.slice(3).trim();
  }

  if (!args) {
    ctx.sendLine('Usage: mkdir [-p] <path>');
    return;
  }

  // Resolve the path
  const resolvedPath = resolvePath(currentCwd, args);

  // Check write permission
  if (!efuns.checkWritePermission(resolvedPath)) {
    ctx.sendLine(`{red}Permission denied: ${resolvedPath}{/}`);
    return;
  }

  try {
    // Check if already exists
    const exists = await efuns.fileExists(resolvedPath);
    if (exists) {
      ctx.sendLine(`{red}Directory already exists: ${resolvedPath}{/}`);
      return;
    }

    // Create directory
    await efuns.makeDir(resolvedPath, recursive);
    ctx.sendLine(`{green}Created directory: ${resolvedPath}{/}`);
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

export default { name, description, usage, execute };
