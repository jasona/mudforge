/**
 * wimpy - Set your wimpy threshold for automatic fleeing.
 *
 * Usage:
 *   wimpy              - Show current wimpy setting
 *   wimpy <percent>    - Set wimpy threshold (0-100)
 *   wimpy off          - Disable wimpy (same as wimpy 0)
 *
 * When your health falls below the wimpy threshold during combat,
 * you will automatically attempt to flee. If you have a wimpycmd set,
 * that command will be executed instead.
 *
 * Examples:
 *   wimpy 25           - Flee when HP falls below 25%
 *   wimpy 50           - Flee when HP falls below 50%
 *   wimpy off          - Never automatically flee
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

export const name = 'wimpy';
export const description = 'Set automatic flee threshold';
export const usage = 'wimpy [percent|off]';

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  // Show current setting
  if (!args) {
    const wimpy = (ctx.player.getProperty('wimpy') as number) ?? 0;
    const wimpycmd = ctx.player.getProperty('wimpycmd') as string | undefined;

    if (wimpy <= 0) {
      ctx.sendLine('{cyan}Wimpy is currently disabled.{/}');
    } else {
      ctx.sendLine(`{cyan}Wimpy threshold: {bold}${wimpy}%{/}`);
      if (wimpycmd) {
        ctx.sendLine(`{cyan}Wimpy command: {bold}${wimpycmd}{/}`);
      } else {
        ctx.sendLine('{dim}No wimpycmd set - will flee in a random direction.{/}');
      }
    }
    ctx.sendLine('{dim}Use "wimpy <percent>" to set, "wimpy off" to disable.{/}');
    return;
  }

  // Disable wimpy
  if (args === 'off' || args === '0' || args === 'disable' || args === 'none') {
    ctx.player.setProperty('wimpy', 0);
    ctx.sendLine('{green}Wimpy disabled. You will fight to the death!{/}');
    return;
  }

  // Parse percentage
  const percent = parseInt(args, 10);

  if (isNaN(percent)) {
    ctx.sendLine('{yellow}Usage: wimpy <percent> (0-100) or "wimpy off"{/}');
    return;
  }

  if (percent < 0 || percent > 100) {
    ctx.sendLine('{yellow}Wimpy threshold must be between 0 and 100.{/}');
    return;
  }

  ctx.player.setProperty('wimpy', percent);

  if (percent === 0) {
    ctx.sendLine('{green}Wimpy disabled. You will fight to the death!{/}');
  } else {
    ctx.sendLine(`{green}Wimpy set to ${percent}%. You will flee when HP falls below that.{/}`);

    const wimpycmd = ctx.player.getProperty('wimpycmd') as string | undefined;
    if (wimpycmd) {
      ctx.sendLine(`{dim}Wimpy command: ${wimpycmd}{/}`);
    } else {
      ctx.sendLine('{dim}No wimpycmd set - will flee in a random direction.{/}');
    }
  }
}

export default { name, description, usage, execute };
