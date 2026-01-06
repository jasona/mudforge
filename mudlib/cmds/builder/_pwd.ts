/**
 * pwd command - Print current working directory.
 *
 * Usage:
 *   pwd
 */

import type { MudObject } from '../../lib/std.js';

interface PlayerWithCwd extends MudObject {
  cwd: string;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['pwd'];
export const description = 'Print current working directory';
export const usage = 'pwd';

export function execute(ctx: CommandContext): void {
  const player = ctx.player as PlayerWithCwd;
  const cwd = player.cwd || '/';
  ctx.sendLine(cwd);
}

export default { name, description, usage, execute };
