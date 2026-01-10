/**
 * Memstats command - Display memory and object statistics (admin only).
 *
 * Usage:
 *   memstats          - Show all statistics
 *   memstats memory   - Show memory usage only
 *   memstats objects  - Show object counts only
 *   memstats reset    - Show reset daemon statistics
 */

import type { MudObject } from '../../lib/std.js';
import { getResetDaemon } from '../../daemons/reset.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['memstats', 'memory', 'objstats'];
export const description = 'Display memory and object statistics (admin only)';
export const usage = 'memstats [memory|objects|reset]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();

  // Get stats from efuns
  const memStats = typeof efuns !== 'undefined' ? efuns.getMemoryStats() : null;
  const objStats = typeof efuns !== 'undefined' ? efuns.getObjectStats() : null;

  if (!memStats?.success || !objStats?.success) {
    ctx.sendLine('{red}Error: Permission denied or stats unavailable.{/}');
    return;
  }

  // Handle specific views
  if (args === 'memory') {
    showMemoryStats(ctx, memStats);
    return;
  }

  if (args === 'objects') {
    showObjectStats(ctx, objStats);
    return;
  }

  if (args === 'reset') {
    showResetStats(ctx);
    return;
  }

  // Show all stats
  ctx.sendLine('{cyan}=== MudForge Memory Statistics ==={/}');
  ctx.sendLine('');

  showMemoryStats(ctx, memStats);
  ctx.sendLine('');
  showObjectStats(ctx, objStats);
  ctx.sendLine('');
  showResetStats(ctx);
}

/**
 * Show memory usage statistics.
 */
function showMemoryStats(
  ctx: CommandContext,
  stats: {
    heapUsedMb?: number;
    heapTotalMb?: number;
    rssMb?: number;
    external?: number;
    arrayBuffers?: number;
  }
): void {
  ctx.sendLine('{yellow}Memory Usage:{/}');
  ctx.sendLine(`  Heap Used:  {cyan}${stats.heapUsedMb?.toFixed(2)} MB{/}`);
  ctx.sendLine(`  Heap Total: {cyan}${stats.heapTotalMb?.toFixed(2)} MB{/}`);
  ctx.sendLine(`  RSS:        {cyan}${stats.rssMb?.toFixed(2)} MB{/}`);

  // Calculate heap usage percentage
  if (stats.heapUsedMb && stats.heapTotalMb) {
    const usagePercent = ((stats.heapUsedMb / stats.heapTotalMb) * 100).toFixed(1);
    const barLength = 20;
    const filledLength = Math.round((stats.heapUsedMb / stats.heapTotalMb) * barLength);
    const bar = '\u2588'.repeat(filledLength) + '\u2591'.repeat(barLength - filledLength);
    ctx.sendLine(`  Usage:      {dim}[{/}{cyan}${bar}{/}{dim}]{/} ${usagePercent}%`);
  }
}

/**
 * Show object statistics.
 */
function showObjectStats(
  ctx: CommandContext,
  stats: {
    totalObjects?: number;
    blueprints?: number;
    clones?: number;
    byType?: Record<string, number>;
    largestInventories?: Array<{ objectId: string; count: number }>;
    blueprintCloneCounts?: Array<{ path: string; clones: number }>;
  }
): void {
  ctx.sendLine('{yellow}Object Statistics:{/}');
  ctx.sendLine(`  Total Objects: {cyan}${stats.totalObjects}{/}`);
  ctx.sendLine(`  Blueprints:    {cyan}${stats.blueprints}{/}`);
  ctx.sendLine(`  Clones:        {cyan}${stats.clones}{/}`);

  // Show by type
  if (stats.byType && Object.keys(stats.byType).length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{yellow}Objects by Type:{/}');
    const sorted = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sorted) {
      ctx.sendLine(`  ${type.padEnd(20)} {cyan}${count}{/}`);
    }
  }

  // Show largest inventories
  if (stats.largestInventories && stats.largestInventories.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{yellow}Largest Inventories:{/}');
    for (const inv of stats.largestInventories) {
      const shortId = inv.objectId.length > 40
        ? '...' + inv.objectId.slice(-37)
        : inv.objectId;
      ctx.sendLine(`  ${shortId.padEnd(42)} {cyan}${inv.count} items{/}`);
    }
  }

  // Show blueprints with most clones
  if (stats.blueprintCloneCounts && stats.blueprintCloneCounts.length > 0) {
    const withClones = stats.blueprintCloneCounts.filter(b => b.clones > 0);
    if (withClones.length > 0) {
      ctx.sendLine('');
      ctx.sendLine('{yellow}Blueprints with Most Clones:{/}');
      for (const bp of withClones.slice(0, 5)) {
        ctx.sendLine(`  ${bp.path.padEnd(35)} {cyan}${bp.clones} clones{/}`);
      }
    }
  }
}

/**
 * Show reset daemon statistics.
 */
function showResetStats(ctx: CommandContext): void {
  try {
    const resetDaemon = getResetDaemon();
    const stats = resetDaemon.getStats();
    const timeUntil = resetDaemon.getTimeUntilReset();
    const isRunning = resetDaemon.isRunning();

    ctx.sendLine('{yellow}Reset Daemon:{/}');
    ctx.sendLine(`  Status:         ${isRunning ? '{green}Running{/}' : '{red}Stopped{/}'}`);
    ctx.sendLine(`  Total Resets:   {cyan}${stats.totalResets}{/}`);
    ctx.sendLine(`  Items Cleaned:  {cyan}${stats.itemsCleaned}{/}`);

    if (stats.lastResetTime > 0) {
      const lastReset = new Date(stats.lastResetTime);
      ctx.sendLine(`  Last Reset:     {dim}${lastReset.toLocaleTimeString()}{/}`);
    }

    if (timeUntil > 0) {
      const minutes = Math.ceil(timeUntil / 60000);
      ctx.sendLine(`  Next Reset:     {dim}in ${minutes} minute${minutes !== 1 ? 's' : ''}{/}`);
    }
  } catch {
    ctx.sendLine('{yellow}Reset Daemon:{/}');
    ctx.sendLine('  {dim}Not available{/}');
  }
}

export default { name, description, usage, execute };
