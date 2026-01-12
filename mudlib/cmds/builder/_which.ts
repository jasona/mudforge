/**
 * which command - Show the file path of a command.
 *
 * Usage:
 *   which <command>
 *
 * Example:
 *   which look
 *   which goto
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

const LEVEL_NAMES: Record<number, string> = {
  0: 'player',
  1: 'builder',
  2: 'senior',
  3: 'admin',
};

export const name = ['which'];
export const description = 'Show the file path of a command';
export const usage = 'which <command>';

export function execute(ctx: CommandContext): void {
  const cmdName = ctx.args.trim();

  if (!cmdName) {
    ctx.sendLine('Usage: which <command>');
    return;
  }

  if (typeof efuns === 'undefined' || !efuns.getCommandInfo) {
    ctx.sendLine('Command lookup not available.');
    return;
  }

  const info = efuns.getCommandInfo(cmdName);

  if (!info) {
    ctx.sendLine(`Command not found: ${cmdName}`);
    return;
  }

  const levelName = LEVEL_NAMES[info.level] || `level ${info.level}`;

  ctx.sendLine(`{bold}${cmdName}{/}`);
  ctx.sendLine(`  Path:        ${info.filePath}`);
  ctx.sendLine(`  Level:       ${levelName}`);
  ctx.sendLine(`  Description: ${info.description}`);
  if (info.usage) {
    ctx.sendLine(`  Usage:       ${info.usage}`);
  }
  if (info.names.length > 1) {
    ctx.sendLine(`  Aliases:     ${info.names.join(', ')}`);
  }
}

export default { name, description, usage, execute };
