/**
 * rmdir command - Remove directories.
 *
 * Usage:
 *   rmdir <path>      - Remove an empty directory
 *   rmdir -r <path>   - Remove directory and all contents (use with caution!)
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath, getHomeDir } from '../../lib/path-utils.js';

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

export const name = ['rmdir'];
export const description = 'Remove a directory';
export const usage = 'rmdir [-r] <path>';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);

  // Parse arguments
  let args = ctx.args.trim();
  let recursive = false;

  // Check for -r flag
  if (args.startsWith('-r ')) {
    recursive = true;
    args = args.slice(3).trim();
  }

  if (!args) {
    ctx.sendLine('Usage: rmdir [-r] <path>');
    return;
  }

  // Resolve the path
  const resolvedPath = resolvePath(currentCwd, args, homeDir);

  // Safety check - don't allow removing root or critical directories
  const protectedPaths = ['/', '/std', '/cmds', '/daemons', '/data'];
  if (protectedPaths.includes(resolvedPath)) {
    ctx.sendLine(`{red}Cannot remove protected directory: ${resolvedPath}{/}`);
    return;
  }

  // Check write permission
  if (!efuns.checkWritePermission(resolvedPath)) {
    ctx.sendLine(`{red}Permission denied: ${resolvedPath}{/}`);
    return;
  }

  try {
    // Check if exists
    const exists = await efuns.fileExists(resolvedPath);
    if (!exists) {
      ctx.sendLine(`{red}No such directory: ${resolvedPath}{/}`);
      return;
    }

    // Check if it's a directory
    const stat = await efuns.fileStat(resolvedPath);
    if (!stat.isDirectory) {
      ctx.sendLine(`{red}Not a directory: ${resolvedPath}{/}`);
      return;
    }

    // Remove directory
    await efuns.removeDir(resolvedPath, recursive);
    ctx.sendLine(`{green}Removed directory: ${resolvedPath}{/}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('ENOTEMPTY') || msg.includes('not empty')) {
      ctx.sendLine(`{red}Directory not empty. Use 'rmdir -r' to remove recursively.{/}`);
    } else {
      ctx.sendLine(`{red}Error: ${msg}{/}`);
    }
  }
}

export default { name, description, usage, execute };
