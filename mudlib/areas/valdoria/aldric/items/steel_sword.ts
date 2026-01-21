/**
 * Steel Sword - A quality one-handed sword.
 */

import { Weapon } from '../../../../std/weapon.js';

export class SteelSword extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'a steel sword',
      longDesc: `A well-forged steel sword with excellent balance. The blade gleams with
a mirror-like polish, its edge keen enough to split a hair. The pommel
is weighted for better control, and the guard is decorated with simple
but elegant engravings.`,
      handedness: 'one_handed',
      size: 'large', // Quality steel sword, heavier than average
      value: 250,
      minDamage: 6,
      maxDamage: 12,
      damageType: 'slashing',
    });

    this.addId('sword');
    this.addId('steel sword');
    this.addId('blade');
  }
}

export default SteelSword;
