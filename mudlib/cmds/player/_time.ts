/**
 * Time command - Display the current server time.
 *
 * Usage:
 *   time - Show current server time and timezone
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'time';
export const description = 'Display the current server time';
export const usage = 'time';

export function execute(ctx: CommandContext): void {
  const timestamp = efuns.time();
  const timezone = efuns.getTimezone();
  const uptime = efuns.getUptime();

  // Format the current time
  const date = new Date(timestamp * 1000);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  ctx.sendLine('{cyan}Server Time{/}');
  ctx.sendLine('{dim}' + '\u2500'.repeat(40) + '{/}');
  ctx.sendLine(`  Date:     {white}${dateStr}{/}`);
  ctx.sendLine(`  Time:     {white}${timeStr}{/}`);
  ctx.sendLine(`  Timezone: {white}${timezone.name} (${timezone.abbreviation}, ${timezone.offset}){/}`);
  ctx.sendLine(`  Uptime:   {white}${uptime.formatted}{/}`);
}

export default { name, description, usage, execute };
