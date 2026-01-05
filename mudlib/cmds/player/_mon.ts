/**
 * mon - Toggle the vitals monitor display.
 *
 * Usage:
 *   mon        - Show current monitor status
 *   mon on     - Enable the vitals monitor
 *   mon off    - Disable the vitals monitor
 */

import type { MudObject } from '../../std/object.js';

interface MonitorPlayer extends MudObject {
  monitorEnabled: boolean;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['mon', 'monitor'];
export const description = 'Toggle the vitals monitor display';
export const usage = 'mon [on|off]';

export function execute(ctx: CommandContext): void {
  const player = ctx.player as MonitorPlayer;
  const args = ctx.args.trim().toLowerCase();

  if (args === 'on' || args === '1' || args === 'yes' || args === 'enable') {
    player.monitorEnabled = true;
    ctx.sendLine('{green}Vitals monitor enabled.{/} Your HP and MP will display each heartbeat.');
    return;
  }

  if (args === 'off' || args === '0' || args === 'no' || args === 'disable') {
    player.monitorEnabled = false;
    ctx.sendLine('{yellow}Vitals monitor disabled.{/}');
    return;
  }

  if (args === '') {
    const status = player.monitorEnabled ? '{green}enabled{/}' : '{yellow}disabled{/}';
    ctx.sendLine(`Vitals monitor is currently ${status}.`);
    ctx.sendLine('Usage: {cyan}mon on{/} or {cyan}mon off{/}');
    return;
  }

  ctx.sendLine('Usage: {cyan}mon on{/} or {cyan}mon off{/}');
}

export default { name, description, usage, execute };
