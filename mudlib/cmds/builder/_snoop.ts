/**
 * snoop - Observe what a player or NPC sees in real-time.
 *
 * Usage:
 *   snoop <target>   - Start snooping a player or NPC
 *   snoop off        - Stop snooping
 *
 * Opens a GUI modal showing the target's received messages with
 * a command input bar to execute commands as the target.
 *
 * Requires builder permission (level 1) or higher.
 * Can only snoop players/NPCs with lower permission levels.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & {
    name: string;
    permissionLevel: number;
    environment: MudObject | null;
    receive(message: string): void;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Player extends MudObject {
  name: string;
  permissionLevel: number;
  environment: MudObject | null;
  receive(message: string): void;
  objectId: string;
}

interface Living extends MudObject {
  name: string;
  environment: MudObject | null;
  objectId: string;
}

interface NPC extends Living {
  isNPC?: boolean;
}

interface Room extends MudObject {
  inventory: MudObject[];
}

export const name = ['snoop'];
export const description = 'Observe what a player or NPC sees (builder+)';
export const usage = 'snoop <target> | snoop off';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();

  if (!args) {
    // Show current snoop status
    const { getSnoopDaemon } = await import('../../daemons/snoop.js');
    const daemon = getSnoopDaemon();
    const session = daemon.getSession(ctx.player as unknown as Player);

    if (session) {
      ctx.sendLine(`{cyan}Currently snooping: {bold}${session.targetName}{/} (${session.targetType}){/}`);
      ctx.sendLine('{dim}Use "snoop off" to stop, or "snoop <target>" to switch.{/}');
    } else {
      ctx.sendLine('{yellow}Usage: snoop <target> | snoop off{/}');
      ctx.sendLine('{dim}Start observing what a player or NPC sees in real-time.{/}');
    }
    return;
  }

  // Stop snooping
  if (args === 'off' || args === 'stop') {
    const { getSnoopDaemon } = await import('../../daemons/snoop.js');
    const daemon = getSnoopDaemon();
    const session = daemon.getSession(ctx.player as unknown as Player);

    if (!session) {
      ctx.sendLine('{yellow}You are not snooping anyone.{/}');
      return;
    }

    daemon.stopSnoop(ctx.player as unknown as Player);
    ctx.sendLine(`{green}Stopped snooping ${session.targetName}.{/}`);
    return;
  }

  // Find target - try player first, then NPC in room
  const target = await findTarget(ctx, args);
  if (!target) {
    return; // Error already sent
  }

  // Start snooping
  const { getSnoopDaemon } = await import('../../daemons/snoop.js');
  const daemon = getSnoopDaemon();

  // Check permission
  const check = daemon.canSnoop(ctx.player as unknown as Player, target as Living);
  if (!check.allowed) {
    ctx.sendLine(`{red}${check.reason}{/}`);
    return;
  }

  // Start the session
  const success = daemon.startSnoop(ctx.player as unknown as Player, target as Living);
  if (!success) {
    ctx.sendLine('{red}Failed to start snoop session.{/}');
    return;
  }

  // Get initial messages from buffer (if any)
  const session = daemon.getSession(ctx.player as unknown as Player);
  const initialMessages = session?.messageBuffer || [];

  // Open the modal
  const { openSnoopModal } = await import('../../lib/snoop-modal.js');
  openSnoopModal(
    ctx.player as unknown as Player,
    target as Living,
    initialMessages
  );

  ctx.sendLine(`{green}Now snooping {bold}${target.name}{/}. Modal opened.{/}`);
}

/**
 * Find a target by name - players first, then NPCs in the room.
 */
async function findTarget(ctx: CommandContext, name: string): Promise<MudObject | null> {
  // Try to find a connected player
  if (typeof efuns !== 'undefined' && efuns.findConnectedPlayer) {
    const player = efuns.findConnectedPlayer(name);
    if (player) {
      return player;
    }

    // Try partial match with allPlayers
    if (efuns.allPlayers) {
      const allPlayers = efuns.allPlayers();
      const found = allPlayers.find((p) => {
        const playerObj = p as Player;
        return playerObj.name?.toLowerCase().startsWith(name);
      });
      if (found) {
        return found;
      }
    }
  }

  // Try to find an NPC in the current room
  const room = ctx.player.environment as Room | null;
  if (room && room.inventory) {
    for (const obj of room.inventory) {
      // Skip the player themselves
      if (obj === ctx.player) continue;

      // Skip non-living objects
      if (!efuns.isLiving(obj)) continue;

      // Check using id() method (like kill command does)
      if ('id' in obj && typeof (obj as MudObject & { id: (str: string) => boolean }).id === 'function') {
        if ((obj as MudObject & { id: (str: string) => boolean }).id(name)) {
          return obj;
        }
      }

      // Also check name property for partial matches
      const living = obj as NPC;
      if (living.name) {
        const objName = living.name.toLowerCase();
        if (objName.includes(name)) {
          return obj;
        }
      }
    }
  }

  ctx.sendLine(`{yellow}No player or NPC named "${name}" found.{/}`);
  ctx.sendLine('{dim}For NPCs, you must be in the same room.{/}');
  return null;
}

export default { name, description, usage, execute };
