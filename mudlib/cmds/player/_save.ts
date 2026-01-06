/**
 * save - Save your character data.
 *
 * Usage:
 *   save   - Save your character to disk
 *
 * Your character is automatically saved periodically and when you quit,
 * but you can use this command to save manually at any time.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['save'];
export const description = 'Save your character data';
export const usage = 'save';

export async function execute(ctx: CommandContext): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.savePlayer) {
    ctx.sendLine('{red}Error: Save function not available.{/}');
    return;
  }

  try {
    await efuns.savePlayer(ctx.player);
    ctx.sendLine('{green}Character saved.{/}');
  } catch (error) {
    ctx.sendLine(`{red}Error saving character: ${error}{/}`);
  }
}

export default { name, description, usage, execute };
