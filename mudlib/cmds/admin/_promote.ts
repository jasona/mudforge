/**
 * Promote command - Promote a player's permission level (admin only).
 *
 * Usage:
 *   promote <player>           - Promote player one level
 *   promote <player> <level>   - Set player to specific level
 *
 * Levels:
 *   0 = Player
 *   1 = Builder
 *   2 = Senior Builder
 *   3 = Administrator
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'promote';
export const description = 'Promote a player\'s permission level (admin only)';
export const usage = 'promote <player> [level]';

const LEVEL_NAMES: Record<number, string> = {
  0: 'Player',
  1: 'Builder',
  2: 'Senior Builder',
  3: 'Administrator',
};

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: promote <player> [level]{/}');
    ctx.sendLine('');
    ctx.sendLine('Levels:');
    ctx.sendLine('  {cyan}0{/} = Player');
    ctx.sendLine('  {cyan}1{/} = Builder');
    ctx.sendLine('  {cyan}2{/} = Senior Builder');
    ctx.sendLine('  {cyan}3{/} = Administrator');
    ctx.sendLine('');
    ctx.sendLine('Without a level, promotes the player one level up.');
    return;
  }

  const parts = args.split(/\s+/);
  const targetName = parts[0].toLowerCase();
  const specifiedLevel = parts[1] ? parseInt(parts[1], 10) : undefined;

  // Check if player exists (online or has save file)
  const targetPlayer = efuns.findConnectedPlayer(targetName);
  const exists = await efuns.playerExists(targetName);

  if (!targetPlayer && !exists) {
    ctx.sendLine(`{red}Player "${targetName}" not found.{/}`);
    return;
  }

  // Get current level using the player name
  const currentLevel = efuns.getPlayerPermissionLevel(targetName);

  // Determine new level
  let newLevel: number;
  if (specifiedLevel !== undefined) {
    if (isNaN(specifiedLevel) || specifiedLevel < 0 || specifiedLevel > 3) {
      ctx.sendLine('{red}Invalid level. Must be 0-3.{/}');
      return;
    }
    newLevel = specifiedLevel;
  } else {
    // Promote one level
    newLevel = Math.min(currentLevel + 1, 3);
    if (newLevel === currentLevel) {
      ctx.sendLine(`{yellow}${efuns.capitalize(targetName)} is already at the maximum level (Administrator).{/}`);
      return;
    }
  }

  // Set the new level
  const result = efuns.setPermissionLevel(targetName, newLevel);
  if (!result.success) {
    ctx.sendLine(`{red}Failed to promote: ${result.error}{/}`);
    return;
  }

  // Save permissions
  const saveResult = await efuns.savePermissions();
  if (!saveResult.success) {
    ctx.sendLine(`{yellow}Warning: Failed to save permissions: ${saveResult.error}{/}`);
  }

  // Display result
  const currentName = LEVEL_NAMES[currentLevel] ?? 'Unknown';
  const newName = LEVEL_NAMES[newLevel] ?? 'Unknown';

  ctx.sendLine('{green}Permission level updated:{/}');
  ctx.sendLine(`  Player: {cyan}${efuns.capitalize(targetName)}{/}`);
  ctx.sendLine(`  From: {yellow}${currentName}{/} (${currentLevel})`);
  ctx.sendLine(`  To: {green}${newName}{/} (${newLevel})`);

  // Build command paths message based on new level
  const commandPaths: string[] = [];
  if (newLevel >= 1) commandPaths.push('/cmds/builder/');
  if (newLevel >= 2) commandPaths.push('/cmds/senior/');
  if (newLevel >= 3) commandPaths.push('/cmds/admin/');

  if (commandPaths.length > 0) {
    ctx.sendLine(`  Commands: {dim}${commandPaths.join(', ')}{/}`);
  }

  // Notify the target player if online
  if (targetPlayer && targetPlayer !== ctx.player) {
    let message = `\n{green}Your permission level has been changed to ${newName} by ${(ctx.player as MudObject & { name?: string }).name ?? 'an administrator'}.{/}\n`;
    if (commandPaths.length > 0) {
      message += `{cyan}You now have access to commands in: ${commandPaths.join(', ')}{/}\n`;
      message += `{dim}Use "help commands" to see available commands.{/}\n`;
    }
    efuns.send(targetPlayer, message);
  }
}

export default { name, description, usage, execute };
