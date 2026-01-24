/**
 * Transform command - Transform into various forms using the shadow system.
 *
 * Usage:
 *   transform werewolf [duration]  - Transform into a werewolf (default 60 seconds)
 *   transform end                  - End current transformation
 *   transform status               - Check current transformation status
 */

import type { MudObject } from '../../lib/std.js';
import { WerewolfShadow } from '../../std/guild/shadows/werewolf-shadow.js';

interface Player extends MudObject {
  receive(message: string): void;
}

interface CommandContext {
  player: Player;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['transform'];
export const description = 'Transform into various forms';
export const usage = 'transform <werewolf|end|status> [duration]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase();

  if (!subcommand) {
    showHelp(ctx);
    return;
  }

  switch (subcommand) {
    case 'werewolf':
    case 'wolf':
      await transformWerewolf(ctx, args[1]);
      break;
    case 'end':
    case 'cancel':
    case 'stop':
      await endTransformation(ctx);
      break;
    case 'status':
      await showStatus(ctx);
      break;
    default:
      ctx.sendLine(`{red}Unknown transformation: ${subcommand}{/}`);
      showHelp(ctx);
  }
}

function showHelp(ctx: CommandContext): void {
  ctx.sendLine('Usage: transform <form|end|status> [duration]');
  ctx.sendLine('');
  ctx.sendLine('Available forms:');
  ctx.sendLine('  {cyan}werewolf{/} [seconds]  - Transform into a werewolf');
  ctx.sendLine('                        Duration defaults to 60 seconds, 0 = indefinite');
  ctx.sendLine('');
  ctx.sendLine('Control commands:');
  ctx.sendLine('  {cyan}end{/}                 - End your current transformation');
  ctx.sendLine('  {cyan}status{/}              - Check current transformation status');
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  transform werewolf        - Transform for 60 seconds');
  ctx.sendLine('  transform werewolf 120    - Transform for 2 minutes');
  ctx.sendLine('  transform werewolf 0      - Transform indefinitely');
  ctx.sendLine('  transform end             - End transformation early');
}

async function transformWerewolf(ctx: CommandContext, durationArg?: string): Promise<void> {
  if (typeof efuns === 'undefined') {
    ctx.sendLine('{red}Error: efuns not available.{/}');
    return;
  }

  // Check if already transformed
  if (efuns.hasShadows && efuns.hasShadows(ctx.player)) {
    const existing = efuns.findShadow?.(ctx.player, 'werewolf_form');
    if (existing) {
      ctx.sendLine('{yellow}You are already transformed into a werewolf!{/}');
      ctx.sendLine('{dim}Use "transform end" to end your transformation first.{/}');
      return;
    }
  }

  // Parse duration (default 60 seconds)
  let durationMs = 60000;
  if (durationArg !== undefined) {
    const seconds = parseInt(durationArg, 10);
    if (isNaN(seconds) || seconds < 0) {
      ctx.sendLine('{red}Invalid duration. Please specify a number of seconds (0 for indefinite).{/}');
      return;
    }
    durationMs = seconds * 1000;
  }

  // Create and attach the werewolf shadow
  const shadow = new WerewolfShadow(durationMs);

  if (!efuns.addShadow) {
    ctx.sendLine('{red}Error: Shadow system not available.{/}');
    return;
  }

  const result = await efuns.addShadow(ctx.player, shadow);

  if (!result.success) {
    ctx.sendLine(`{red}Failed to transform: ${result.error}{/}`);
    return;
  }

  // Success message is handled by the shadow's onAttach
  if (durationMs > 0) {
    ctx.sendLine(`{dim}Transformation will last ${durationMs / 1000} seconds.{/}`);
  } else {
    ctx.sendLine('{dim}Transformation is indefinite. Use "transform end" to revert.{/}');
  }
}

async function endTransformation(ctx: CommandContext): Promise<void> {
  if (typeof efuns === 'undefined') {
    ctx.sendLine('{red}Error: efuns not available.{/}');
    return;
  }

  if (!efuns.hasShadows || !efuns.hasShadows(ctx.player)) {
    ctx.sendLine('{yellow}You are not currently transformed.{/}');
    return;
  }

  // Clear all shadows
  if (efuns.clearShadows) {
    await efuns.clearShadows(ctx.player);
    // Success message is handled by the shadow's onDetach
  } else {
    ctx.sendLine('{red}Error: Shadow system not available.{/}');
  }
}

async function showStatus(ctx: CommandContext): Promise<void> {
  if (typeof efuns === 'undefined') {
    ctx.sendLine('{red}Error: efuns not available.{/}');
    return;
  }

  if (!efuns.hasShadows || !efuns.hasShadows(ctx.player)) {
    ctx.sendLine('{cyan}You are in your normal form.{/}');
    return;
  }

  const shadows = efuns.getShadows?.(ctx.player) || [];

  ctx.sendLine('{cyan}Current transformations:{/}');
  ctx.sendLine('');

  for (const shadow of shadows) {
    const status = shadow.isActive ? '{green}active{/}' : '{yellow}inactive{/}';
    ctx.sendLine(`  {bold}${shadow.shadowType}{/} (priority: ${shadow.priority}) - ${status}`);

    // Show remaining duration for werewolf shadows
    if (shadow.shadowType === 'werewolf_form') {
      const werewolf = shadow as WerewolfShadow;
      if (werewolf.isIndefinite?.()) {
        ctx.sendLine('    Duration: {dim}indefinite{/}');
      } else {
        const remaining = werewolf.getRemainingDuration?.() || 0;
        if (remaining > 0) {
          ctx.sendLine(`    Remaining: {yellow}${Math.ceil(remaining / 1000)} seconds{/}`);
        } else {
          ctx.sendLine('    Duration: {dim}expired (will end soon){/}');
        }
      }
    }
  }

  ctx.sendLine('');
  ctx.sendLine('{dim}Use "transform end" to end all transformations.{/}');
}

export default { name, description, usage, execute };
