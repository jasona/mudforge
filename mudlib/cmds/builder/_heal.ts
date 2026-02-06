/**
 * Heal command - Fully restore a target's health and mana (builder only).
 *
 * Usage:
 *   heal <target>  - Heal a player or NPC in the room
 *   heal me        - Heal yourself
 */

import type { MudObject } from '../../lib/std.js';
import { findItem } from '../../lib/item-utils.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Living extends MudObject {
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  alive: boolean;
}

export const name = 'heal';
export const description = 'Fully restore a target\'s health and mana (builder only)';
export const usage = 'heal <target>';

function isLiving(obj: MudObject): obj is Living {
  return 'health' in obj && 'maxHealth' in obj && 'alive' in obj;
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const targetName = args.trim();

  if (!targetName) {
    ctx.sendLine('Usage: heal <target>');
    ctx.sendLine('');
    ctx.sendLine('Fully restores health and mana of a player or NPC.');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  heal goblin');
    ctx.sendLine('  heal me');
    return;
  }

  // Handle "heal me"
  let target: MudObject | undefined;
  if (targetName.toLowerCase() === 'me' || targetName.toLowerCase() === 'self') {
    target = player;
  } else {
    const room = player.environment;
    if (!room) {
      ctx.sendLine("{red}You're not in a room!{/}");
      return;
    }
    target = findItem(targetName, room.inventory);
  }

  if (!target) {
    ctx.sendLine(`You don't see '${targetName}' here.`);
    return;
  }

  if (!isLiving(target)) {
    ctx.sendLine(`{red}${target.shortDesc} is not a living being.{/}`);
    return;
  }

  if (!target.alive) {
    ctx.sendLine(`{yellow}${target.shortDesc} is beyond healing.{/}`);
    return;
  }

  const desc = target === player ? 'yourself' : (target.shortDesc || targetName);
  const thirdPerson = target === player ? player.name : desc;

  // Restore HP
  const hpMissing = target.maxHealth - target.health;
  target.health = target.maxHealth;

  // Restore MP
  let mpMissing = 0;
  if (typeof target.mana === 'number' && typeof target.maxMana === 'number') {
    mpMissing = target.maxMana - target.mana;
    target.mana = target.maxMana;
  }

  // Build result
  const healed: string[] = [];
  if (hpMissing > 0) healed.push(`{green}+${hpMissing} HP{/}`);
  if (mpMissing > 0) healed.push(`{cyan}+${mpMissing} MP{/}`);
  const summary = healed.length > 0 ? ` (${healed.join(', ')})` : '';

  ctx.sendLine(`{GREEN}✦ {/}{green}A warm golden light envelops ${desc}, mending all wounds.{/}${summary}`);

  if (hpMissing === 0 && mpMissing === 0) {
    ctx.sendLine(`{dim}${target === player ? 'You were' : `${desc} was`} already at full vitality.{/}`);
  }

  // Notify room
  if (target !== player) {
    // Tell the target
    if ('receive' in target) {
      const recv = target as MudObject & { receive: (msg: string) => void };
      recv.receive(`{GREEN}✦ {/}{green}A warm golden light surrounds you as ${player.name} restores your vitality.{/}${summary}\n`);
    }
  }

  const room = player.environment;
  if (room) {
    for (const observer of room.inventory) {
      if (observer !== player && observer !== target && 'receive' in observer) {
        const recv = observer as MudObject & { receive: (msg: string) => void };
        recv.receive(`{GREEN}✦ {/}{dim}A warm golden light surrounds ${thirdPerson} as ${player.name} channels healing magic.{/}\n`);
      }
    }
  }
}

export default { name, description, usage, execute };
