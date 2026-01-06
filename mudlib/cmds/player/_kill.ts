/**
 * Kill command - Attack a target to initiate combat.
 *
 * Usage:
 *   kill <target>    - Attack a target in the room
 *   attack <target>  - Alias for kill
 *
 * Examples:
 *   kill goblin
 *   attack orc
 */

import type { MudObject } from '../../std/object.js';
import type { Living } from '../../std/living.js';
import { getCombatDaemon } from '../../daemons/combat.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['kill', 'attack'];
export const description = 'Attack a target to initiate combat';
export const usage = 'kill <target>';

/**
 * Check if an object is a Living.
 */
function isLiving(obj: MudObject): obj is Living {
  return 'health' in obj && 'alive' in obj && 'inCombat' in obj;
}

/**
 * Find a target by name in a list of objects.
 */
function findTarget(targetName: string, objects: MudObject[]): Living | undefined {
  const lowerName = targetName.toLowerCase();

  for (const obj of objects) {
    if (!isLiving(obj)) continue;

    // Check ID
    if (obj.id(lowerName)) {
      return obj;
    }

    // Check name property if it exists
    if ('name' in obj && typeof obj.name === 'string') {
      if (obj.name.toLowerCase().includes(lowerName)) {
        return obj;
      }
    }
  }

  return undefined;
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const targetName = args.trim();

  if (!targetName) {
    ctx.sendLine('Kill whom?');
    ctx.sendLine('');
    ctx.sendLine('Usage: kill <target>');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  kill goblin');
    ctx.sendLine('  attack orc');
    return;
  }

  // Check if player is a Living
  if (!isLiving(player)) {
    ctx.sendLine("You can't fight!");
    return;
  }

  const attacker = player as Living;

  // Check if already in combat with a target
  if (attacker.inCombat && attacker.combatTarget) {
    const currentTarget = attacker.combatTarget;
    ctx.sendLine(`You are already fighting ${currentTarget.name}!`);
    return;
  }

  // Get the room
  const room = player.environment;
  if (!room) {
    ctx.sendLine("You're not in a room!");
    return;
  }

  // Find target in the room
  const target = findTarget(targetName, room.inventory);

  if (!target) {
    ctx.sendLine(`You don't see '${targetName}' here.`);
    return;
  }

  // Can't attack yourself
  if (target === player) {
    ctx.sendLine("You can't attack yourself!");
    return;
  }

  // Check if target is alive
  if (!target.alive) {
    ctx.sendLine(`${target.name} is already dead!`);
    return;
  }

  // Check if target is a player (PvP protection - can be disabled later)
  if ('connection' in target) {
    ctx.sendLine("You can't attack other players!");
    return;
  }

  // Initiate combat through the daemon
  const combatDaemon = getCombatDaemon();
  const success = combatDaemon.initiateCombat(attacker, target);

  if (!success) {
    ctx.sendLine(`You can't attack ${target.name} right now.`);
  }
}

export default { name, description, usage, execute };
