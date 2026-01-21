/**
 * Kill command - Attack a target to initiate combat.
 *
 * Usage:
 *   kill <target>       - Attack a target in the room
 *   kill <target> <N>   - Attack the Nth matching target (e.g., "kill deer 2")
 *   attack <target>     - Alias for kill
 *
 * Examples:
 *   kill goblin
 *   kill deer 2         - Attack the second deer
 *   attack orc
 */

import type { MudObject, Living } from '../../lib/std.js';
import { getCombatDaemon } from '../../daemons/combat.js';
import { parseItemInput, findAllMatching } from '../../lib/item-utils.js';
import { canSeeInRoom } from '../../std/visibility/index.js';
import type { Room } from '../../std/room.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['kill', 'attack'];
export const description = 'Attack a target to initiate combat';
export const usage = 'kill <target> [number]';

/**
 * Check if an object is a Living.
 */
function isLiving(obj: MudObject): obj is Living {
  return 'health' in obj && 'alive' in obj && 'inCombat' in obj;
}

/**
 * Find all Living targets matching a name in a list of objects.
 */
function findAllLivingMatching(name: string, objects: MudObject[]): Living[] {
  const matches = findAllMatching(name, objects);
  return matches.filter((obj): obj is Living => isLiving(obj));
}

/**
 * Find a target by name in a list of objects, with optional index.
 * @param targetName - The target name to search for
 * @param objects - List of objects to search
 * @param index - Optional 1-based index (e.g., 2 for second match)
 */
function findTarget(targetName: string, objects: MudObject[], index?: number): Living | undefined {
  const matches = findAllLivingMatching(targetName, objects);

  if (matches.length === 0) return undefined;

  if (index !== undefined) {
    if (index < 1 || index > matches.length) return undefined;
    return matches[index - 1]; // Convert to 0-based
  }

  return matches[0]; // Default to first match
}

/**
 * Count how many Living targets match a name.
 */
function countLivingMatching(name: string, objects: MudObject[]): number {
  return findAllLivingMatching(name, objects).length;
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const input = args.trim();

  if (!input) {
    ctx.sendLine('Kill whom?');
    ctx.sendLine('');
    ctx.sendLine('Usage: kill <target> [number]');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  kill goblin');
    ctx.sendLine('  kill deer 2    - Attack the second deer');
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

  // Check if player can see in the room
  const roomObj = room as unknown as Room;
  const lightCheck = canSeeInRoom(attacker, roomObj);
  if (!lightCheck.canSee) {
    ctx.sendLine("It's too dark! You can't see who to attack.");
    return;
  }

  // Parse input for indexed selection (e.g., "deer 2")
  const parsed = parseItemInput(input);
  const targetName = parsed.name;

  // Find target in the room
  const target = findTarget(targetName, room.inventory, parsed.index);

  if (!target) {
    // Check if target exists but index is out of range
    if (parsed.index !== undefined) {
      const count = countLivingMatching(targetName, room.inventory);
      if (count > 0) {
        if (count === 1) {
          ctx.sendLine(`There is only 1 ${targetName} here.`);
        } else {
          ctx.sendLine(`There are only ${count} ${targetName}s here.`);
        }
        return;
      }
    }
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

  // Note: PvP protection is handled by the combat daemon based on config setting
  // Initiate combat through the daemon
  const combatDaemon = getCombatDaemon();
  const success = combatDaemon.initiateCombat(attacker, target);

  if (!success) {
    ctx.sendLine(`You can't attack ${target.name} right now.`);
  }
}

export default { name, description, usage, execute };
