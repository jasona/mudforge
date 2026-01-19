/**
 * version - Display game and driver version information.
 *
 * Usage:
 *   version  - Show game and driver versions
 *   ver      - Alias for version
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['version', 'ver'];
export const description = 'Display game and driver version information';
export const usage = 'version';

export function execute(ctx: CommandContext): void {
  const driver = efuns.driverVersion();
  const game = efuns.gameConfig();

  const lines: string[] = [];
  lines.push('');
  lines.push(`{bold}{cyan}${game.name}{/} {dim}v${game.version}{/}`);
  lines.push(`{dim}${game.tagline}{/}`);
  lines.push('');
  lines.push(`{dim}Powered by {yellow}${driver.name}{/} {dim}v${driver.version}{/}`);
  lines.push('');

  ctx.send(lines.join('\n'));
}

export default { name, description, usage, execute };
