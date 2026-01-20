/**
 * Iron Dagger - A light weapon suitable for dual-wielding.
 */

import { Weapon } from '../../../../std/weapon.js';

export class IronDagger extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'an iron dagger',
      longDesc: `A simple but effective dagger with a sharp iron blade. The handle is
wrapped in dark leather for a secure grip. Light and quick, it's
perfect as a backup weapon or for those who prefer speed over raw
power.`,
      weight: 1,
      value: 40,
      minDamage: 2,
      maxDamage: 5,
      damageType: 'piercing',
      handedness: 'light',
      attackSpeed: 0.2,
    });

    this.addId('dagger');
    this.addId('iron dagger');
    this.addId('knife');
  }
}

export default IronDagger;
