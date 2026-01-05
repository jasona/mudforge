/**
 * ed command - Online line editor for creating and editing files.
 *
 * A simple but functional line editor for in-game file editing.
 *
 * Usage:
 *   ed <file>         - Open file for editing (creates new if doesn't exist)
 *   ed                - Show editor help
 *
 * Editor Commands:
 *   h                 - Show help
 *   p                 - Print all lines with numbers
 *   p <n>             - Print line n
 *   p <n>,<m>         - Print lines n through m
 *   a                 - Append lines after current position (end with . on own line)
 *   i <n>             - Insert before line n (end with . on own line)
 *   d <n>             - Delete line n
 *   d <n>,<m>         - Delete lines n through m
 *   c <n>             - Change line n (prompts for new text)
 *   s/<old>/<new>/    - Substitute first occurrence on current line
 *   s/<old>/<new>/g   - Substitute all occurrences on current line
 *   <n>               - Go to line n
 *   w                 - Write (save) file
 *   q                 - Quit (warns if unsaved changes)
 *   q!                - Quit without saving
 *   wq                - Write and quit
 */

import type { MudObject } from '../../std/object.js';
import { resolvePath, getHomeDir } from '../../lib/path-utils.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  checkReadPermission(path: string): boolean;
  checkWritePermission(path: string): boolean;
};

