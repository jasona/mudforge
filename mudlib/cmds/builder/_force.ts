/**
 * force - Force a player to execute a command.
 *
 * Usage:
 *   force <player> <command>   - Make a player execute a command
 *
 * The command is executed with the target's permission level, not yours.
 * This prevents forcing players to execute commands they couldn't normally use.
 *
 * Requires builder permission (level 1) or higher.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & {
    name: string;
    permissionLevel?: number;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Player extends MudObject {
  name: string;
  permissionLevel?: number;
  receive(message: string): void;
}

export const name = ['force'];
export const description = 'Force a player to execute a command (builder+)';
export const usage = 'force <player> <command>';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args || !args.includes(' ')) {
    ctx.sendLine('{yellow}Usage: force <player> <command>{/}');
    ctx.sendLine('{dim}Forces a player to execute a command as if they typed it.{/}');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  force bob say Hello everyone!');
    ctx.sendLine('  force alice look');
    ctx.sendLine('  force charlie drop sword');
    return;
  }

  // Parse target and command
  const spaceIndex = args.indexOf(' ');
  const targetName = args.slice(0, spaceIndex).toLowerCase();
  const command = args.slice(spaceIndex + 1).trim();

  if (!command) {
    ctx.sendLine('{yellow}You must specify a command to force.{/}');
    return;
  }

  // Can't force yourself (just type the command!)
  if (targetName === ctx.player.name.toLowerCase()) {
    ctx.sendLine("{yellow}You can't force yourself - just type the command!{/}");
    return;
  }

  // Find the target player
  if (typeof efuns === 'undefined' || !efuns.findConnectedPlayer) {
    ctx.sendLine('{red}Error: Player lookup not available.{/}');
    return;
  }

  let target = efuns.findConnectedPlayer(targetName) as Player | undefined;

  // Try partial match if exact match fails
  if (!target && efuns.allPlayers) {
    const allPlayers = efuns.allPlayers();
    const found = allPlayers.find((p) => {
      const player = p as Player;
      return player.name?.toLowerCase().startsWith(targetName);
    }) as Player | undefined;

    if (found) {
      target = found;
    }
  }

  if (!target) {
    ctx.sendLine(`{yellow}No player named "${targetName}" is currently online.{/}`);
    return;
  }

  const targetDisplayName = efuns.capitalize(target.name);
  const forcerName = efuns.capitalize(ctx.player.name);

  // Notify the target that they're being forced
  target.receive(`\n{magenta}${forcerName} forces you to: ${command}{/}\n`);

  // Execute the command as the target player
  // Use the target's permission level for safety
  if (!efuns.executeCommand) {
    ctx.sendLine('{red}Error: Command execution not available.{/}');
    return;
  }

  const targetPermLevel = target.permissionLevel ?? 0;

  try {
    const handled = await efuns.executeCommand(target, command, targetPermLevel);

    if (handled) {
      ctx.sendLine(`{green}Forced ${targetDisplayName} to: ${command}{/}`);
    } else {
      ctx.sendLine(`{yellow}${targetDisplayName} could not execute: ${command}{/}`);
      ctx.sendLine('{dim}(Command may not exist or may have failed){/}');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error forcing command: ${errorMsg}{/}`);
  }
}

export default { name, description, usage, execute };
