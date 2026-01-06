/**
 * alias - Create and manage command aliases.
 *
 * Usage:
 *   alias                     - List all aliases
 *   alias <name>              - Show what an alias does
 *   alias <name> <command>    - Create or update an alias
 *
 * Special aliases:
 *   login  - Executes when you first log in
 *   logout - Executes just before you log out
 *
 * Examples:
 *   alias gn go north         - Create alias 'gn' for 'go north'
 *   alias login look          - Look at the room when you log in
 *   alias logout save         - Save before logging out
 *   alias atk attack goblin   - Create alias 'atk' for 'attack goblin'
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

export const name = ['alias', 'aliases'];
export const description = 'Create and manage command aliases';
export const usage = 'alias [name] [command]';

// Reserved alias names that have special behavior
const SPECIAL_ALIASES = ['login', 'logout'];

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

/**
 * Display all aliases.
 */
function displayAllAliases(ctx: CommandContext): void {
  const aliases = getAliases(ctx.player);
  const keys = Object.keys(aliases).sort();

  if (keys.length === 0) {
    ctx.sendLine('{yellow}You have no aliases defined.{/}');
    ctx.sendLine('{dim}Use "alias <name> <command>" to create one.{/}');
    return;
  }

  ctx.sendLine('{cyan}Your aliases:{/}');
  ctx.sendLine('');

  // Separate special aliases from regular ones
  const specialKeys = keys.filter(k => SPECIAL_ALIASES.includes(k));
  const regularKeys = keys.filter(k => !SPECIAL_ALIASES.includes(k));

  // Display regular aliases
  if (regularKeys.length > 0) {
    for (const key of regularKeys) {
      ctx.sendLine(`  {bold}${key}{/} = ${aliases[key]}`);
    }
  }

  // Display special aliases with explanation
  if (specialKeys.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{dim}Special aliases:{/}');
    for (const key of specialKeys) {
      const desc = key === 'login' ? '(runs on login)' : '(runs on logout)';
      ctx.sendLine(`  {bold}${key}{/} = ${aliases[key]} {dim}${desc}{/}`);
    }
  }

  ctx.sendLine('');
  ctx.sendLine(`{dim}Total: ${keys.length} alias(es){/}`);
}

/**
 * Display a single alias.
 */
function displayAlias(ctx: CommandContext, name: string): void {
  const aliases = getAliases(ctx.player);
  const aliasName = name.toLowerCase();

  if (aliases[aliasName]) {
    const isSpecial = SPECIAL_ALIASES.includes(aliasName);
    const desc = aliasName === 'login' ? ' (runs on login)' :
                 aliasName === 'logout' ? ' (runs on logout)' : '';
    ctx.sendLine(`{bold}${aliasName}{/} = ${aliases[aliasName]}{dim}${desc}{/}`);
  } else {
    ctx.sendLine(`{yellow}No alias named '${name}' found.{/}`);
  }
}

/**
 * Create or update an alias.
 */
function setAlias(ctx: CommandContext, name: string, command: string): void {
  const aliasName = name.toLowerCase();

  // Prevent aliasing 'alias' or 'unalias' to avoid confusion
  if (aliasName === 'alias' || aliasName === 'unalias') {
    ctx.sendLine(`{yellow}Cannot create an alias named '${aliasName}'.{/}`);
    return;
  }

  // Warn about overwriting existing alias
  const aliases = getAliases(ctx.player);
  const isUpdate = !!aliases[aliasName];

  aliases[aliasName] = command;
  saveAliases(ctx.player, aliases);

  const isSpecial = SPECIAL_ALIASES.includes(aliasName);
  const desc = aliasName === 'login' ? ' This will run when you log in.' :
               aliasName === 'logout' ? ' This will run when you log out.' : '';

  if (isUpdate) {
    ctx.sendLine(`{green}Alias '${aliasName}' updated to: ${command}{/}${desc}`);
  } else {
    ctx.sendLine(`{green}Alias '${aliasName}' created: ${command}{/}${desc}`);
  }
}

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim();

  // No args - show all aliases
  if (!args) {
    displayAllAliases(ctx);
    return;
  }

  // Parse the input
  const spaceIndex = args.indexOf(' ');

  if (spaceIndex === -1) {
    // Just a name - show that alias
    displayAlias(ctx, args);
    return;
  }

  // Name and command - create/update alias
  const name = args.substring(0, spaceIndex);
  const command = args.substring(spaceIndex + 1).trim();

  if (!command) {
    displayAlias(ctx, name);
    return;
  }

  setAlias(ctx, name, command);
}

export default { name, description, usage, execute };
