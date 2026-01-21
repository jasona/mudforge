/**
 * vanish - Toggle staff invisibility.
 *
 * Usage:
 *   vanish    - Toggle invisibility on/off
 *   vis       - Alias for vanish
 *
 * Staff who are vanished are invisible to players and lower-rank staff.
 * Higher-rank staff can still see vanished lower-rank staff.
 *
 * Hierarchy:
 *   - Admin (3) can see vanished Builder and Senior
 *   - Senior (2) can see vanished Builder
 *   - Builder (1) cannot see any vanished staff
 *   - Players (0) cannot see any vanished staff
 *
 * Note: Equal or higher rank vanished staff remain invisible even to same rank.
 * Example: A vanished admin is invisible to everyone including other admins.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface VanishablePlayer extends MudObject {
  name: string;
  permissionLevel?: number;
  isStaffVanished?: boolean;
  vanish(): boolean;
}

export const name = ['vanish', 'vis'];
export const description = 'Toggle staff invisibility';
export const usage = 'vanish';

export function execute(ctx: CommandContext): void {
  const player = ctx.player as VanishablePlayer;

  // Check permission level
  const permLevel = player.permissionLevel ?? 0;
  if (permLevel < 1) {
    ctx.sendLine("{red}You don't have permission to vanish.{/}");
    return;
  }

  // Toggle vanish state
  if (typeof player.vanish === 'function') {
    player.vanish();
  } else {
    ctx.sendLine('{red}Vanish functionality not available.{/}');
  }
}

export default { name, description, usage, execute };
