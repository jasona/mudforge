/**
 * Tutorial command - Reset and re-enter tutorial flow (builder+).
 *
 * Usage:
 *   tutorial start
 *   tutorial reset
 */

import type { MudObject } from '../../lib/std.js';
import { getTutorialDaemon } from '../../daemons/tutorial.js';

const TUTORIAL_START_ROOM = '/areas/tutorial/war_camp';

interface CommandContext {
  player: MudObject;
  args: string;
  sendLine(message: string): void;
}

interface TutorialTestPlayer extends MudObject {
  setProperty(key: string, value: unknown): void;
}

interface RoomLike extends MudObject {
  look?(viewer: MudObject): void;
}

export const name = ['tutorial'];
export const description = 'Reset and start the tutorial (builder+)';
export const usage = 'tutorial <start|reset>';

function resetTutorialState(player: TutorialTestPlayer): void {
  player.setProperty('tutorial_complete', false);
  player.setProperty('tutorial_step', -1);
  player.setProperty('tutorial_items_picked', {});
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();
  if (args && args !== 'start' && args !== 'reset') {
    ctx.sendLine('{yellow}Usage: tutorial <start|reset>{/}');
    return;
  }

  const tutorialDaemon = getTutorialDaemon();
  const room = await tutorialDaemon.getTutorialRoomForPlayer(ctx.player, TUTORIAL_START_ROOM, true);
  if (!room) {
    ctx.sendLine(`{red}Unable to load tutorial start room: ${TUTORIAL_START_ROOM}{/}`);
    return;
  }

  const player = ctx.player as TutorialTestPlayer;
  resetTutorialState(player);

  const moved = await player.moveTo(room);
  if (!moved) {
    ctx.sendLine('{red}Something prevents you from entering the tutorial area.{/}');
    return;
  }

  tutorialDaemon.onPlayerArrivedAtCamp(player);

  ctx.sendLine('{green}Tutorial reset complete. Engage General Ironheart to begin.{/}');

  const roomLike = room as RoomLike;
  if (typeof roomLike.look === 'function') {
    roomLike.look(player);
  }
}

export default { name, description, usage, execute };
