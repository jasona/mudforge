/**
 * Flee command - Attempt to escape from combat.
 *
 * Usage:
 *   flee [direction]  - Attempt to flee from combat
 *
 * Success depends on a dexterity check. If no direction is specified,
 * a random exit will be chosen.
 *
 * Examples:
 *   flee
 *   flee north
 */

import type { MudObject, Living } from '../../lib/std.js';
import { getCombatDaemon } from '../../daemons/combat.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['flee', 'escape', 'run'];
export const description = 'Attempt to escape from combat';
export const usage = 'flee [direction]';

/**
 * Check if an object is a Living.
 */
function isLiving(obj: MudObject): obj is Living {
  return 'health' in obj && 'alive' in obj && 'inCombat' in obj;
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const direction = args.trim() || undefined;

  // Check if player is a Living
  if (!isLiving(player)) {
    ctx.sendLine("You can't flee!");
    return;
  }

  const attacker = player as Living;

  // Check if in combat
  if (!attacker.inCombat) {
    ctx.sendLine("You're not in combat!");
    return;
  }

  // Attempt to flee through the combat daemon
  const combatDaemon = getCombatDaemon();
  combatDaemon.attemptFlee(attacker, direction);
}

export default { name, description, usage, execute };
