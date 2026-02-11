/**
 * Recruit's Helm
 *
 * Tutorial head armor given to new players at the supply tent.
 * Notifies TutorialDaemon on pickup (via moveTo) and wear.
 */

import { Armor, Living } from '../../../lib/std.js';
import { getTutorialDaemon } from '../../../daemons/tutorial.js';

export class RecruitsHelm extends Armor {
  constructor() {
    super();
    this.shortDesc = "a recruit's helm";
    this.longDesc = `A dented iron helm with a simple nose guard. The leather liner inside
is worn but intact. Standard military issue — functional, if not
flattering.`;
    this.addId('helm');
    this.addId('helmet');
    this.addId('recruits helm');
    this.addId("recruit's helm");
    this.weight = 2;
    this.slot = 'head';
    this.armor = 1;
  }

  override moveTo(destination: MudObject | null): boolean | Promise<boolean> {
    const result = super.moveTo(destination);
    // Detect pickup: destination is a connected player (has isConnected method)
    const dest = destination as Record<string, unknown> | null;
    if (dest && typeof dest.isConnected === 'function') {
      try {
        getTutorialDaemon().recordItemPickup(destination as never, 'helm');
      } catch (e) {
        console.error('[TUTORIAL] helm moveTo hook error:', e);
      }
    }
    return result;
  }

  override onWear(wearer: Living): void {
    try {
      getTutorialDaemon().notify(wearer, 'wore_armor');
    } catch (e) {
      console.error('[TUTORIAL] helm onWear hook error:', e);
    }
  }
}

export default RecruitsHelm;
