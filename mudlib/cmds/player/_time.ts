/**
 * Time command - Display the current server time and game time.
 *
 * Usage:
 *   time - Show current server time, timezone, uptime, and game time
 */

import type { MudObject } from '../../lib/std.js';
import { getTimeDaemon, type TimePhase } from '../../daemons/time.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

/**
 * Phase display colors for formatting.
 */
const PHASE_COLORS: Record<TimePhase, string> = {
  dawn: '{yellow}',
  day: '{bold}{yellow}',
  dusk: '{#FFA500}',
  night: '{blue}',
};

/**
 * Get the next phase and when it starts (game hour).
 */
function getNextPhaseInfo(currentPhase: TimePhase): { phase: string; hour: number } {
  switch (currentPhase) {
    case 'night': return { phase: 'Dawn', hour: 5 };
    case 'dawn': return { phase: 'Day', hour: 7 };
    case 'day': return { phase: 'Dusk', hour: 18 };
    case 'dusk': return { phase: 'Night', hour: 20 };
  }
}

export const name = 'time';
export const description = 'Display the current server time and game time';
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

  // Game time section
  try {
    const td = getTimeDaemon();
    const { hour, minute } = td.getGameTime();
    const phase = td.getPhase();
    const phaseColor = PHASE_COLORS[phase];
    const phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);
    const gameTimeStr = `${hour}:${minute.toString().padStart(2, '0')}`;
    const nextPhase = getNextPhaseInfo(phase);

    // Calculate real minutes until next phase
    const cycleDurationMs = td.getCycleDurationMs();
    const gameHourMs = cycleDurationMs / 24;
    let hoursUntil = nextPhase.hour - hour;
    if (hoursUntil <= 0) hoursUntil += 24;
    const minutesUntil = hoursUntil - (minute > 0 ? 0 : 0);
    const realMsUntil = minutesUntil * gameHourMs - (minute * gameHourMs / 60);
    const realMinutesUntil = Math.max(1, Math.round(realMsUntil / 60000));

    ctx.sendLine('');
    ctx.sendLine('{cyan}Game Time{/}');
    ctx.sendLine('{dim}' + '\u2500'.repeat(40) + '{/}');
    ctx.sendLine(`  Time:     {white}${gameTimeStr}{/}`);
    ctx.sendLine(`  Phase:    ${phaseColor}${phaseName}{/}`);
    ctx.sendLine(`  Next:     {white}${nextPhase.phase} in ~${realMinutesUntil} real minute${realMinutesUntil !== 1 ? 's' : ''}{/}`);
  } catch {
    // Time daemon not available
  }
}

export default { name, description, usage, execute };
