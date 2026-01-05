/**
 * cd command - Change current working directory.
 *
 * Usage:
 *   cd <path>     - Change to specified directory
 *   cd            - Change to root (/)
 *   cd ~          - Change to root (/)
 *   cd ..         - Change to parent directory
 *   cd -          - Change to previous directory
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath, getHomeDir } from '../../lib/path-utils.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  fileExists(path: string): Promise<boolean>;
  fileStat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }>;
  checkReadPermission(path: string): boolean;
};

interface PlayerWithCwd extends MudObject {
  cwd: string;
  name: string;
  setProperty(key: string, value: unknown): void;
  getProperty(key: string): unknown;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['cd'];
export const description = 'Change current working directory';
export const usage = 'cd [path]';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);
  let targetPath = ctx.args.trim();

  // Handle empty path or no args -> go to home directory
  if (!targetPath) {
    player.cwd = homeDir;
    ctx.sendLine(homeDir);
    return;
  }

  // Handle ~ -> go to home directory
  if (targetPath === '~') {
    player.cwd = homeDir;
    ctx.sendLine(homeDir);
    return;
  }

  // Handle cd - (go to previous directory)
  if (targetPath === '-') {
    const prevDir = player.getProperty('_prevCwd') as string | undefined;
    if (prevDir) {
      player.setProperty('_prevCwd', currentCwd);
      player.cwd = prevDir;
      ctx.sendLine(prevDir);
    } else {
      ctx.sendLine('{yellow}No previous directory.{/}');
    }
    return;
  }

  // Resolve the path
  const resolvedPath = resolvePath(currentCwd, targetPath, homeDir);

  // Check read permission
  if (!efuns.checkReadPermission(resolvedPath)) {
    ctx.sendLine(`{red}Permission denied: ${resolvedPath}{/}`);
    return;
  }

  // Check if path exists and is a directory
  try {
    const exists = await efuns.fileExists(resolvedPath);
    if (!exists) {
      ctx.sendLine(`{red}No such directory: ${resolvedPath}{/}`);
      return;
    }

    const stat = await efuns.fileStat(resolvedPath);
    if (!stat.isDirectory) {
      ctx.sendLine(`{red}Not a directory: ${resolvedPath}{/}`);
      return;
    }

    // Save previous directory and change
    player.setProperty('_prevCwd', currentCwd);
    player.cwd = resolvedPath;
    ctx.sendLine(resolvedPath);
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

export default { name, description, usage, execute };
