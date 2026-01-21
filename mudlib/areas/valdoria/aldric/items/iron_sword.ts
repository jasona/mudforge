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
      handedness: 'one_handed',
      size: 'large',
      itemLevel: 6, // Auto-balance: iron quality
      damageType: 'slashing',
    });

    this.addId('sword');
    this.addId('iron sword');
    this.addId('blade');
  }
}

export default IronSword;
