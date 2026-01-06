/**
 * Quit command - Disconnect from the game.
 */

import type { MudObject } from '../../lib/std.js';
import { getChannelDaemon } from '../../daemons/channels.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerLike extends MudObject {
  name?: string;
  permissionLevel?: number;
  getDisplayAddress?(): string;
  getProperty?(key: string): unknown;
  quit?(): Promise<void>;
}

export const name = ['quit', 'logout'];
export const description = 'Disconnect from the game';
export const usage = 'quit';

/**
 * Execute the player's logout alias if defined.
 */
async function executeLogoutAlias(player: PlayerLike): Promise<void> {
  if (!player.getProperty) return;

  const aliases = player.getProperty('aliases') as Record<string, string> | undefined;
  if (!aliases || !aliases['logout']) return;

  const logoutCommand = aliases['logout'];
  if (!logoutCommand) return;

  // Execute the logout alias command
  if (typeof efuns !== 'undefined' && efuns.executeCommand) {
    try {
      await efuns.executeCommand(player as MudObject, logoutCommand, player.permissionLevel ?? 0);
    } catch (error) {
      console.error('[Quit] Error executing logout alias:', error);
    }
  }
}

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const playerLike = player as PlayerLike;

  // Execute logout alias before quitting
  await executeLogoutAlias(playerLike);

  // Save player data before quitting
  if (typeof efuns !== 'undefined' && efuns.savePlayer) {
    ctx.sendLine('Saving your character...');
    await efuns.savePlayer(player);
  }

  // Send logout notification
  const channelDaemon = getChannelDaemon();
  const address = playerLike.getDisplayAddress?.() ?? 'unknown';
  channelDaemon.sendNotification(
    'notify',
    `{bold}${playerLike.name}{/} logged out from ${address}`
  );

  ctx.sendLine('Goodbye! See you next time.');

  if (playerLike.quit) {
    await playerLike.quit();
  }
}

export default { name, description, usage, execute };
