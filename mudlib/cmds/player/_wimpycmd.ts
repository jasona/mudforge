/**
 * wimpycmd - Set a custom command to execute when wimpy triggers.
 *
 * Usage:
 *   wimpycmd               - Show current wimpycmd
 *   wimpycmd <command>     - Set the wimpy command
 *   wimpycmd clear         - Clear the wimpy command
 *   wimpycmd none          - Clear the wimpy command
 *
 * When your wimpy threshold is triggered in combat, this command will
 * be executed instead of fleeing in a random direction.
 *
 * Examples:
 *   wimpycmd flee north    - Always flee north
 *   wimpycmd recall        - Cast recall spell
 *   wimpycmd quaff healing - Drink a healing potion
 *   wimpycmd clear         - Remove custom command (flee randomly)
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'wimpycmd';
export const description = 'Set custom command for wimpy trigger';
export const usage = 'wimpycmd [command|clear]';
const ALLOWED_WIMPY_COMMANDS = new Set(['flee', 'quaff', 'recall']);

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim();

  // Show current setting
  if (!args) {
    const wimpycmd = ctx.player.getProperty('wimpycmd') as string | undefined;
    const wimpy = (ctx.player.getProperty('wimpy') as number) ?? 0;

    if (wimpycmd) {
      ctx.sendLine(`{cyan}Wimpy command: {bold}${wimpycmd}{/}`);
    } else {
      ctx.sendLine('{cyan}No wimpy command set.{/}');
      ctx.sendLine('{dim}When wimpy triggers, you will flee in a random direction.{/}');
    }

    if (wimpy > 0) {
      ctx.sendLine(`{dim}Wimpy threshold: ${wimpy}%{/}`);
    } else {
      ctx.sendLine('{dim}Wimpy is currently disabled. Use "wimpy <percent>" to enable.{/}');
    }
    return;
  }

  // Clear the command
  if (args.toLowerCase() === 'clear' || args.toLowerCase() === 'none' || args.toLowerCase() === 'off') {
    const hadCmd = ctx.player.getProperty('wimpycmd');
    ctx.player.setProperty('wimpycmd', undefined);

    if (hadCmd) {
      ctx.sendLine('{green}Wimpy command cleared. You will flee in a random direction.{/}');
    } else {
      ctx.sendLine('{yellow}No wimpy command was set.{/}');
    }
    return;
  }

  // Set the command
  const baseCommand = args.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!ALLOWED_WIMPY_COMMANDS.has(baseCommand)) {
    ctx.sendLine('{red}That command is not allowed for wimpycmd.{/}');
    ctx.sendLine('{yellow}Allowed commands: flee, quaff, recall{/}');
    return;
  }

  ctx.player.setProperty('wimpycmd', args);
  ctx.sendLine(`{green}Wimpy command set to: {bold}${args}{/}`);

  const wimpy = (ctx.player.getProperty('wimpy') as number) ?? 0;
  if (wimpy <= 0) {
    ctx.sendLine('{yellow}Note: Wimpy is disabled. Use "wimpy <percent>" to enable.{/}');
  } else {
    ctx.sendLine(`{dim}This will execute when your HP falls below ${wimpy}%.{/}`);
  }
}

export default { name, description, usage, execute };
