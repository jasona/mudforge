/**
 * cat command - Display file contents.
 *
 * Usage:
 *   cat <file>          - Display entire file
 *   cat -n <file>       - Display with line numbers
 *   cat -h <n> <file>   - Display first n lines (head)
 *   cat -t <n> <file>   - Display last n lines (tail)
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath } from '../../lib/path-utils.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  fileExists(path: string): Promise<boolean>;
  fileStat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }>;
  readFile(path: string): Promise<string>;
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

export const name = ['cat', 'more'];
export const description = 'Display file contents';
export const usage = 'cat [-n] [-h <lines>] [-t <lines>] <file>';

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';

  // Parse arguments
  let args = ctx.args.trim();
  let showLineNumbers = false;
  let headLines: number | null = null;
  let tailLines: number | null = null;

  // Extract flags
  const parts = args.split(/\s+/);
  const fileParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '-n') {
      showLineNumbers = true;
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

  const filePath = fileParts.join(' ');

  if (!filePath) {
    ctx.sendLine('Usage: cat [-n] [-h <lines>] [-t <lines>] <file>');
    return;
  }

  // Resolve the path
  const resolvedPath = resolvePath(currentCwd, filePath);

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

    // Warn about large files
    if (stat.size > 50000) {
      ctx.sendLine(`{yellow}Warning: Large file (${stat.size} bytes). Use -h or -t to limit output.{/}`);
    }

    // Read the file
    const content = await efuns.readFile(resolvedPath);
    let lines = content.split('\n');

    // Apply head/tail limits
    if (headLines !== null) {
      lines = lines.slice(0, headLines);
    } else if (tailLines !== null) {
      lines = lines.slice(-tailLines);
    }

    // Output with optional line numbers
    if (showLineNumbers) {
      const startLine = tailLines !== null ? Math.max(1, content.split('\n').length - tailLines + 1) : 1;
      lines.forEach((line, index) => {
        const lineNum = (startLine + index).toString().padStart(4);
        ctx.sendLine(`{dim}${lineNum}{/}  ${line}`);
      });
    } else {
      for (const line of lines) {
        ctx.sendLine(line);
      }
    }
  } catch (error) {
    ctx.sendLine(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}`);
  }
}

export default { name, description, usage, execute };
