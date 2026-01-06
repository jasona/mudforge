/**
 * Consider command - Evaluate a target's difficulty.
 *
 * Usage:
 *   consider <target>  - Evaluate how difficult a target would be to fight
 *   con <target>       - Alias for consider
 *
 * Shows relative level comparison and health status.
 *
 * Examples:
 *   consider goblin
 *   con orc
 */

import type { MudObject } from '../../std/object.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['consider', 'con'];
export const description = 'Evaluate how difficult a target would be to fight';
export const usage = 'consider <target>';

/**
 * Check if an object is a Living.
 */
function isLiving(obj: MudObject): obj is Living {
  return 'health' in obj && 'alive' in obj && 'level' in obj;
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

/**
 * Get difficulty description based on level difference.
 */
function getDifficultyDesc(playerLevel: number, targetLevel: number): { text: string; color: string } {
  const diff = targetLevel - playerLevel;

  if (diff <= -10) {
    return { text: 'would be trivial to defeat', color: 'dim' };
  } else if (diff <= -5) {
    return { text: 'would be easy pickings', color: 'green' };
  } else if (diff <= -2) {
    return { text: 'should be fairly easy', color: 'green' };
  } else if (diff <= 1) {
    return { text: 'is about your equal', color: 'yellow' };
  } else if (diff <= 3) {
    return { text: 'looks like a fair challenge', color: 'yellow' };
  } else if (diff <= 5) {
    return { text: 'would be a tough fight', color: 'red' };
  } else if (diff <= 8) {
    return { text: 'is very dangerous', color: 'red' };
  } else {
    return { text: 'would utterly DESTROY you', color: 'RED' };
  }
}

/**
 * Get health description based on percentage.
 */
function getHealthDesc(healthPercent: number): { text: string; color: string } {
  if (healthPercent >= 100) {
    return { text: 'is in perfect health', color: 'green' };
  } else if (healthPercent >= 80) {
    return { text: 'is slightly wounded', color: 'green' };
  } else if (healthPercent >= 60) {
    return { text: 'is somewhat hurt', color: 'yellow' };
  } else if (healthPercent >= 40) {
    return { text: 'is badly wounded', color: 'yellow' };
  } else if (healthPercent >= 20) {
    return { text: 'is severely injured', color: 'red' };
  } else {
    return { text: 'is near death', color: 'RED' };
  }
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const targetName = args.trim();

  if (!targetName) {
    ctx.sendLine('Consider whom?');
    ctx.sendLine('');
    ctx.sendLine('Usage: consider <target>');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  consider goblin');
    ctx.sendLine('  con orc');
    return;
  }

  // Check if player is a Living
  if (!isLiving(player)) {
    ctx.sendLine("You can't consider enemies!");
    return;
  }

  const attacker = player as Living;

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

  // Can't consider yourself
  if (target === player) {
    ctx.sendLine('You consider yourself.');
    ctx.sendLine("You're amazing, obviously.");
    return;
  }

  // Get target name
  const name = target.name || target.shortDesc || 'It';
  const capitalName = name.charAt(0).toUpperCase() + name.slice(1);

  // Check if target is dead
  if (!target.alive) {
    ctx.sendLine(`${capitalName} is dead.`);
    return;
  }

  // Get difficulty assessment
  const diff = getDifficultyDesc(attacker.level, target.level);
  ctx.sendLine(`{${diff.color}}${capitalName} ${diff.text}.{/}`);

  // Get health assessment
  const health = getHealthDesc(target.healthPercent);
  ctx.sendLine(`{${health.color}}${capitalName} ${health.text}.{/}`);

  // Show if they're in combat
  if (target.inCombat) {
    if (target.combatTarget === attacker) {
      ctx.sendLine(`{red}${capitalName} is fighting YOU!{/}`);
    } else if (target.combatTarget) {
      ctx.sendLine(`{yellow}${capitalName} is currently in combat.{/}`);
    }
  }

  // Show level hint for builders/admins
  if (typeof efuns !== 'undefined' && efuns.isBuilder && efuns.isBuilder(player)) {
    ctx.sendLine(`{dim}[Level: ${target.level}, HP: ${target.health}/${target.maxHealth}]{/}`);
  }
}

export default { name, description, usage, execute };
