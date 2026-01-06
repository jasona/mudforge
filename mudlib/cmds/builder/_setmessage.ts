/**
 * setmessage - Set custom enter/exit messages for movement.
 *
 * Usage:
 *   setmessage                     - Show current messages
 *   setmessage enter <message>     - Set enter message
 *   setmessage exit <message>      - Set exit message
 *   setmessage reset               - Reset to defaults
 *
 * Tokens available in messages:
 *   $N - Your capitalized name
 *   $n - Your lowercase name
 *   $D - The direction (e.g., "east", "the north")
 *
 * Examples:
 *   setmessage exit $N strides off to $D.
 *   setmessage enter $N swoops in from $D.
 *
 * Requires builder permission (level 1) or higher.
 */

import type { MudObject } from '../../lib/std.js';
import { DEFAULT_EXIT_MESSAGE, DEFAULT_ENTER_MESSAGE } from '../../std/living.js';

interface CommandContext {
  player: MudObject & {
    name: string;
    enterMessage: string;
    exitMessage: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['setmessage', 'setmsg'];
export const description = 'Set custom enter/exit messages for movement (builder+)';
export const usage = 'setmessage [enter|exit|reset] [message]';

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim();
  const player = ctx.player;

  // No args - show current messages
  if (!args) {
    ctx.sendLine('{cyan}╔════════════════════════════════════════════════════════╗{/}');
    ctx.sendLine('{cyan}║{/}          {bold}Your Movement Messages{/}                      {cyan}║{/}');
    ctx.sendLine('{cyan}╠════════════════════════════════════════════════════════╣{/}');
    ctx.sendLine('{cyan}║{/} {bold}Exit message:{/}                                        {cyan}║{/}');
    ctx.sendLine(`{cyan}║{/}   {green}${player.exitMessage.padEnd(52)}{/}{cyan}║{/}`);
    ctx.sendLine('{cyan}║{/}                                                        {cyan}║{/}');
    ctx.sendLine('{cyan}║{/} {bold}Enter message:{/}                                       {cyan}║{/}');
    ctx.sendLine(`{cyan}║{/}   {green}${player.enterMessage.padEnd(52)}{/}{cyan}║{/}`);
    ctx.sendLine('{cyan}╟────────────────────────────────────────────────────────╢{/}');
    ctx.sendLine('{cyan}║{/} {dim}Tokens: $N (name), $n (lowercase), $D (direction){/}    {cyan}║{/}');
    ctx.sendLine('{cyan}╚════════════════════════════════════════════════════════╝{/}');
    ctx.sendLine('');
    ctx.sendLine('{dim}Use "setmessage exit <msg>" or "setmessage enter <msg>" to change.{/}');
    ctx.sendLine('{dim}Use "setmessage reset" to restore defaults.{/}');
    return;
  }

  const parts = args.split(/\s+/);
  const subcommand = parts[0]!.toLowerCase();
  const message = parts.slice(1).join(' ');

  // Reset to defaults
  if (subcommand === 'reset') {
    player.exitMessage = DEFAULT_EXIT_MESSAGE;
    player.enterMessage = DEFAULT_ENTER_MESSAGE;
    ctx.sendLine('{green}Messages reset to defaults.{/}');
    ctx.sendLine(`  Exit:  {dim}${DEFAULT_EXIT_MESSAGE}{/}`);
    ctx.sendLine(`  Enter: {dim}${DEFAULT_ENTER_MESSAGE}{/}`);
    return;
  }

  // Set exit message
  if (subcommand === 'exit') {
    if (!message) {
      ctx.sendLine('{yellow}Usage: setmessage exit <message>{/}');
      ctx.sendLine('{dim}Example: setmessage exit $N strides off to $D.{/}');
      return;
    }

    player.exitMessage = message;
    ctx.sendLine('{green}Exit message updated:{/}');
    ctx.sendLine(`  {cyan}${message}{/}`);

    // Show preview
    const preview = message
      .replace(/\$N/g, player.name.charAt(0).toUpperCase() + player.name.slice(1))
      .replace(/\$n/g, player.name.toLowerCase())
      .replace(/\$D/g, 'east');
    ctx.sendLine('{dim}Preview:{/}');
    ctx.sendLine(`  ${preview}`);
    return;
  }

  // Set enter message
  if (subcommand === 'enter') {
    if (!message) {
      ctx.sendLine('{yellow}Usage: setmessage enter <message>{/}');
      ctx.sendLine('{dim}Example: setmessage enter $N swoops in from $D.{/}');
      return;
    }

    player.enterMessage = message;
    ctx.sendLine('{green}Enter message updated:{/}');
    ctx.sendLine(`  {cyan}${message}{/}`);

    // Show preview
    const preview = message
      .replace(/\$N/g, player.name.charAt(0).toUpperCase() + player.name.slice(1))
      .replace(/\$n/g, player.name.toLowerCase())
      .replace(/\$D/g, 'the west');
    ctx.sendLine('{dim}Preview:{/}');
    ctx.sendLine(`  ${preview}`);
    return;
  }

  // Unknown subcommand
  ctx.sendLine('{yellow}Usage: setmessage [enter|exit|reset] [message]{/}');
  ctx.sendLine('{dim}Use "setmessage" with no arguments to see current messages.{/}');
}

export default { name, description, usage, execute };
