/**
 * rm command - Remove files.
 *
 * Usage:
 *   rm <file>         - Remove a file
 *   rm -f <file>      - Force remove without confirmation
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath, basename } from '../../lib/path-utils.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  fileExists(path: string): Promise<boolean>;
  fileStat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }>;
  removeFile(path: string): Promise<void>;
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

export const name = ['rm', 'del'];
export const description = 'Remove a file';
export const usage = 'rm [-f] <file>';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';

  // Parse arguments
  let args = ctx.args.trim();
  let force = false;

  // Check for -f flag
  if (args.startsWith('-f ')) {
    force = true;
    args = args.slice(3).trim();
  }

  if (!args) {
    ctx.sendLine('Usage: rm [-f] <file>');
    return;
  }

  // Resolve the path
  const resolvedPath = resolvePath(currentCwd, args);

  // Safety check - don't allow removing critical files
  const fileName = basename(resolvedPath);
  const protectedFiles = ['master.ts', 'login.ts'];
  if (protectedFiles.includes(fileName) && !force) {
    ctx.sendLine(`{yellow}Warning: ${fileName} is a critical file. Use 'rm -f' to force removal.{/}`);
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
      ctx.sendLine(`{red}No such file: ${resolvedPath}{/}`);
      return;
    }

    // Check if it's a file
    const stat = await efuns.fileStat(resolvedPath);
    if (stat.isDirectory) {
      ctx.sendLine(`{red}Is a directory. Use 'rmdir' instead: ${resolvedPath}{/}`);
      return;
    }

    // Remove file
    await efuns.removeFile(resolvedPath);
    ctx.sendLine(`{green}Removed: ${resolvedPath}{/}`);
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

export default { name, description, usage, execute };
