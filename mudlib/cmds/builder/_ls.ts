/**
 * ls command - List files and directories.
 *
 * Usage:
 *   ls [path]     - List contents of directory (default: cwd)
 *   ls -l [path]  - Long format with details
 *   ls -a [path]  - Show hidden files (starting with .)
 *   ls -la [path] - Long format with hidden files
 */

import type { MudObject } from '../../lib/std.js';
import { resolvePath, joinPath, getHomeDir } from '../../lib/path-utils.js';

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

interface EntryStat {
  name: string;
  stat: {
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    mtime: Date;
  };
}

export const name = ['ls', 'dir'];
export const description = 'List files and directories';
export const usage = 'ls [-la] [path]';

/** Assumed terminal width for column calculations */
const TERMINAL_WIDTH = 80;

/** Files that should be hidden from ls (security-critical config files) */
const HIDDEN_SYSTEM_FILES = [
  'tsconfig.json',
  'package.json',
  'package-lock.json',
  '.env',
  '.gitignore',
  '.git',
  'node_modules',
];

/**
 * Convert a glob pattern to a RegExp.
 * Supports * (any chars) and ? (single char).
 */
function globToRegex(pattern: string): RegExp {
  let regex = '^';
  for (const ch of pattern) {
    if (ch === '*') regex += '.*';
    else if (ch === '?') regex += '.';
    else if ('.+^${}()|[]\\'.includes(ch)) regex += '\\' + ch;
    else regex += ch;
  }
  regex += '$';
  return new RegExp(regex, 'i');
}

/**
 * Check if a string contains glob wildcard characters.
 */
