/**
 * rm command - Remove files.
 *
 * Usage:
 *   rm <file>         - Remove a file
 *   rm <pattern>      - Remove files matching wildcard pattern (*, ?)
 *   rm -f <file>      - Force remove without confirmation
 */

import type { MudObject } from '../../lib/std.js';
import { resolvePath, basename, dirname, getHomeDir } from '../../lib/path-utils.js';

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

export const name = ['rm', 'del'];
export const description = 'Remove a file or files matching a pattern';
export const usage = 'rm [-f] <file|pattern>';

/**
 * Convert a simple wildcard pattern to a regex.
 * Supports * (any chars) and ? (single char).
 */
function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '.*')                  // * -> .*
    .replace(/\?/g, '.');                  // ? -> .
  return new RegExp(`^${escaped}$`);
}

/**
 * Check if a pattern contains wildcard characters.
 */
function hasWildcard(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?');
}

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);

  // Parse arguments
  let args = ctx.args.trim();
  let force = false;

  // Check for -f flag
  if (args.startsWith('-f ')) {
    force = true;
    args = args.slice(3).trim();
  }

  if (!args) {
    ctx.sendLine('Usage: rm [-f] <file|pattern>');
    ctx.sendLine('  Wildcards: * (any chars), ? (single char)');
    ctx.sendLine('  Example: rm *.ts  rm test?.txt');
    return;
  }

  // Check if the pattern contains wildcards
  if (hasWildcard(args)) {
    await removeWithWildcard(ctx, currentCwd, homeDir, args, force);
  } else {
    await removeSingleFile(ctx, currentCwd, homeDir, args, force);
  }
}

/**
 * Remove files matching a wildcard pattern.
 */
async function removeWithWildcard(
  ctx: CommandContext,
  cwd: string,
  homeDir: string,
  pattern: string,
  force: boolean
): Promise<void> {
  // Split pattern into directory and file pattern
  // e.g., "foo/*.ts" -> dir="foo", filePattern="*.ts"
  // e.g., "*.ts" -> dir=".", filePattern="*.ts"
  const patternBasename = basename(pattern);
  const patternDir = pattern.includes('/') ? dirname(pattern) : '.';

  // Resolve the directory path
  const resolvedDir = resolvePath(cwd, patternDir, homeDir);

  // Check write permission on directory
  if (!efuns.checkWritePermission(resolvedDir)) {
    ctx.sendLine(`{red}Permission denied: ${resolvedDir}{/}`);
    return;
  }

  try {
    // Check if directory exists
    const dirExists = await efuns.fileExists(resolvedDir);
    if (!dirExists) {
      ctx.sendLine(`{red}No such directory: ${resolvedDir}{/}`);
      return;
    }

    // List directory contents
    const entries = await efuns.readDir(resolvedDir);
    const regex = wildcardToRegex(patternBasename);

    // Find matching files
    const matchingFiles: string[] = [];
    const protectedFiles = ['master.ts', 'login.ts'];

    for (const entry of entries) {
      if (regex.test(entry)) {
        const fullPath = resolvedDir === '/' ? `/${entry}` : `${resolvedDir}/${entry}`;

        // Check if it's a file (not directory)
        try {
          const stat = await efuns.fileStat(fullPath);
          if (stat.isDirectory) continue;

          // Check for protected files
          if (protectedFiles.includes(entry) && !force) {
            ctx.sendLine(`{yellow}Skipping protected file: ${entry} (use -f to force){/}`);
            continue;
          }

          matchingFiles.push(fullPath);
        } catch {
          // Skip files we can't stat
        }
      }
    }

    if (matchingFiles.length === 0) {
      ctx.sendLine(`{yellow}No files match pattern: ${pattern}{/}`);
      return;
    }

    // Remove matching files
    let removed = 0;
    let failed = 0;

    for (const filePath of matchingFiles) {
      try {
        await efuns.removeFile(filePath);
        ctx.sendLine(`{green}Removed: ${filePath}{/}`);
        removed++;
      } catch (error) {
        ctx.sendLine(`{red}Failed to remove ${filePath}: ${error instanceof Error ? error.message : String(error)}{/}`);
        failed++;
      }
    }

    // Summary
    if (matchingFiles.length > 1) {
      ctx.sendLine(`{cyan}Removed ${removed} file(s)${failed > 0 ? `, ${failed} failed` : ''}{/}`);
    }
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

/**
 * Remove a single file (no wildcards).
 */
async function removeSingleFile(
  ctx: CommandContext,
  cwd: string,
  homeDir: string,
  filePath: string,
  force: boolean
): Promise<void> {
  // Resolve the path
  const resolvedPath = resolvePath(cwd, filePath, homeDir);

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
