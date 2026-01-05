/**
 * ls command - List files and directories.
 *
 * Usage:
 *   ls [path]     - List contents of directory (default: cwd)
 *   ls -l [path]  - Long format with details
 *   ls -a [path]  - Show hidden files (starting with .)
 *   ls -la [path] - Long format with hidden files
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath, joinPath } from '../../lib/path-utils.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  fileExists(path: string): Promise<boolean>;
  fileStat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }>;
  readDir(path: string): Promise<string[]>;
  checkReadPermission(path: string): boolean;
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

export const name = ['ls', 'dir'];
export const description = 'List files and directories';
export const usage = 'ls [-la] [path]';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';

  // Parse arguments
  let args = ctx.args.trim();
  let longFormat = false;
  let showHidden = false;

  // Extract flags
  const flagMatch = args.match(/^(-[la]+)\s*/);
  if (flagMatch) {
    const flags = flagMatch[1];
    longFormat = flags.includes('l');
    showHidden = flags.includes('a');
    args = args.slice(flagMatch[0].length);
  }

  // Resolve target path
  const targetPath = args ? resolvePath(currentCwd, args) : currentCwd;

  // Check read permission
  if (!efuns.checkReadPermission(targetPath)) {
    ctx.sendLine(`{red}Permission denied: ${targetPath}{/}`);
    return;
  }

  try {
    // Check if path exists
    const exists = await efuns.fileExists(targetPath);
    if (!exists) {
      ctx.sendLine(`{red}No such file or directory: ${targetPath}{/}`);
      return;
    }

    const stat = await efuns.fileStat(targetPath);

    // If it's a file, just show it
    if (stat.isFile) {
      if (longFormat) {
        ctx.sendLine(formatEntry(args || targetPath, stat, false));
      } else {
        ctx.sendLine(args || targetPath);
      }
      return;
    }

    // It's a directory - list contents
    let entries = await efuns.readDir(targetPath);

    // Filter hidden files unless -a
    if (!showHidden) {
      entries = entries.filter((e) => !e.startsWith('.'));
    }

    // Sort entries (directories first, then alphabetically)
    const entryStats: Array<{ name: string; stat: { isFile: boolean; isDirectory: boolean; size: number; mtime: Date } }> = [];
    for (const entry of entries) {
      try {
        const entryPath = joinPath(targetPath, entry);
        const entryStat = await efuns.fileStat(entryPath);
        entryStats.push({ name: entry, stat: entryStat });
      } catch {
        // Skip entries we can't stat
        entryStats.push({ name: entry, stat: { isFile: true, isDirectory: false, size: 0, mtime: new Date() } });
      }
    }

    // Sort: directories first, then alphabetically
    entryStats.sort((a, b) => {
      if (a.stat.isDirectory && !b.stat.isDirectory) return -1;
      if (!a.stat.isDirectory && b.stat.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    if (entryStats.length === 0) {
      ctx.sendLine('{dim}(empty){/}');
      return;
    }

    if (longFormat) {
      // Long format
      ctx.sendLine(`{dim}total ${entryStats.length}{/}`);
      for (const entry of entryStats) {
        ctx.sendLine(formatEntry(entry.name, entry.stat, true));
      }
    } else {
      // Short format - multi-column
      const output = entryStats.map((e) => {
        if (e.stat.isDirectory) {
          return `{blue}${e.name}/{/}`;
        }
        if (e.name.endsWith('.ts')) {
          return `{green}${e.name}{/}`;
        }
        return e.name;
      });

      // Simple column layout
      ctx.sendLine(output.join('  '));
    }
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

/**
 * Format a single entry for long listing.
 */
function formatEntry(
  name: string,
  stat: { isFile: boolean; isDirectory: boolean; size: number; mtime: Date },
  colorize: boolean
): string {
  const type = stat.isDirectory ? 'd' : '-';
  const perms = 'rw-r--r--'; // Simplified
  const size = stat.size.toString().padStart(8);
  const date = formatDate(stat.mtime);

  let displayName = name;
  if (colorize) {
    if (stat.isDirectory) {
      displayName = `{blue}${name}/{/}`;
    } else if (name.endsWith('.ts')) {
      displayName = `{green}${name}{/}`;
    }
  }

  return `${type}${perms}  ${size}  ${date}  ${displayName}`;
}

/**
 * Format a date for ls -l output.
 */
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2);
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day} ${hours}:${mins}`;
}

export default { name, description, usage, execute };
