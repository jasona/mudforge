/**
 * stats - Display driver memory and performance statistics.
 *
 * Usage:
 *   stats              - Show all statistics
 *   stats memory       - Show only memory usage
 *   stats objects      - Show only object counts
 *   stats scheduler    - Show only scheduler info
 *
 * Requires senior builder permission (level 2) or higher.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['stats', 'status', 'mudstats'];
export const description = 'Display driver memory and performance statistics (senior builder+)';
export const usage = 'stats [memory|objects|scheduler|players]';

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Create a simple bar visualization.
 */
function makeBar(used: number, total: number, width: number = 20): string {
  const percentage = total > 0 ? used / total : 0;
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  let color = 'green';
  if (percentage > 0.8) color = 'red';
  else if (percentage > 0.6) color = 'yellow';

  return `{${color}}${'█'.repeat(filled)}{/}{dim}${'░'.repeat(empty)}{/}`;
}

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  // Get driver stats via efun
  const result = typeof efuns !== 'undefined' ? efuns.getDriverStats() : null;

  if (!result) {
    ctx.sendLine('{red}Error: Unable to access driver statistics.{/}');
    return;
  }

  if (!result.success) {
    ctx.sendLine(`{red}Error: ${result.error || 'Unknown error'}{/}`);
    return;
  }

  const showAll = !args;
  const showMemory = showAll || args === 'memory' || args === 'mem';
  const showObjects = showAll || args === 'objects' || args === 'obj';
  const showScheduler = showAll || args === 'scheduler' || args === 'sched';
  const showPlayers = showAll || args === 'players';

  // Header
  ctx.sendLine('{bold}{cyan}╔══════════════════════════════════════════════════════════════╗{/}');
  ctx.sendLine('{bold}{cyan}║{/}               {bold}MudForge Driver Statistics{/}                   {bold}{cyan}║{/}');
  ctx.sendLine('{bold}{cyan}╠══════════════════════════════════════════════════════════════╣{/}');

  // System Info
  if (showAll) {
    ctx.sendLine('{bold}{cyan}║{/} {bold}System{/}                                                      {bold}{cyan}║{/}');
    ctx.sendLine(`{bold}{cyan}║{/}   Uptime:      {green}${result.uptime?.formatted || 'N/A'}{/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Node.js:     {cyan}${result.nodeVersion || 'N/A'}{/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Platform:    {dim}${result.platform || 'N/A'}{/}`);
    ctx.sendLine('{bold}{cyan}╟──────────────────────────────────────────────────────────────╢{/}');
  }

  // Memory
  if (showMemory && result.memory) {
    const mem = result.memory;
    const heapPercent = ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1);

    ctx.sendLine('{bold}{cyan}║{/} {bold}Memory Usage{/}                                                {bold}{cyan}║{/}');
    ctx.sendLine(`{bold}{cyan}║{/}   Heap Used:   ${formatBytes(mem.heapUsed).padEnd(12)} ${makeBar(mem.heapUsed, mem.heapTotal)} {dim}${heapPercent}%{/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Heap Total:  {cyan}${formatBytes(mem.heapTotal)}{/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   RSS:         {yellow}${formatBytes(mem.rss)}{/}  {dim}(resident set size){/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   External:    ${formatBytes(mem.external)}`);
    ctx.sendLine(`{bold}{cyan}║{/}   ArrayBuffers: ${formatBytes(mem.arrayBuffers)}`);

    if (showAll && (showObjects || showScheduler || showPlayers)) {
      ctx.sendLine('{bold}{cyan}╟──────────────────────────────────────────────────────────────╢{/}');
    }
  }

  // Objects
  if (showObjects && result.objects) {
    const obj = result.objects;
    ctx.sendLine('{bold}{cyan}║{/} {bold}Object Registry{/}                                             {bold}{cyan}║{/}');
    ctx.sendLine(`{bold}{cyan}║{/}   Total:       {bold}{green}${obj.total}{/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Blueprints:  {cyan}${obj.blueprints}{/}  {dim}(loaded modules){/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Clones:      {yellow}${obj.clones}{/}  {dim}(instantiated objects){/}`);

    if (showAll && (showScheduler || showPlayers)) {
      ctx.sendLine('{bold}{cyan}╟──────────────────────────────────────────────────────────────╢{/}');
    }
  }

  // Scheduler
  if (showScheduler && result.scheduler) {
    const sched = result.scheduler;
    ctx.sendLine('{bold}{cyan}║{/} {bold}Scheduler{/}                                                   {bold}{cyan}║{/}');
    ctx.sendLine(`{bold}{cyan}║{/}   Heartbeats:  {magenta}${sched.heartbeats}{/}  {dim}(active objects with heartbeat){/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Call-outs:   {yellow}${sched.callouts}{/}  {dim}(pending scheduled callbacks){/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Interval:    {dim}${sched.heartbeatInterval}ms{/}`);

    if (showAll && showPlayers) {
      ctx.sendLine('{bold}{cyan}╟──────────────────────────────────────────────────────────────╢{/}');
    }
  }

  // Players
  if (showPlayers && result.players) {
    const players = result.players;
    ctx.sendLine('{bold}{cyan}║{/} {bold}Players{/}                                                     {bold}{cyan}║{/}');
    ctx.sendLine(`{bold}{cyan}║{/}   Connected:   {green}${players.connected}{/}`);
    ctx.sendLine(`{bold}{cyan}║{/}   Active:      {cyan}${players.active}{/}  {dim}(including link-dead){/}`);
  }

  // Commands
  if (showAll && result.commands) {
    ctx.sendLine('{bold}{cyan}╟──────────────────────────────────────────────────────────────╢{/}');
    ctx.sendLine('{bold}{cyan}║{/} {bold}Commands{/}                                                    {bold}{cyan}║{/}');
    ctx.sendLine(`{bold}{cyan}║{/}   Loaded:      {cyan}${result.commands.total}{/}  {dim}(command files){/}`);
  }

  // Footer
  ctx.sendLine('{bold}{cyan}╚══════════════════════════════════════════════════════════════╝{/}');

  if (!showAll) {
    ctx.sendLine('{dim}Use "stats" without arguments to see all statistics.{/}');
  }
}

export default { name, description, usage, execute };
