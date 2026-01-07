/**
 * cat command - Display file contents with paging support.
 *
 * Usage:
 *   cat <file>          - Display entire file (paged if long)
 *   cat -n <file>       - Display with line numbers
 *   cat -h <n> <file>   - Display first n lines (head)
 *   cat -t <n> <file>   - Display last n lines (tail)
 *   cat -a <file>       - Display all without paging
 *
 * Paging Controls:
 *   Enter/Space  - Next page
 *   b            - Previous page
 *   g/G          - Go to beginning/end
 *   /<pattern>   - Search
 *   n            - Next search result
 *   q            - Quit
 */

import type { MudObject } from '../../lib/std.js';
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

export const name = ['cat', 'more'];
export const description = 'Display file contents with paging';
export const usage = 'cat [-n] [-a] [-h <lines>] [-t <lines>] <file>';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);

  // Parse arguments
  const args = ctx.args.trim();
  let showLineNumbers = false;
  let headLines: number | null = null;
  let tailLines: number | null = null;
  let noPaging = false;

  // Extract flags
  const parts = args.split(/\s+/);
  const fileParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '-n') {
      showLineNumbers = true;
    } else if (part === '-a') {
      noPaging = true;
    } else if (part === '-h' && i + 1 < parts.length) {
      headLines = parseInt(parts[++i], 10);
      if (isNaN(headLines) || headLines < 1) {
        ctx.sendLine('{red}Invalid line count for -h{/}');
        return;
      }
    } else if (part === '-t' && i + 1 < parts.length) {
      tailLines = parseInt(parts[++i], 10);
      if (isNaN(tailLines) || tailLines < 1) {
        ctx.sendLine('{red}Invalid line count for -t{/}');
        return;
      }
    } else if (!part.startsWith('-')) {
      fileParts.push(part);
    }
  }

  let filePath = fileParts.join(' ');

  if (!filePath) {
    ctx.sendLine('Usage: cat [-n] [-a] [-h <lines>] [-t <lines>] <file>');
    ctx.sendLine('  -n  Show line numbers');
    ctx.sendLine('  -a  Show all without paging');
    ctx.sendLine('  -h  Show first N lines (head)');
    ctx.sendLine('  -t  Show last N lines (tail)');
    ctx.sendLine('  here - View the current room file');
    return;
  }

  // Handle "here" - current room
  if (filePath.toLowerCase() === 'here') {
    const env = ctx.player.environment;
    if (!env) {
      ctx.sendLine('{red}You are not in a room.{/}');
      return;
    }
    const roomPath = env.objectPath;
    if (!roomPath) {
      ctx.sendLine('{red}Cannot determine current room path.{/}');
      return;
    }
    filePath = roomPath + '.ts';
  }

  // Resolve the path
  const resolvedPath = resolvePath(currentCwd, filePath, homeDir);

  // Check read permission
  if (!efuns.checkReadPermission(resolvedPath)) {
    ctx.sendLine(`{red}Permission denied: ${resolvedPath}{/}`);
    return;
  }

  try {
    // Check if path exists
    const exists = await efuns.fileExists(resolvedPath);
    if (!exists) {
      ctx.sendLine(`{red}No such file: ${resolvedPath}{/}`);
      return;
    }

    const stat = await efuns.fileStat(resolvedPath);
    if (stat.isDirectory) {
      ctx.sendLine(`{red}Is a directory: ${resolvedPath}{/}`);
      return;
    }

    // Read the file
    const content = await efuns.readFile(resolvedPath);
    let lines = content.split('\n');
    let startLineOffset = 1;

    // Apply head/tail limits
    if (headLines !== null) {
      lines = lines.slice(0, headLines);
    } else if (tailLines !== null) {
      startLineOffset = Math.max(1, content.split('\n').length - tailLines + 1);
      lines = lines.slice(-tailLines);
    }

    // Format lines with line numbers if requested
    let displayLines: string[];
    if (showLineNumbers) {
      displayLines = lines.map((line, index) => {
        const lineNum = (startLineOffset + index).toString().padStart(4);
        return `{dim}${lineNum}{/}  ${line}`;
      });
    } else {
      displayLines = lines;
    }

    // Use pager for long content, unless -a flag or head/tail is used
    const usePaging = !noPaging && headLines === null && tailLines === null;

    if (usePaging && typeof efuns.page === 'function') {
      // Use the pager efun
      efuns.page(displayLines, {
        title: resolvedPath,
        linesPerPage: 20,
      });
    } else {
      // Direct output without paging
      for (const line of displayLines) {
        ctx.sendLine(line);
      }
    }
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

export default { name, description, usage, execute };
