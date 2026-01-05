/**
 * Inventory command - See what you are carrying.
 */

import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['inventory', 'i', 'inv'];
export const description = 'See what you are carrying';
export const usage = 'inventory';

export function execute(ctx: CommandContext): void {
  const { player } = ctx;
  const items = player.inventory;

  if (items.length === 0) {
    ctx.sendLine('You are not carrying anything.');
  } else {
    ctx.sendLine('You are carrying:');
    for (const item of items) {
      ctx.sendLine(`  ${item.shortDesc}`);
    }
  }
}

export default { name, description, usage, execute };
