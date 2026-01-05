/**
 * Reload command - Reload all commands from disk (admin only).
 */

import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['reload', 'reloadcmds'];
export const description = 'Reload all commands from disk (admin only)';
export const usage = 'reload';

export function execute(ctx: CommandContext): void {
  ctx.sendLine('Commands will be hot-reloaded automatically when files change.');
  ctx.sendLine('To force a reload, modify and save any command file.');
}

export default { name, description, usage, execute };
