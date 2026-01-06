/**
 * unalias - Remove a command alias.
 *
 * Usage:
 *   unalias <name>   - Remove an alias
 *   unalias *        - Remove all aliases
 *
 * Examples:
 *   unalias gn       - Remove the 'gn' alias
 *   unalias login    - Remove the login alias
 *   unalias *        - Remove all aliases
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

export const name = 'unalias';
export const description = 'Remove a command alias';
export const usage = 'unalias <name|*>';

/**
 * Get player's aliases.
 */
function getAliases(player: CommandContext['player']): Record<string, string> {
  return (player.getProperty('aliases') as Record<string, string>) || {};
}

/**
 * Save player's aliases.
 */
function saveAliases(player: CommandContext['player'], aliases: Record<string, string>): void {
  player.setProperty('aliases', aliases);
}

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: unalias <name>{/}');
    ctx.sendLine('{dim}Use "unalias *" to remove all aliases.{/}');
    return;
  }

  const aliases = getAliases(ctx.player);

  // Handle wildcard - remove all aliases
  if (args === '*') {
    const count = Object.keys(aliases).length;
    if (count === 0) {
      ctx.sendLine('{yellow}You have no aliases to remove.{/}');
      return;
    }
    saveAliases(ctx.player, {});
    ctx.sendLine(`{green}Removed all ${count} alias(es).{/}`);
    return;
  }

  // Remove specific alias
  const aliasName = args.toLowerCase();

  if (!aliases[aliasName]) {
    ctx.sendLine(`{yellow}No alias named '${args}' found.{/}`);
    return;
  }

  const oldCommand = aliases[aliasName];
  delete aliases[aliasName];
  saveAliases(ctx.player, aliases);

  ctx.sendLine(`{green}Removed alias '${aliasName}' (was: ${oldCommand}){/}`);
}

export default { name, description, usage, execute };
