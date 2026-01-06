/**
 * cp command - Copy files.
 *
 * Usage:
 *   cp <source> <destination>   - Copy a file
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath, basename, joinPath, getHomeDir } from '../../lib/path-utils.js';

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

export const name = ['cp', 'copy'];
export const description = 'Copy a file';
export const usage = 'cp <source> <destination>';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);

  // Parse arguments
  const args = ctx.args.trim();
  const parts = args.split(/\s+/);

  if (parts.length < 2) {
    ctx.sendLine('Usage: cp <source> <destination>');
    return;
  }

  const srcArg = parts[0];
  const destArg = parts.slice(1).join(' ');

  // Resolve paths
  const srcPath = resolvePath(currentCwd, srcArg, homeDir);
  let destPath = resolvePath(currentCwd, destArg, homeDir);

  // Check read permission on source
  if (!efuns.checkReadPermission(srcPath)) {
    ctx.sendLine(`{red}Permission denied: cannot read ${srcPath}{/}`);
    return;
  }

  try {
    // Check source exists and is a file
    const srcExists = await efuns.fileExists(srcPath);
    if (!srcExists) {
      ctx.sendLine(`{red}No such file: ${srcPath}{/}`);
      return;
    }

    const srcStat = await efuns.fileStat(srcPath);
    if (srcStat.isDirectory) {
      ctx.sendLine(`{red}Is a directory (cp doesn't support directory copying): ${srcPath}{/}`);
      return;
    }

    // Check if destination is an existing directory
    const destExists = await efuns.fileExists(destPath);
    if (destExists) {
      const destStat = await efuns.fileStat(destPath);
      if (destStat.isDirectory) {
        // Copying into a directory - append source filename
        destPath = joinPath(destPath, basename(srcPath));
      }
    }

    // Check write permission on destination
    if (!efuns.checkWritePermission(destPath)) {
      ctx.sendLine(`{red}Permission denied: cannot write to ${destPath}{/}`);
      return;
    }

    // Perform copy
    await efuns.copyFileTo(srcPath, destPath);
    ctx.sendLine(`{green}Copied: ${srcPath} -> ${destPath}{/}`);
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

export default { name, description, usage, execute };