function hasGlob(str: string): boolean {
  return str.includes('*') || str.includes('?');
}

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);

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

  try {
    // Check for glob patterns in the argument
    if (args && hasGlob(args)) {
      // Split into directory and pattern parts
      const lastSlash = args.lastIndexOf('/');
      let dirArg: string;
      let pattern: string;
      if (lastSlash >= 0) {
        dirArg = args.substring(0, lastSlash) || '/';
        pattern = args.substring(lastSlash + 1);
      } else {
        dirArg = '';
        pattern = args;
      }

      const dirPath = dirArg ? resolvePath(currentCwd, dirArg, homeDir) : currentCwd;

      if (!efuns.checkReadPermission(dirPath)) {
        ctx.sendLine(`{red}Permission denied: ${dirPath}{/}`);
        return;
      }

      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        ctx.sendLine(`{red}No such directory: ${dirPath}{/}`);
        return;
      }

      let entries = await efuns.readDir(dirPath);
      const re = globToRegex(pattern);
      entries = entries.filter((e) => re.test(e));

      if (!showHidden) {
        entries = entries.filter((e) => !e.startsWith('.'));
      }

      if (entries.length === 0) {
        ctx.sendLine(`{red}No matches: ${args}{/}`);
        return;
      }

      const entryStats: EntryStat[] = [];
      for (const entry of entries) {
        try {
          const entryPath = joinPath(dirPath, entry);
          const entryStat = await efuns.fileStat(entryPath);
          entryStats.push({ name: entry, stat: entryStat });
        } catch {
          entryStats.push({
            name: entry,
            stat: { isFile: true, isDirectory: false, size: 0, mtime: new Date() },
          });
        }
      }

      entryStats.sort((a, b) => {
        if (a.stat.isDirectory && !b.stat.isDirectory) return -1;
        if (!a.stat.isDirectory && b.stat.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      if (longFormat) {
        displayLongFormat(ctx, entryStats);
      } else {
        displayColumnFormat(ctx, entryStats);
      }
      return;
    }

    // No glob - resolve target path normally
    const targetPath = args ? resolvePath(currentCwd, args, homeDir) : currentCwd;

    // Check read permission
    if (!efuns.checkReadPermission(targetPath)) {
      ctx.sendLine(`{red}Permission denied: ${targetPath}{/}`);
      return;
    }

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
        ctx.sendLine(formatLongEntry(args || targetPath, stat));
      } else {
        ctx.sendLine(colorizeEntry(args || targetPath, stat));
      }
      return;
    }

    // It's a directory - list contents
    let entries = await efuns.readDir(targetPath);

    // Filter hidden files unless -a
    if (!showHidden) {
      entries = entries.filter((e) => !e.startsWith('.'));
    }

    // Always filter out security-critical system files (regardless of -a flag)
    // These files should not be visible or editable from in-game
    const isRootDir = targetPath === '/' || targetPath === '';
    if (isRootDir) {
      entries = entries.filter((e) => !HIDDEN_SYSTEM_FILES.includes(e.toLowerCase()));
    }

    // Gather stats for all entries
    const entryStats: EntryStat[] = [];
    for (const entry of entries) {
      try {
        const entryPath = joinPath(targetPath, entry);
        const entryStat = await efuns.fileStat(entryPath);
        entryStats.push({ name: entry, stat: entryStat });
      } catch {
        // Skip entries we can't stat
        entryStats.push({
          name: entry,
          stat: { isFile: true, isDirectory: false, size: 0, mtime: new Date() },
        });
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
      displayLongFormat(ctx, entryStats);
    } else {
      displayColumnFormat(ctx, entryStats);
    }
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

/**
 * Display entries in column format (default ls output).
 */
function displayColumnFormat(ctx: CommandContext, entries: EntryStat[]): void {
  // Calculate the width needed for each entry (name + decoration)
  const displayNames = entries.map((e) => {
    const suffix = e.stat.isDirectory ? '/' : '';
    return { name: e.name + suffix, entry: e };
  });

  // Find the longest name to determine column width
  const maxLen = Math.max(...displayNames.map((d) => d.name.length));
  const colWidth = maxLen + 2; // Add spacing between columns

  // Calculate number of columns that fit
  const numCols = Math.max(1, Math.floor(TERMINAL_WIDTH / colWidth));

  // Calculate number of rows needed
  const numRows = Math.ceil(entries.length / numCols);

  // Build output row by row (filling columns top-to-bottom, left-to-right)
  for (let row = 0; row < numRows; row++) {
    let line = '';
    for (let col = 0; col < numCols; col++) {
      const idx = col * numRows + row;
      if (idx >= displayNames.length) break;

      const display = displayNames[idx];
      const colored = colorizeEntry(display.name, display.entry.stat);

      // Calculate visible length (without color codes)
      const visibleLen = display.name.length;
      const padding = col < numCols - 1 ? ' '.repeat(Math.max(1, colWidth - visibleLen)) : '';

      line += colored + padding;
    }
    ctx.sendLine(line);
  }
}

/**
 * Display entries in long format (ls -l output).
 */
function displayLongFormat(ctx: CommandContext, entries: EntryStat[]): void {
  // Calculate total size
  const totalSize = entries.reduce((sum, e) => sum + e.stat.size, 0);

  // Find max size width for alignment
  const maxSize = Math.max(...entries.map((e) => e.stat.size));
  const sizeWidth = Math.max(6, maxSize.toString().length);

  // Header
  ctx.sendLine(efuns.sprintf('{dim}total %d (%s){/}', entries.length, formatSize(totalSize)));
  ctx.sendLine(
    efuns.sprintf(
      '{dim}%-10s %' + sizeWidth + 's  %-12s  %s{/}',
      'Type',
      'Size',
      'Modified',
      'Name'
    )
  );
  ctx.sendLine('{dim}' + '-'.repeat(50) + '{/}');

  // Entries
  for (const entry of entries) {
    ctx.sendLine(formatLongEntry(entry.name, entry.stat, sizeWidth));
  }
}

/**
 * Format a single entry for long listing.
 */
function formatLongEntry(
  name: string,
  stat: { isFile: boolean; isDirectory: boolean; size: number; mtime: Date },
  sizeWidth: number = 8
): string {
  const typeStr = stat.isDirectory ? '{blue}dir{/}      ' : getFileType(name);
  const sizeStr = efuns.sprintf('%' + sizeWidth + 's', formatSize(stat.size));
  const dateStr = formatDate(stat.mtime);
  const displayName = colorizeEntry(name + (stat.isDirectory ? '/' : ''), stat);

  return efuns.sprintf('%-10s %s  %-12s  %s', typeStr, sizeStr, dateStr, displayName);
}

/**
 * Get file type description based on extension.
 */
function getFileType(name: string): string {
  if (name.endsWith('.ts')) return '{green}source{/}   ';
  if (name.endsWith('.js')) return '{yellow}script{/}   ';
  if (name.endsWith('.json')) return '{cyan}json{/}     ';
  if (name.endsWith('.md')) return '{magenta}markdown{/} ';
  if (name.endsWith('.txt')) return 'text      ';
  if (name.endsWith('.log')) return '{dim}log{/}       ';
  return 'file      ';
}

/**
 * Colorize an entry name based on its type.
 */
function colorizeEntry(
  name: string,
  stat: { isFile: boolean; isDirectory: boolean }
): string {
  if (stat.isDirectory) {
    return `{blue}${name}{/}`;
  }

  // Color by extension
  if (name.endsWith('.ts')) return `{green}${name}{/}`;
  if (name.endsWith('.js')) return `{yellow}${name}{/}`;
  if (name.endsWith('.json')) return `{cyan}${name}{/}`;
  if (name.endsWith('.md')) return `{magenta}${name}{/}`;
  if (name.endsWith('.log')) return `{dim}${name}{/}`;

  return name;
}

/**
 * Format a file size in human-readable format.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return efuns.sprintf('%dB', bytes);
  }
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb >= 10 ? efuns.sprintf('%dK', Math.round(kb)) : efuns.sprintf('%.1fK', kb);
  }
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return mb >= 10 ? efuns.sprintf('%dM', Math.round(mb)) : efuns.sprintf('%.1fM', mb);
  }
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 10 ? efuns.sprintf('%dG', Math.round(gb)) : efuns.sprintf('%.1fG', gb);
}

/**
 * Format a date for ls -l output.
 */
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const thisYear = now.getFullYear();
  const fileYear = date.getFullYear();

  const month = months[date.getMonth()];
  const day = efuns.sprintf('%2d', date.getDate());

  // Show time for recent files, year for older files
  if (fileYear === thisYear) {
    const hours = efuns.sprintf('%02d', date.getHours());
    const mins = efuns.sprintf('%02d', date.getMinutes());
    return efuns.sprintf('%s %s %s:%s', month, day, hours, mins);
  } else {
    return efuns.sprintf('%s %s  %d', month, day, fileYear);
  }
}

export default { name, description, usage, execute };
