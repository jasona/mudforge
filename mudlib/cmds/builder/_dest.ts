/**
 * Dest command - Destruct (destroy) an object.
 *
 * Usage:
 *   dest <target>    - Destruct an object (searches room first, then inventory)
 *
 * Builder+ command for removing objects from the game world.
 */

import type { MudObject } from '../../lib/std.js';
import { findItem } from '../../lib/item-utils.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['dest', 'destruct'];
export const description = 'Destruct (destroy) an object';
export const usage = 'dest <target>';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player, args } = ctx;
  const targetName = args.trim();

  if (!targetName) {
    ctx.sendLine('Usage: dest <target>');
    ctx.sendLine('');
    ctx.sendLine('Destructs (destroys) an object from the game world.');
    ctx.sendLine('Searches the room first, then your inventory.');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  dest sword');
    ctx.sendLine('  dest goblin');
    ctx.sendLine('  dest chest');
    return;
  }

  const room = player.environment;

  // Search in room first
  let target: MudObject | undefined;
  let location = '';

  if (room) {
    target = findItem(targetName, room.inventory);
    if (target) {
      location = 'in the room';
    }
  }

  // If not found in room, search inventory
  if (!target) {
    target = findItem(targetName, player.inventory);
    if (target) {
      location = 'in your inventory';
    }
  }

  if (!target) {
    ctx.sendLine(`You don't see '${targetName}' here.`);
    return;
  }

  // Prevent destructing yourself
  if (target === player) {
    ctx.sendLine("{red}You can't destruct yourself!{/}");
    return;
  }

  // Get description before destructing
  const desc = target.shortDesc || targetName;
  const objectId = target.objectId || 'unknown';

  try {
    await efuns.destruct(target);
    ctx.sendLine(`{green}Destructed{/} ${desc} {dim}(${objectId}){/} ${location}.`);

    // Notify room if target was in room
    if (room && location === 'in the room') {
      const playerName = player.name || 'Someone';
      for (const observer of room.inventory) {
        if (observer !== player && 'receive' in observer) {
          const recv = observer as MudObject & { receive: (msg: string) => void };
          recv.receive(`${playerName} makes ${desc} vanish into thin air.\n`);
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error destructing ${desc}: ${errorMsg}{/}`);
  }
}

export default { name, description, usage, execute };
