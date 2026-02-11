/**
 * Camp Exit
 *
 * Final tutorial room. Entering this room triggers tutorial completion,
 * awards XP, and teleports the player to Aldric town center.
 *
 * Exits: east → Aldric center (logical, but completion teleports first)
 */

import { Room } from '../../lib/std.js';
import { getTutorialDaemon } from '../../daemons/tutorial.js';

export class CampExit extends Room {
  constructor() {
    super();
    this.shortDesc = 'Camp Gate';
    this.longDesc = `You pass through the wooden palisade gate marking the edge of the
military camp. A muddy road stretches eastward through rolling fields
toward the distant walls of Aldric. Carts laden with supplies rumble
past in both directions, and a column of weary soldiers marches in
from the field.

A weathered signpost reads: {yellow}"ALDRIC — 1 LEAGUE EAST"{/}

The training yard lies back to the {green}west{/}.`;
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/tutorial/training_yard');
    this.addExit('east', '/areas/valdoria/aldric/center');
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const player = obj as MudObject & {
      isConnected?: () => boolean;
      getProperty?: (key: string) => unknown;
    };
    if (typeof player.isConnected !== 'function') return;
    if (player.getProperty?.('tutorial_complete')) return;

    try {
      getTutorialDaemon().notify(obj as never, 'entered_exit');
    } catch (e) {
      console.error('[TUTORIAL] camp_exit onEnter error:', e);
    }
  }
}

export default CampExit;
