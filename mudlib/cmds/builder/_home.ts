/**
 * Home command - Teleport to your personal workroom (builder only).
 *
 * Each builder can have a personal workroom at /users/<name>/workroom.ts
 * This command provides instant transport there with a magical flourish.
 *
 * Usage:
 *   home    - Teleport to your workroom
 */

import type { MudObject } from '../../lib/std.js';

interface PlayerWithName extends MudObject {
  name: string;
}

interface Room extends MudObject {
  look?(viewer: MudObject): void;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'home';
export const description = 'Teleport to your personal workroom (builder only)';
export const usage = 'home';

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const p = player as PlayerWithName;

  // Get player name, lowercase for path
  const playerName = (p.name || 'unknown').toLowerCase();
  const workroomPath = `/users/${playerName}/workroom`;

  // Try to find or load the workroom
  let workroom: MudObject | undefined;

  if (typeof efuns !== 'undefined') {
    // First check if already loaded
    workroom = efuns.findObject(workroomPath);

    // If not loaded, try to load it from disk
    if (!workroom && efuns.reloadObject) {
      const result = await efuns.reloadObject(workroomPath);
      if (result.success) {
        workroom = efuns.findObject(workroomPath);
      }
    }
  }

  if (!workroom) {
    ctx.sendLine('{yellow}You reach out with your mind, but find no anchor...{/}');
    ctx.sendLine(`{dim}Your workroom does not exist at ${workroomPath}.ts{/}`);
    ctx.sendLine('{dim}Create one to establish your sanctum.{/}');
    return;
  }

  // Already there?
  if (player.environment === workroom) {
    ctx.sendLine('{cyan}You are already home.{/}');
    return;
  }

  // Dramatic departure message to current room
  const currentRoom = player.environment;
  if (currentRoom) {
    const roomWithBroadcast = currentRoom as MudObject & {
      broadcast?: (msg: string, opts?: { exclude?: MudObject[] }) => void;
    };
    if (typeof roomWithBroadcast.broadcast === 'function') {
      roomWithBroadcast.broadcast(
        `\n{magenta}Arcane runes flare to life around ${p.name}, spiraling upward in a` +
        ` blinding helix of light. With a thunderous {bold}crack{/}{magenta}, they vanish,` +
        ` leaving only the faint scent of ozone.{/}\n`,
        { exclude: [player] }
      );
    }
  }

  // Teleport effect for the player
  ctx.sendLine('');
  ctx.sendLine('{magenta}You close your eyes and speak the words of power...{/}');
  ctx.sendLine('{cyan}Reality {bold}twists{/}{cyan} around you as arcane energy surges through your being.{/}');
  ctx.sendLine('{magenta}The world dissolves into a kaleidoscope of {bold}shimmering runes{/}{magenta}...{/}');
  ctx.sendLine('');

  // Move the player
  const moved = await player.moveTo(workroom);
  if (!moved) {
    ctx.sendLine('{red}The spell fizzles! Something prevents your return.{/}');
    return;
  }

  // Arrival message
  ctx.sendLine('{cyan}...and reforms around the familiar comfort of your sanctum.{/}');
  ctx.sendLine('{green}You are home.{/}');
  ctx.sendLine('');

  // Arrival message to the workroom (for anyone else there)
  const workroomWithBroadcast = workroom as MudObject & {
    broadcast?: (msg: string, opts?: { exclude?: MudObject[] }) => void;
  };
  if (typeof workroomWithBroadcast.broadcast === 'function') {
    workroomWithBroadcast.broadcast(
      `\n{magenta}A swirling vortex of {bold}arcane energy{/}{magenta} tears open in the air,` +
      ` and ${p.name} steps through, the portal snapping shut behind them.{/}\n`,
      { exclude: [player] }
    );
  }

  // Look at the workroom
  const room = workroom as Room;
  if (room.look) {
    room.look(player);
  }
}

export default { name, description, usage, execute };
