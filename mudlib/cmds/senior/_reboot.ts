/**
 * reboot - Initiate a server restart with countdown or immediately.
 *
 * Usage:
 *   reboot now    - Immediately restart the server
 *   reboot <n>    - Restart in n minutes (must be > 3)
 *
 * The countdown warns all connected users at:
 * - Every minute until 1 minute remaining
 * - Every 30 seconds during the last minute
 * - Every second during the last 10 seconds
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

// Track active reboot countdown
let rebootInProgress = false;
let rebootCallouts: number[] = [];

export const name = 'reboot';
export const description = 'Initiate a server restart';
export const usage = 'reboot now | reboot <minutes>';

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  if (!args) {
    ctx.sendLine('{yellow}Usage: reboot now | reboot <minutes>{/}');
    ctx.sendLine('{dim}  reboot now  - Immediately restart the server{/}');
    ctx.sendLine('{dim}  reboot <n>  - Restart in n minutes (must be > 3){/}');
    return;
  }

  // Check if reboot is already in progress
  if (rebootInProgress && args !== 'cancel') {
    ctx.sendLine('{red}A reboot is already in progress.{/}');
    ctx.sendLine('{dim}Use "reboot cancel" to abort the current reboot.{/}');
    return;
  }

  // Handle cancel
  if (args === 'cancel') {
    if (!rebootInProgress) {
      ctx.sendLine('{yellow}No reboot is currently in progress.{/}');
      return;
    }
    cancelReboot(ctx);
    return;
  }

  // Handle immediate reboot
  if (args === 'now') {
    doImmediateReboot(ctx);
    return;
  }

  // Handle timed reboot
  const minutes = parseInt(args, 10);
  if (isNaN(minutes)) {
    ctx.sendLine('{red}Invalid argument. Use "now" or a number of minutes.{/}');
    return;
  }

  if (minutes <= 3) {
    ctx.sendLine('{red}Reboot time must be greater than 3 minutes.{/}');
    ctx.sendLine('{dim}Use "reboot now" for immediate restart.{/}');
    return;
  }

  startRebootCountdown(ctx, minutes);
}

/**
 * Perform immediate reboot.
 */
function doImmediateReboot(ctx: CommandContext): void {
  const playerName = (ctx.player as MudObject & { name?: string }).name || 'Unknown';

  // Broadcast to all players
  broadcastMessage(`{bold}{red}*** SERVER RESTARTING NOW ***{/}`);
  broadcastMessage(`{yellow}Initiated by ${playerName}. Please reconnect shortly.{/}`);

  ctx.sendLine('{green}Initiating immediate server restart...{/}');

  // Schedule the shutdown message and actual shutdown
  efuns.callOut(() => {
    broadcastMessage('{bold}{red}SHUTTING DOWN... NOW!{/}');
  }, 1000);

  efuns.callOut(() => {
    const result = efuns.shutdown('Immediate reboot requested');
    if (!result.success) {
      broadcastMessage(`{red}Shutdown failed: ${result.error}{/}`);
    }
  }, 1500);
}

/**
 * Start the reboot countdown.
 */
function startRebootCountdown(ctx: CommandContext, minutes: number): void {
  const playerName = (ctx.player as MudObject & { name?: string }).name || 'Unknown';

  rebootInProgress = true;
  rebootCallouts = [];

  // Initial announcement
  broadcastMessage(`{bold}{yellow}*** SERVER RESTART IN ${minutes} MINUTES ***{/}`);
  broadcastMessage(`{yellow}Initiated by ${playerName}. Please save your progress and prepare to reconnect.{/}`);

  ctx.sendLine(`{green}Reboot countdown started: ${minutes} minutes.{/}`);

  // Schedule countdown messages
  const totalSeconds = minutes * 60;

  // Every minute announcements (except the last minute)
  for (let m = minutes - 1; m >= 1; m--) {
    const delay = (minutes - m) * 60 * 1000;
    const id = efuns.callOut(() => {
      if (!rebootInProgress) return;
      if (m === 1) {
        broadcastMessage(`{bold}{yellow}*** SERVER RESTART IN 1 MINUTE ***{/}`);
      } else {
        broadcastMessage(`{bold}{yellow}*** SERVER RESTART IN ${m} MINUTES ***{/}`);
      }
    }, delay);
    rebootCallouts.push(id);
  }

  // 30 second warning
  const thirtySecDelay = (totalSeconds - 30) * 1000;
  if (thirtySecDelay > 0) {
    const id = efuns.callOut(() => {
      if (!rebootInProgress) return;
      broadcastMessage(`{bold}{red}*** SERVER RESTART IN 30 SECONDS ***{/}`);
    }, thirtySecDelay);
    rebootCallouts.push(id);
  }

  // Last 10 seconds countdown
  for (let s = 10; s >= 1; s--) {
    const delay = (totalSeconds - s) * 1000;
    if (delay > 0) {
      const id = efuns.callOut(() => {
        if (!rebootInProgress) return;
        if (s === 1) {
          broadcastMessage(`{bold}{red}*** ${s} ***{/}`);
        } else {
          broadcastMessage(`{bold}{red}*** ${s} ***{/}`);
        }
      }, delay);
      rebootCallouts.push(id);
    }
  }

  // Final shutdown message
  const shutdownMsgDelay = totalSeconds * 1000;
  const shutdownMsgId = efuns.callOut(() => {
    if (!rebootInProgress) return;
    broadcastMessage(`{bold}{red}SHUTTING DOWN... NOW!{/}`);
  }, shutdownMsgDelay);
  rebootCallouts.push(shutdownMsgId);

  // Actual shutdown
  const shutdownDelay = (totalSeconds * 1000) + 500;
  const shutdownId = efuns.callOut(() => {
    if (!rebootInProgress) return;
    const result = efuns.shutdown('Scheduled reboot');
    if (!result.success) {
      broadcastMessage(`{red}Shutdown failed: ${result.error}{/}`);
    }
  }, shutdownDelay);
  rebootCallouts.push(shutdownId);
}

/**
 * Cancel an in-progress reboot.
 */
function cancelReboot(ctx: CommandContext): void {
  const playerName = (ctx.player as MudObject & { name?: string }).name || 'Unknown';

  // Cancel all scheduled callouts
  for (const id of rebootCallouts) {
    efuns.removeCallOut(id);
  }
  rebootCallouts = [];
  rebootInProgress = false;

  broadcastMessage(`{bold}{green}*** SERVER RESTART CANCELLED ***{/}`);
  broadcastMessage(`{green}Cancelled by ${playerName}.{/}`);

  ctx.sendLine('{green}Reboot cancelled.{/}');
}

/**
 * Broadcast a message to all connected players.
 */
function broadcastMessage(message: string): void {
  const players = efuns.allPlayers();
  for (const player of players) {
    efuns.send(player, `\n${message}\n`);
  }
}

export default { name, description, usage, execute };
