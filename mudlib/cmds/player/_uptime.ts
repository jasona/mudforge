/**
 * uptime - Display how long the game has been running.
 *
 * Usage:
 *   uptime  - Show server uptime since last restart
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'uptime';
export const description = 'Display how long the game has been running';
export const usage = 'uptime';

export function execute(ctx: CommandContext): void {
  const uptime = efuns.getUptime();
  const game = efuns.gameConfig();

  ctx.send(`\n{cyan}${game.name}{/} has been running for {bold}${uptime.formatted}{/}.\n`);
}

export default { name, description, usage, execute };
