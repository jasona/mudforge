/**
 * Perf command - Display performance metrics (admin only).
 *
 * Usage:
 *   perf            - Show all performance metrics
 *   perf slow       - Show recent slow operations only
 *   perf clear      - Clear all metrics
 *   perf efun on    - Enable detailed efun timing
 *   perf efun off   - Disable detailed efun timing
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['perf', 'performance'];
export const description = 'Display performance metrics (admin only)';
export const usage = 'perf [slow|clear|efun on|efun off]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();

  // Get performance metrics from efuns
  const metrics = typeof efuns !== 'undefined' ? efuns.getPerformanceMetrics() : null;

  if (!metrics?.success) {
    ctx.sendLine(`{red}Error: ${metrics?.error || 'Performance metrics unavailable.'}{/}`);
    return;
  }

  // Handle subcommands
  if (args === 'slow') {
    showSlowOperations(ctx, metrics);
    return;
  }

  if (args === 'clear') {
    const result = efuns.clearPerformanceMetrics();
    if (result.success) {
      ctx.sendLine('{green}Performance metrics cleared.{/}');
    } else {
      ctx.sendLine(`{red}Error: ${result.error}{/}`);
    }
    return;
  }

  if (args === 'efun on') {
    const result = efuns.setPerformanceMetricsOption('efunTiming', true);
    if (result.success) {
      ctx.sendLine('{green}Efun timing enabled. Use "perf" to see efun stats.{/}');
    } else {
      ctx.sendLine(`{red}Error: ${result.error}{/}`);
    }
    return;
  }

  if (args === 'efun off') {
    const result = efuns.setPerformanceMetricsOption('efunTiming', false);
    if (result.success) {
      ctx.sendLine('{yellow}Efun timing disabled.{/}');
    } else {
      ctx.sendLine(`{red}Error: ${result.error}{/}`);
    }
    return;
  }

  // Show all metrics
  showAllMetrics(ctx, metrics);
}

/**
 * Format uptime from milliseconds to human-readable.
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format a timing stat line.
 */
function formatTimingStat(
  name: string,
  stat: { avg: number; p95: number; p99: number; max: number; count: number }
): string {
  const namePad = name.padEnd(12);
  const avgStr = `avg ${stat.avg}ms`.padEnd(10);
  const p95Str = `p95 ${stat.p95}ms`.padEnd(11);
  const p99Str = `p99 ${stat.p99}ms`.padEnd(11);
  const maxStr = `max ${stat.max}ms`.padEnd(11);
  const countStr = `(${stat.count} ops)`;
  return `  ${namePad} {cyan}${avgStr}{/} {dim}${p95Str} ${p99Str} ${maxStr}{/} ${countStr}`;
}

/**
 * Show all performance metrics.
 */
function showAllMetrics(
  ctx: CommandContext,
  metrics: {
    heartbeats?: { avg: number; p95: number; p99: number; max: number; count: number };
    callOuts?: { avg: number; p95: number; p99: number; max: number; count: number };
    commands?: { avg: number; p95: number; p99: number; max: number; count: number };
    isolateAcquireWaits?: number;
    isolateQueueLength?: number;
    backpressureEvents?: number;
    droppedMessages?: number;
    slowOperations?: Array<{
      timestamp: number;
      type: string;
      identifier: string;
      durationMs: number;
    }>;
    uptimeMs?: number;
    efunTimingEnabled?: boolean;
  }
): void {
  const uptime = formatUptime(metrics.uptimeMs ?? 0);

  ctx.sendLine(`{cyan}Performance Metrics{/} {dim}(last ${uptime}){/}`);
  ctx.sendLine('{dim}' + '\u2500'.repeat(60) + '{/}');

  // Timing statistics
  ctx.sendLine('{yellow}Timing:{/}');
  if (metrics.heartbeats) {
    ctx.sendLine(formatTimingStat('Heartbeats', metrics.heartbeats));
  }
  if (metrics.callOuts) {
    ctx.sendLine(formatTimingStat('CallOuts', metrics.callOuts));
  }
  if (metrics.commands) {
    ctx.sendLine(formatTimingStat('Commands', metrics.commands));
  }

  ctx.sendLine('');

  // Isolate pool stats
  ctx.sendLine('{yellow}Isolate Pool:{/}');
  ctx.sendLine(`  Acquire waits:  {cyan}${metrics.isolateAcquireWaits ?? 0}{/}`);
  ctx.sendLine(`  Queue length:   {cyan}${metrics.isolateQueueLength ?? 0}{/}`);

  ctx.sendLine('');

  // Backpressure stats
  ctx.sendLine('{yellow}Backpressure:{/}');
  ctx.sendLine(`  Events:         {cyan}${metrics.backpressureEvents ?? 0}{/}`);
  ctx.sendLine(`  Dropped msgs:   {cyan}${metrics.droppedMessages ?? 0}{/}`);

  // Slow operations summary
  const slowOps = metrics.slowOperations ?? [];
  if (slowOps.length > 0) {
    ctx.sendLine('');
    ctx.sendLine(`{yellow}Recent Slow Operations (>50ms):{/} {dim}${slowOps.length} total{/}`);
    const recent = slowOps.slice(-5);
    for (const op of recent) {
      const time = new Date(op.timestamp);
      const timeStr = time.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const typeColor = op.durationMs >= 100 ? 'red' : 'yellow';
      ctx.sendLine(`  {dim}[${timeStr}]{/} {${typeColor}}${op.type}{/} ${op.identifier} {cyan}(${op.durationMs}ms){/}`);
    }
    if (slowOps.length > 5) {
      ctx.sendLine(`  {dim}... and ${slowOps.length - 5} more. Use "perf slow" to see all.{/}`);
    }
  }

  // Efun timing status
  ctx.sendLine('');
  const efunStatus = metrics.efunTimingEnabled ? '{green}enabled{/}' : '{dim}disabled{/}';
  ctx.sendLine(`{dim}Efun timing: ${efunStatus} (use "perf efun on/off" to toggle){/}`);
}

/**
 * Show recent slow operations.
 */
function showSlowOperations(
  ctx: CommandContext,
  metrics: {
    slowOperations?: Array<{
      timestamp: number;
      type: string;
      identifier: string;
      durationMs: number;
    }>;
  }
): void {
  const slowOps = metrics.slowOperations ?? [];

  if (slowOps.length === 0) {
    ctx.sendLine('{green}No slow operations recorded (threshold: 50ms).{/}');
    return;
  }

  ctx.sendLine(`{cyan}Recent Slow Operations (>50ms){/} {dim}(${slowOps.length} total){/}`);
  ctx.sendLine('{dim}' + '\u2500'.repeat(60) + '{/}');

  for (const op of slowOps) {
    const time = new Date(op.timestamp);
    const timeStr = time.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const typeColor = op.durationMs >= 100 ? 'red' : 'yellow';
    const typePad = op.type.padEnd(10);
    ctx.sendLine(`  {dim}[${timeStr}]{/} {${typeColor}}${typePad}{/} ${op.identifier} {cyan}(${op.durationMs}ms){/}`);
  }
}

export default { name, description, usage, execute };
