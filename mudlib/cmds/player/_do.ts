/**
 * do - Execute a sequence of commands, optionally repeating each.
 *
 * Usage:
 *   do <command>                           - Execute a single command
 *   do <count>:<command>                   - Execute a command N times
 *   do <count>:<command>,<count>:<command> - Chain multiple commands
 *   do <command>,<command>,<command>       - Chain commands (1 time each)
 *
 * Examples:
 *   do 3:north                             - Go north 3 times
 *   do 2:get sword,north,2:drop sword      - Get sword twice, go north, drop sword twice
 *   do say hello,wave,smile                - Say hello, wave, then smile
 *   do 5:attack goblin                     - Attack goblin 5 times
 *
 * Notes:
 *   - Execution stops if any command fails
 *   - Maximum 100 total command executions to prevent abuse
 *   - Small delay between commands for readability
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerWithExecute extends MudObject {
  name: string;
  executeCommand?(command: string): Promise<boolean>;
  getConfig?<T>(key: string): T;
  setConfig?(key: string, value: unknown): { success: boolean; error?: string };
}

export const name = ['do', 'macro'];
export const description = 'Execute a sequence of commands with optional repeats';
export const usage = 'do [count:]<command>[,[count:]<command>...]';

// Maximum total executions to prevent abuse
const MAX_EXECUTIONS = 100;
// Delay between commands in ms
const COMMAND_DELAY = 100;

interface ParsedCommand {
  count: number;
  command: string;
}

/**
 * Parse the macro string into individual commands with counts.
 */
function parseMacro(macroString: string): ParsedCommand[] {
  const commands: ParsedCommand[] = [];

  // Split by comma, but be careful about commas inside quotes
  const parts = splitCommands(macroString);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check for count:command format
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const potentialCount = trimmed.substring(0, colonIndex);
      const count = parseInt(potentialCount, 10);

      if (!isNaN(count) && count > 0 && count.toString() === potentialCount) {
        // Valid count:command format
        commands.push({
          count: count,
          command: trimmed.substring(colonIndex + 1).trim(),
        });
        continue;
      }
    }

    // No count specified, default to 1
    commands.push({
      count: 1,
      command: trimmed,
    });
  }

  return commands;
}

/**
 * Split commands by comma, respecting quoted strings.
 */
function splitCommands(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i]!;

    if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
      current += char;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: do [count:]<command>[,[count:]<command>...]{/}');
    ctx.sendLine('{dim}Examples:{/}');
    ctx.sendLine('{dim}  do 3:north              - Go north 3 times{/}');
    ctx.sendLine('{dim}  do 2:get coin,south     - Get coin twice, then go south{/}');
    ctx.sendLine('{dim}  do say hi,wave,smile    - Say hi, wave, then smile{/}');
    return;
  }

  // Parse the macro
  const commands = parseMacro(args);

  if (commands.length === 0) {
    ctx.sendLine('{yellow}No valid commands found.{/}');
    return;
  }

  // Calculate total executions
  const totalExecutions = commands.reduce((sum, cmd) => sum + cmd.count, 0);

  if (totalExecutions > MAX_EXECUTIONS) {
    ctx.sendLine(`{yellow}Too many executions (${totalExecutions}). Maximum is ${MAX_EXECUTIONS}.{/}`);
    return;
  }

  // Validate commands aren't empty
  for (const cmd of commands) {
    if (!cmd.command) {
      ctx.sendLine('{yellow}Empty command in sequence.{/}');
      return;
    }
  }

  // Check for recursive do commands
  for (const cmd of commands) {
    const verb = cmd.command.split(/\s+/)[0]?.toLowerCase();
    if (verb === 'do' || verb === 'macro') {
      ctx.sendLine('{yellow}Cannot nest "do" commands.{/}');
      return;
    }
  }

  // Get the player's executeCommand function
  const player = ctx.player as PlayerWithExecute;

  if (typeof efuns === 'undefined' || !efuns.executeCommand) {
    ctx.sendLine('{red}Error: Command execution not available.{/}');
    return;
  }

  // Check if brief mode is already on; if not, temporarily enable it
  const hadBriefOn =
    typeof player.getConfig === 'function' ? player.getConfig<boolean>('brief') : true;
  const canSetConfig = typeof player.setConfig === 'function';

  if (!hadBriefOn && canSetConfig) {
    player.setConfig!('brief', true);
  }

  // Execute the commands
  let executionCount = 0;

  try {
    for (const cmd of commands) {
      for (let i = 0; i < cmd.count; i++) {
        executionCount++;

        // Show progress for repeated commands
        if (cmd.count > 1) {
          ctx.sendLine(`{dim}[${executionCount}] ${cmd.command}{/}`);
        }

        try {
          const success = await efuns.executeCommand(player, cmd.command);

          if (!success) {
            ctx.sendLine(`{yellow}Command failed: ${cmd.command}{/}`);
            ctx.sendLine(`{dim}Macro stopped after ${executionCount} execution(s).{/}`);
            return;
          }
        } catch (error) {
          ctx.sendLine(`{red}Error executing: ${cmd.command}{/}`);
          ctx.sendLine(`{dim}Macro stopped after ${executionCount} execution(s).{/}`);
          return;
        }

        // Small delay between commands for readability
        if (executionCount < totalExecutions) {
          await sleep(COMMAND_DELAY);
        }
      }
    }

    // Only show completion message if we did multiple things
    if (totalExecutions > 1) {
      ctx.sendLine(`{dim}Macro complete: ${executionCount} command(s) executed.{/}`);
    }
  } finally {
    // Restore brief mode to its original state
    if (!hadBriefOn && canSetConfig) {
      player.setConfig!('brief', false);
    }
  }
}

export default { name, description, usage, execute };
