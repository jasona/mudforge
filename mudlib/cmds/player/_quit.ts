/**
 * Quit command - Disconnect from the game.
 */

import type { MudObject } from '../../std/object.js';

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

  ctx.sendLine('Goodbye! See you next time.');

  if (playerLike.quit) {
    await playerLike.quit();
  }
}

export default { name, description, usage, execute };