interface PlayerWithCwd extends MudObject {
  cwd: string;
  name: string;
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['ed', 'edit'];
export const description = 'Online line editor';
export const usage = 'ed <file>';

/**
 * Editor state for a player.
 */
interface EditorState {
  filePath: string;
  lines: string[];
  currentLine: number;
  modified: boolean;
  inputMode: 'command' | 'append' | 'insert' | 'change';
  insertPosition: number;
  newLines: string[];
}

export async function execute(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithCwd;
  const currentCwd = player.cwd || '/';
  const homeDir = getHomeDir(player.name);

  if (!ctx.args.trim()) {
    showHelp(ctx);
    return;
  }

  // Resolve file path
  const filePath = resolvePath(currentCwd, ctx.args.trim(), homeDir);

  // Check permissions
  if (!efuns.checkWritePermission(filePath)) {
    ctx.sendLine(`{red}Permission denied: ${filePath}{/}`);
    return;
  }

  // Load file or start with empty buffer
  let lines: string[] = [];
  try {
    const exists = await efuns.fileExists(filePath);
    if (exists) {
      if (!efuns.checkReadPermission(filePath)) {
        ctx.sendLine(`{red}Permission denied: ${filePath}{/}`);
        return;
      }
      const content = await efuns.readFile(filePath);
      lines = content.split('\n');
      ctx.sendLine(`{cyan}Editing: ${filePath} (${lines.length} lines){/}`);
    } else {
      ctx.sendLine(`{cyan}New file: ${filePath}{/}`);
    }
  } catch (error) {
    ctx.sendLine(`{red}Error loading file: ${error instanceof Error ? error.message : String(error)}{/}`);
    return;
  }

  // Create editor state
  const state: EditorState = {
    filePath,
    lines,
    currentLine: lines.length > 0 ? lines.length : 1,
    modified: false,
    inputMode: 'command',
    insertPosition: 0,
    newLines: [],
  };

  ctx.sendLine('{dim}Type "h" for help, "q" to quit.{/}');
  showPrompt(player, state);

  // Set up input handler
  player.setInputHandler(async (input: string) => {
    await handleEditorInput(player, state, input);
  });
}

/**
 * Show editor prompt.
 */
function showPrompt(player: PlayerWithCwd, state: EditorState): void {
  if (state.inputMode === 'command') {
    const modified = state.modified ? '*' : '';
    player.receive(`{dim}[${state.currentLine}/${state.lines.length}${modified}]{/} `);
  } else {
    player.receive('{dim}>{/} ');
  }
}

/**
 * Handle editor input.
 */
async function handleEditorInput(
  player: PlayerWithCwd,
  state: EditorState,
  input: string
): Promise<void> {
  // Handle input modes (append/insert/change)
  if (state.inputMode !== 'command') {
    if (input === '.') {
      // End of input
      if (state.inputMode === 'append') {
        // Insert new lines after current position
        state.lines.splice(state.insertPosition, 0, ...state.newLines);
        state.currentLine = state.insertPosition + state.newLines.length;
      } else if (state.inputMode === 'insert') {
        // Insert new lines before position
        state.lines.splice(state.insertPosition - 1, 0, ...state.newLines);
        state.currentLine = state.insertPosition - 1 + state.newLines.length;
      } else if (state.inputMode === 'change') {
        // Replace line with new content
        state.lines[state.insertPosition - 1] = state.newLines.join('\n');
        state.currentLine = state.insertPosition;
      }
      if (state.newLines.length > 0) {
        state.modified = true;
      }
      state.inputMode = 'command';
      state.newLines = [];
      player.receive(`{dim}(${state.lines.length} lines){/}\n`);
    } else {
      state.newLines.push(input);
    }
    showPrompt(player, state);
    return;
  }

  // Command mode
  const cmd = input.trim();

  // Empty command - do nothing
  if (!cmd) {
    showPrompt(player, state);
    return;
  }

  // Parse commands
  try {
    // Quit commands
    if (cmd === 'q') {
      if (state.modified) {
        player.receive('{yellow}Unsaved changes. Use "q!" to discard or "w" to save.{/}\n');
        showPrompt(player, state);
        return;
      }
      exitEditor(player);
      return;
    }

    if (cmd === 'q!') {
      exitEditor(player);
      return;
    }

    if (cmd === 'w' || cmd === 'wq') {
      await saveFile(player, state);
      if (cmd === 'wq') {
        exitEditor(player);
        return;
      }
      showPrompt(player, state);
      return;
    }

    // Help
    if (cmd === 'h' || cmd === 'help' || cmd === '?') {
      showEditorHelp(player);
      showPrompt(player, state);
      return;
    }

    // Print
    if (cmd === 'p' || cmd.startsWith('p ') || cmd.match(/^p\d/)) {
      handlePrint(player, state, cmd);
      showPrompt(player, state);
      return;
    }

    // Print all
    if (cmd === '%p' || cmd === ',p') {
      printLines(player, state, 1, state.lines.length);
      showPrompt(player, state);
      return;
    }

    // Append
    if (cmd === 'a') {
      state.inputMode = 'append';
      state.insertPosition = state.currentLine;
      state.newLines = [];
      player.receive('{dim}Enter text, end with "." on its own line:{/}\n');
      showPrompt(player, state);
      return;
    }

    // Insert
    if (cmd === 'i' || cmd.match(/^i\s*\d+$/)) {
      const match = cmd.match(/^i\s*(\d+)?$/);
      const lineNum = match && match[1] ? parseInt(match[1], 10) : state.currentLine;
      if (lineNum < 1 || lineNum > state.lines.length + 1) {
        player.receive(`{red}Invalid line number: ${lineNum}{/}\n`);
        showPrompt(player, state);
        return;
      }
      state.inputMode = 'insert';
      state.insertPosition = lineNum;
      state.newLines = [];
      player.receive(`{dim}Insert before line ${lineNum}. End with "." on its own line:{/}\n`);
      showPrompt(player, state);
      return;
    }

    // Delete
    if (cmd.match(/^d\s*(\d+)?(,\d+)?$/)) {
      handleDelete(player, state, cmd);
      showPrompt(player, state);
      return;
    }

    // Change
    if (cmd.match(/^c\s*\d+$/)) {
      const match = cmd.match(/^c\s*(\d+)$/);
      const lineNum = parseInt(match![1], 10);
      if (lineNum < 1 || lineNum > state.lines.length) {
        player.receive(`{red}Invalid line number: ${lineNum}{/}\n`);
        showPrompt(player, state);
        return;
      }
      player.receive(`{dim}Current: ${state.lines[lineNum - 1]}{/}\n`);
      state.inputMode = 'change';
      state.insertPosition = lineNum;
      state.newLines = [];
      player.receive('{dim}Enter new text:{/}\n');
      showPrompt(player, state);
      return;
    }

    // Substitute
    if (cmd.match(/^s\/.+\/.*\/g?$/)) {
      handleSubstitute(player, state, cmd);
      showPrompt(player, state);
      return;
    }

    // Go to line number
    if (cmd.match(/^\d+$/)) {
      const lineNum = parseInt(cmd, 10);
      if (lineNum < 1 || lineNum > state.lines.length) {
        player.receive(`{red}Invalid line number (1-${state.lines.length}){/}\n`);
      } else {
        state.currentLine = lineNum;
        player.receive(`${lineNum}: ${state.lines[lineNum - 1]}\n`);
      }
      showPrompt(player, state);
      return;
    }

    // Line range print (e.g., "1,5")
    if (cmd.match(/^\d+,\d+$/)) {
      const [start, end] = cmd.split(',').map((n) => parseInt(n, 10));
      printLines(player, state, start, end);
      showPrompt(player, state);
      return;
    }

    // Unknown command
    player.receive(`{red}Unknown command: ${cmd}. Type "h" for help.{/}\n`);
    showPrompt(player, state);
  } catch (error) {
    player.receive(`{red}Error: ${error instanceof Error ? error.message : String(error)}{/}\n`);
    showPrompt(player, state);
  }
}

/**
 * Handle print command.
 */
function handlePrint(player: PlayerWithCwd, state: EditorState, cmd: string): void {
  const match = cmd.match(/^p\s*(\d+)?(,(\d+))?$/);
  if (!match) {
    // Print current line
    if (state.lines.length === 0) {
      player.receive('{dim}(empty){/}\n');
      return;
    }
    player.receive(`${state.currentLine}: ${state.lines[state.currentLine - 1]}\n`);
    return;
  }

  const start = match[1] ? parseInt(match[1], 10) : 1;
  const end = match[3] ? parseInt(match[3], 10) : (match[1] ? start : state.lines.length);
  printLines(player, state, start, end);
}

/**
 * Print lines in range.
 */
function printLines(player: PlayerWithCwd, state: EditorState, start: number, end: number): void {
  if (state.lines.length === 0) {
    player.receive('{dim}(empty){/}\n');
    return;
  }

  const s = Math.max(1, start);
  const e = Math.min(state.lines.length, end);

  if (s > state.lines.length || e < 1) {
    player.receive('{red}Invalid line range{/}\n');
    return;
  }

  for (let i = s; i <= e; i++) {
    const marker = i === state.currentLine ? '>' : ' ';
    const lineNum = i.toString().padStart(4);
    player.receive(`{dim}${marker}${lineNum}:{/} ${state.lines[i - 1]}\n`);
  }
}

/**
 * Handle delete command.
 */
function handleDelete(player: PlayerWithCwd, state: EditorState, cmd: string): void {
  const match = cmd.match(/^d\s*(\d+)?(,(\d+))?$/);
  if (!match || state.lines.length === 0) {
    player.receive('{red}Nothing to delete{/}\n');
    return;
  }

  const start = match[1] ? parseInt(match[1], 10) : state.currentLine;
  const end = match[3] ? parseInt(match[3], 10) : start;

  if (start < 1 || end > state.lines.length || start > end) {
    player.receive('{red}Invalid line range{/}\n');
    return;
  }

  const count = end - start + 1;
  state.lines.splice(start - 1, count);
  state.modified = true;
  state.currentLine = Math.min(start, state.lines.length || 1);
  player.receive(`{green}Deleted ${count} line(s){/}\n`);
}

/**
 * Handle substitute command.
 */
function handleSubstitute(player: PlayerWithCwd, state: EditorState, cmd: string): void {
  if (state.lines.length === 0 || state.currentLine < 1) {
    player.receive('{red}No current line{/}\n');
    return;
  }

  // Parse s/old/new/g
  const match = cmd.match(/^s\/(.+)\/(.*)\/([g])?$/);
  if (!match) {
    player.receive('{red}Invalid substitute syntax. Use: s/old/new/ or s/old/new/g{/}\n');
    return;
  }

  const [, search, replace, global] = match;
  const line = state.lines[state.currentLine - 1];

  let newLine: string;
  if (global) {
    newLine = line.split(search).join(replace);
  } else {
    newLine = line.replace(search, replace);
  }

  if (newLine === line) {
    player.receive('{yellow}No match found{/}\n');
    return;
  }

  state.lines[state.currentLine - 1] = newLine;
  state.modified = true;
  player.receive(`${state.currentLine}: ${newLine}\n`);
}

/**
 * Save file.
 */
async function saveFile(player: PlayerWithCwd, state: EditorState): Promise<void> {
  try {
    const content = state.lines.join('\n');
    await efuns.writeFile(state.filePath, content);
    state.modified = false;
    player.receive(`{green}Wrote ${state.lines.length} lines to ${state.filePath}{/}\n`);
  } catch (error) {
    player.receive(`{red}Error saving: ${error instanceof Error ? error.message : String(error)}{/}\n`);
  }
}

/**
 * Exit editor.
 */
function exitEditor(player: PlayerWithCwd): void {
  player.setInputHandler(null);
  player.receive('{cyan}Exited editor.{/}\n');
}

/**
 * Show editor help.
 */
function showEditorHelp(player: PlayerWithCwd): void {
  player.receive(`
{cyan}Editor Commands:{/}
  {bold}h{/}              - Show this help
  {bold}p{/}              - Print current line
  {bold}p <n>{/}          - Print line n
  {bold}p <n>,<m>{/}      - Print lines n through m
  {bold}%p{/}             - Print all lines
  {bold}<n>{/}            - Go to line n and print it
  {bold}a{/}              - Append lines (end with "." on own line)
  {bold}i <n>{/}          - Insert before line n
  {bold}d <n>{/}          - Delete line n
  {bold}d <n>,<m>{/}      - Delete lines n through m
  {bold}c <n>{/}          - Change line n
  {bold}s/old/new/{/}     - Substitute on current line
  {bold}s/old/new/g{/}    - Substitute all occurrences
  {bold}w{/}              - Write (save) file
  {bold}q{/}              - Quit (warns if unsaved)
  {bold}q!{/}             - Quit without saving
  {bold}wq{/}             - Write and quit
`);
}

/**
 * Show initial help.
 */
function showHelp(ctx: CommandContext): void {
  ctx.sendLine(`
{cyan}Online Line Editor{/}

Usage: ed <file>

Opens a file for editing. Creates a new file if it doesn't exist.

Once in the editor:
  - Type "h" for editor commands
  - Type "p" to print lines
  - Type "a" to append new lines
  - Type "w" to save
  - Type "q" to quit

Example:
  ed myfile.ts       - Edit/create myfile.ts in current directory
  ed /std/mylib.ts   - Edit using absolute path
`);
}

export default { name, description, usage, execute };
