/**
 * Rehash command - Reload all commands from the cmds/ directories.
 *
 * This discovers new commands and reloads existing ones without
 * needing to restart the driver.
 *
 * Usage:
 *   rehash     - Reload all commands
 */

import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['rehash'];
export const description = 'Reload all commands (discover new commands)';
export const usage = 'rehash';

export async function execute(ctx: CommandContext): Promise<void> {
  ctx.sendLine('{cyan}Rehashing commands...{/}');

  if (typeof efuns === 'undefined' || !efuns.rehashCommands) {
    ctx.sendLine('{red}Error: rehashCommands efun not available.{/}');
    return;
  }

  const result = await efuns.rehashCommands();

  if (result.success) {
    ctx.sendLine(`{green}Commands rehashed successfully.{/}`);
    ctx.sendLine(`{cyan}${result.commandCount} command(s) loaded.{/}`);
  } else {
    ctx.sendLine('{red}Failed to rehash commands.{/}');
    if (result.error) {
      ctx.sendLine(`{red}Error: ${result.error}{/}`);
    }
  }
}

export default { name, description, usage, execute };
