/**
 * Quit command - Disconnect from the game.
 */

import type { MudObject } from '../../std/object.js';

// Efuns are injected by the driver at runtime
declare const efuns: {
  savePlayer(player: MudObject): Promise<void>;
};

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerLike extends MudObject {
  quit?(): Promise<void>;
}

export const name = ['quit', 'logout'];
export const description = 'Disconnect from the game';
export const usage = 'quit';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const playerLike = player as PlayerLike;

  // Save player data before quitting
  if (typeof efuns !== 'undefined' && efuns.savePlayer) {
    ctx.sendLine('Saving your character...');
    await efuns.savePlayer(player);
  }

  ctx.sendLine('Goodbye! See you next time.');

  if (playerLike.quit) {
    await playerLike.quit();
  }
}

export default { name, description, usage, execute };
