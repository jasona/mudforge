/**
 * Zap command - Instantly kill an NPC (builder only).
 *
 * Usage:
 *   zap <target> - Deal lethal damage to an NPC, killing it instantly
 *
 * This command is for testing and builder use. It deals maxHealth + 1 damage
 * to the target, ensuring instant death regardless of any protections.
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
  alive: boolean;
}

export const name = ['zap'];
export const description = 'Instantly kill an NPC (builder only)';
export const usage = 'zap <target>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const targetName = args.trim();

  if (!targetName) {
    ctx.sendLine('Usage: zap <target>');
    ctx.sendLine('');
    ctx.sendLine('Instantly kills an NPC by dealing lethal damage.');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  zap goblin');
    ctx.sendLine('  zap rat');
    return;
  }

  const room = player.environment;

  if (!room) {
    ctx.sendLine("{red}You're not in a room!{/}");
    return;
  }

  // Search in room for target
  const target = findItem(targetName, room.inventory);

  if (!target) {
    ctx.sendLine(`You don't see '${targetName}' here.`);
    return;
  }

  // Prevent zapping yourself
  if (target === player) {
    ctx.sendLine("{red}You can't zap yourself!{/}");
    return;
  }

  // Check if target is a living being
  if (!efuns.isLiving(target)) {
    ctx.sendLine(`{red}${target.shortDesc} is not a living being.{/}`);
    return;
  }

  const living = target as Living;

  // Check if already dead
  if (!living.alive) {
    ctx.sendLine(`{yellow}${target.shortDesc} is already dead.{/}`);
    return;
  }

  // Get info before killing
  const desc = target.shortDesc || targetName;
  const damage = living.maxHealth + 1;

  // ZAP! Deal lethal damage
  ctx.sendLine(`{YELLOW}⚡ ZAP! ⚡{/}`);
  ctx.sendLine(`{yellow}You channel divine power and strike ${desc}!{/}`);

  // Set health to 0 (this triggers onDeath via the health setter)
  living.health = -damage;

  ctx.sendLine(`{green}${desc} has been slain. (${damage} damage){/}`);

  // Notify room
  const playerName = player.name || 'Someone';
  for (const observer of room.inventory) {
    if (observer !== player && observer !== target && 'receive' in observer) {
      const recv = observer as MudObject & { receive: (msg: string) => void };
      recv.receive(`{YELLOW}⚡{/} ${playerName} zaps ${desc} with divine power!\n`);
    }
  }
}

export default { name, description, usage, execute };
