/**
 * Resurrect command - Return to life after death.
 *
 * Usage:
 *   resurrect corpse  - Resurrect at your corpse (recovers items)
 *   resurrect shrine  - Resurrect at the nearest shrine (no items)
 *
 * Can only be used when dead (ghost mode).
 */

import type { MudObject, Player } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['resurrect', 'res'];
export const description = 'Return to life after death';
export const usage = 'resurrect <corpse|shrine>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const option = args.trim().toLowerCase();

  // Check if player is a Player object
  if (!efuns.isPlayer(player)) {
    ctx.sendLine("You can't resurrect!");
    return;
  }

  const p = player as Player;

  // Check if player is dead
  if (!p.isGhost) {
    ctx.sendLine("You're not dead!");
    return;
  }

  if (!option) {
    ctx.sendLine('Resurrect where?');
    ctx.sendLine('');
    ctx.sendLine('Usage: resurrect <corpse|shrine>');
    ctx.sendLine('');
    ctx.sendLine('{cyan}resurrect corpse{/}  - Return to your corpse and reclaim items');
    ctx.sendLine('{cyan}resurrect shrine{/} - Return to the nearest shrine (no items)');
    return;
  }

  switch (option) {
    case 'corpse':
    case 'body':
      await p.resurrectAtCorpse();
      break;

    case 'shrine':
    case 'temple':
    case 'town':
      await p.resurrectAtShrine();
      break;

    default:
      ctx.sendLine(`Unknown resurrection option: ${option}`);
      ctx.sendLine('');
      ctx.sendLine('Valid options:');
      ctx.sendLine('  {cyan}corpse{/} - Resurrect at your corpse');
      ctx.sendLine('  {cyan}shrine{/} - Resurrect at the nearest shrine');
      break;
  }
}

export default { name, description, usage, execute };
