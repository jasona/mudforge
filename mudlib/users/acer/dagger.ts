/**
 * Steel Dagger
 *
 * A light weapon suitable for dual-wielding.
 */

import { Weapon, Living } from '../../lib/std.js';

export class SteelDagger extends Weapon {
  constructor() {
    super();

    this.setWeapon({
      shortDesc: 'a steel dagger',
      longDesc: `A well-balanced steel dagger with a keen double-edged blade. The hilt is wrapped
in dark leather for a secure grip, and the crossguard is minimal to allow for
quick, precise strikes. This weapon is light enough to be wielded in either hand.`,
      weight: 1,
      value: 50,
      minDamage: 3,
      maxDamage: 6,
      damageType: 'physical',
      handedness: 'light',
      slot: 'main_hand',
    });

    this.addId('dagger');
    this.addId('steel dagger');
    this.addId('knife');
  }

  override onWield(wielder: Living): void {
    const receiver = wielder as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You feel the light blade settle comfortably in your grip.{/}\n');
    }
  }
}

export default SteelDagger;
