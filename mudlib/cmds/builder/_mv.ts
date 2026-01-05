/**
 * mv command - Move or rename files and directories.
 *
 * Usage:
 *   mv <source> <destination>   - Move/rename a file or directory
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath, basename, joinPath } from '../../lib/path-utils.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  fileExists(path: string): Promise<boolean>;
  fileStat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }>;
  moveFile(srcPath: string, destPath: string): Promise<void>;
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

export const name = ['mv', 'rename'];
export const description = 'Move or rename files and directories';
export const usage = 'mv <source> <destination>';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';

  // Parse arguments - split by space (simple parsing)
  const args = ctx.args.trim();
  const parts = args.split(/\s+/);

  if (parts.length < 2) {
    ctx.sendLine('Usage: mv <source> <destination>');
    return;
  }

  const srcArg = parts[0];
  const destArg = parts.slice(1).join(' ');

  // Resolve paths
  const srcPath = resolvePath(currentCwd, srcArg);
  let destPath = resolvePath(currentCwd, destArg);

  // Check write permission on source
  if (!efuns.checkWritePermission(srcPath)) {
    ctx.sendLine(`{red}Permission denied: cannot move ${srcPath}{/}`);
    return;
  }

  try {
    // Check source exists
    const srcExists = await efuns.fileExists(srcPath);
    if (!srcExists) {
      ctx.sendLine(`{red}No such file or directory: ${srcPath}{/}`);
      return;
    }

    // Check if destination is an existing directory
    const destExists = await efuns.fileExists(destPath);
    if (destExists) {
      const destStat = await efuns.fileStat(destPath);
      if (destStat.isDirectory) {
        // Moving into a directory - append source filename
        destPath = joinPath(destPath, basename(srcPath));
      }
    }

    // Check write permission on destination
    if (!efuns.checkWritePermission(destPath)) {
      ctx.sendLine(`{red}Permission denied: cannot write to ${destPath}{/}`);
      return;
    }

    // Perform move
    await efuns.moveFile(srcPath, destPath);
    ctx.sendLine(`{green}Moved: ${srcPath} -> ${destPath}{/}`);
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

export default { name, description, usage, execute };
