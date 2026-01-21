/**
 * Iron Sword - A basic one-handed sword.
 */

import { Weapon } from '../../../../std/weapon.js';

export class IronSword extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'an iron sword',
      longDesc: `A sturdy iron sword with a double-edged blade. The crossguard is simple
but functional, and the leather-wrapped grip shows signs of quality
craftsmanship. While not exceptional, it's a reliable weapon for any
adventurer.`,
      size: 'large', // Heavier than average sword
      value: 100,
      minDamage: 4,
      maxDamage: 8,
      damageType: 'slashing',
      handedness: 'one_handed',
    });

    this.addId('sword');
    this.addId('iron sword');
    this.addId('blade');
  }
}

export default IronSword;
