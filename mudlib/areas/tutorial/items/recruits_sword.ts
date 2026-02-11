/**
 * Recruit's Sword
 *
 * Tutorial weapon given to new players at the supply tent.
 * Notifies TutorialDaemon on pickup (via moveTo) and wield.
 */

import { Weapon, Living } from '../../../lib/std.js';
import { getTutorialDaemon } from '../../../daemons/tutorial.js';

export class RecruitsSword extends Weapon {
  constructor() {
    super();
    this.shortDesc = "a recruit's sword";
    this.longDesc = `A simple but serviceable iron sword issued to new recruits. The blade
is freshly sharpened and the leather grip is stiff and new. It won't
win any beauty contests, but it'll keep you alive.`;
    this.addId('sword');
    this.addId('recruits sword');
    this.addId("recruit's sword");
    this.damageType = 'slashing';
    this.handedness = 'one_handed';
    this.minDamage = 2;
    this.maxDamage = 4;
    this.weight = 3;
  }

  override moveTo(destination: MudObject | null): boolean | Promise<boolean> {
    const result = super.moveTo(destination);
    // Detect pickup: destination is a connected player (has isConnected method)
    const dest = destination as Record<string, unknown> | null;
    if (dest && typeof dest.isConnected === 'function') {
      try {
        getTutorialDaemon().recordItemPickup(destination as never, 'sword');
      } catch (e) {
        console.error('[TUTORIAL] sword moveTo hook error:', e);
      }
    }
    return result;
  }

  override onWield(wielder: Living): void {
    try {
      getTutorialDaemon().notify(wielder, 'wielded_weapon');
    } catch (e) {
      console.error('[TUTORIAL] sword onWield hook error:', e);
    }
  }
}

export default RecruitsSword;
