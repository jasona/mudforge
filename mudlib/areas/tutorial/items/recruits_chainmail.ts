/**
 * Recruit's Chainmail
 *
 * Tutorial chest armor given to new players at the supply tent.
 * Notifies TutorialDaemon on pickup (via moveTo) and wear.
 */

import { Armor, Living } from '../../../lib/std.js';
import { getTutorialDaemon } from '../../../daemons/tutorial.js';

export class RecruitsChainmail extends Armor {
  constructor() {
    super();
    this.shortDesc = "a recruit's chainmail";
    this.longDesc = `A basic chainmail shirt made of interlocking iron rings. It's seen
better days — a few links are mismatched replacements — but it will
turn aside a blade well enough.`;
    this.addId('chainmail');
    this.addId('recruits chainmail');
    this.addId("recruit's chainmail");
    this.addId('mail');
    this.weight = 5;
    this.slot = 'chest';
    this.armor = 2;
  }

  override moveTo(destination: MudObject | null): boolean | Promise<boolean> {
    const result = super.moveTo(destination);
    // Detect pickup: destination is a connected player (has isConnected method)
    const dest = destination as Record<string, unknown> | null;
    if (dest && typeof dest.isConnected === 'function') {
      try {
        getTutorialDaemon().recordItemPickup(destination as never, 'chainmail');
      } catch (e) {
        console.error('[TUTORIAL] chainmail moveTo hook error:', e);
      }
    }
    return result;
  }

  override onWear(wearer: Living): void {
    try {
      getTutorialDaemon().notify(wearer, 'wore_armor');
    } catch (e) {
      console.error('[TUTORIAL] chainmail onWear hook error:', e);
    }
  }
}

export default RecruitsChainmail;
