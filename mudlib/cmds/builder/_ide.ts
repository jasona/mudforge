/**
 * ide command - Visual IDE editor for creating and editing files.
 *
 * Opens a full-featured code editor in the web client with syntax highlighting,
 * line numbers, search/replace, and error display.
 *
 * Usage:
 *   ide <file>         - Open file for editing (creates new if doesn't exist)
 *   ide                - Show help
 */

import type { MudObject } from '../../lib/std.js';
import { resolvePath, getHomeDir } from '../../lib/path-utils.js';

interface PlayerWithCwd extends MudObject {
  cwd: string;
  name: string;
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
  connection?: { send: (msg: string) => void };
  _connection?: { send: (msg: string) => void };
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['ide'];
export const description = 'Visual IDE editor';
export const usage = 'ide <file>';

/**
 * Detect language from file extension.
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'js':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    default:
      return 'typescript'; // Default for mudlib files
  }
}

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);

  if (!ctx.args.trim()) {
    showHelp(ctx);
    return;
  }

  let fileArg = ctx.args.trim();

  // Handle "here" - current room
  if (fileArg.toLowerCase() === 'here') {
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
    fileArg = roomPath + '.ts';
  }

  // Resolve file path
  const filePath = resolvePath(currentCwd, fileArg, homeDir);

  // Check write permission (determines readOnly)
  const canWrite = efuns.checkWritePermission(filePath);
  const canRead = efuns.checkReadPermission(filePath);

  if (!canRead && !canWrite) {
    ctx.sendLine(`{red}Permission denied: ${filePath}{/}`);
    return;
  }

  // Load file content or start empty
  let content = '';
  try {
    const exists = await efuns.fileExists(filePath);
    if (exists) {
      content = await efuns.readFile(filePath);
      ctx.sendLine(`{cyan}Opening in IDE: ${filePath}{/}`);
    } else {
      if (!canWrite) {
        ctx.sendLine(`{red}Cannot create file (no write permission): ${filePath}{/}`);
        return;
      }
      ctx.sendLine(`{cyan}New file in IDE: ${filePath}{/}`);
    }
  } catch (error) {
    ctx.sendLine(
      `{red}Error loading file: ${error instanceof Error ? error.message : String(error)}{/}`
    );
    return;
  }

  // Send IDE open message to client
  efuns.ideOpen({
    action: 'open',
    path: filePath,
    content: content,
    readOnly: !canWrite,
    language: detectLanguage(filePath),
  });

  // Set up input handler for IDE responses
  player.setInputHandler(async (input: string) => {
    await handleIdeInput(player, filePath, input);
  });
}

/**
 * Handle IDE input (save messages from client).
 */
async function handleIdeInput(
  player: PlayerWithCwd,
  originalPath: string,
  input: string
): Promise<void> {
  // Check if this is an IDE message
  if (!input.startsWith('\x00[IDE]')) {
    // Regular input - might be "close" or escape
    const cmd = input.trim().toLowerCase();
    if (cmd === 'close' || cmd === 'cancel' || cmd === 'q' || cmd === 'quit') {
      player.setInputHandler(null);
      player.receive('{cyan}IDE closed.{/}\n');
      return;
    }
    // Show reminder that IDE is open
    player.receive('{dim}(IDE is open in browser. Type "close" to exit IDE mode.){/}\n');
    return;
  }

  // Parse IDE message
  const jsonStr = input.slice(6); // Remove \x00[IDE] prefix
  let message: { action: string; path?: string; content?: string };

  try {
    message = JSON.parse(jsonStr);
  } catch {
    player.receive('{red}Invalid IDE message{/}\n');
    return;
  }

  if (message.action === 'save') {
    await handleSave(player, message.path || originalPath, message.content || '');
  } else if (message.action === 'close') {
    player.setInputHandler(null);
    player.receive('{cyan}IDE closed.{/}\n');
  }
}

/**
 * Check if a file path is a command file.
 */
function isCommandFile(filePath: string): boolean {
  // Command files are in /cmds/ directory
  return filePath.includes('/cmds/');
}

/**
 * Handle save action.
 */
async function handleSave(player: PlayerWithCwd, filePath: string, content: string): Promise<void> {
  try {
    // Write file
    await efuns.writeFile(filePath, content);

    // Try to reload/compile if it's a TypeScript file
    let compileErrors: Array<{ line: number; column: number; message: string }> = [];

    if (filePath.endsWith('.ts')) {
      if (isCommandFile(filePath)) {
        // Command files use rehashCommands to reload
        const result = await efuns.rehashCommands();
        if (!result.success && result.error) {
          compileErrors = parseCompileErrors(result.error);
        }
      } else {
        // Regular mudlib objects use reloadObject
        const objectPath = filePath.replace(/\.ts$/, '');
        const result = await efuns.reloadObject(objectPath);

        if (!result.success && result.error) {
          // Parse compile errors from the error message
          compileErrors = parseCompileErrors(result.error);
        }
      }
    }

    // Send result to client via connection (bypassing colorization)
    const connection = player.connection || player._connection;
    if (connection?.send) {
      if (compileErrors.length > 0) {
        const resultMsg = JSON.stringify({
          action: 'save-result',
          path: filePath,
          success: false,
          errors: compileErrors,
          message: `File saved but has ${compileErrors.length} compile error(s)`,
        });
        connection.send(`\x00[IDE]${resultMsg}\n`);
        player.receive(`{yellow}File saved with ${compileErrors.length} error(s){/}\n`);
      } else {
        const resultMsg = JSON.stringify({
          action: 'save-result',
          path: filePath,
          success: true,
          message: 'File saved and compiled successfully',
        });
        connection.send(`\x00[IDE]${resultMsg}\n`);
        player.receive(`{green}File saved: ${filePath}{/}\n`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const connection = player.connection || player._connection;
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        path: filePath,
        success: false,
        message: errorMsg,
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }
    player.receive(`{red}Error saving: ${errorMsg}{/}\n`);
  }
}

/**
 * Parse compile errors from error message.
 */
function parseCompileErrors(
  errorStr: string
): Array<{ line: number; column: number; message: string }> {
  const errors: Array<{ line: number; column: number; message: string }> = [];

  // Match patterns like "error TS2304: Cannot find name 'foo'." or "(5,10): error..."
  // Also match esbuild errors like "main.ts:5:10: error: ..."
  const lineRegex = /(?:\((\d+),(\d+)\)|:(\d+):(\d+))[:\s]+(?:error\s+\w+:\s*)?(.+)/gi;
  let match;

  while ((match = lineRegex.exec(errorStr)) !== null) {
    const line = parseInt(match[1] || match[3] || '1', 10);
    const column = parseInt(match[2] || match[4] || '1', 10);
    const message = match[5]?.trim() || 'Unknown error';
    errors.push({ line, column, message });
  }

  // If no structured errors found, return a generic one
  if (errors.length === 0 && errorStr.trim()) {
    errors.push({ line: 1, column: 1, message: errorStr.trim() });
  }

  return errors;
}

/**
 * Show help.
 */
function showHelp(ctx: CommandContext): void {
  ctx.sendLine(`
{cyan}Visual IDE Editor{/}

Usage: ide <file>

Opens a full-featured code editor in your browser with:
  - Syntax highlighting for TypeScript, JavaScript, JSON, CSS, HTML
  - Line numbers
  - Search/replace (Ctrl+F)
  - Auto-indent and bracket matching
  - Real-time error display after save

{bold}Keyboard Shortcuts:{/}
  Ctrl+S     - Save file
  Escape     - Close editor (prompts if unsaved changes)
  Ctrl+F     - Find/Replace

{bold}Examples:{/}
  ide myfile.ts       - Edit/create myfile.ts in current directory
  ide /std/mylib.ts   - Edit using absolute path
  ide ~/test.ts       - Edit in your home directory
`);
}

export default { name, description, usage, execute };
