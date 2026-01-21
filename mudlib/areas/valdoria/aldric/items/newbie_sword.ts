/**
 * Newbie Sword - A basic training sword for new adventurers.
 */

import { Weapon } from '../../../../std/weapon.js';

export class NewbieSword extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'a worn training sword',
      longDesc: `A well-worn training sword with a dull edge. While not particularly
impressive, it's sturdy enough to serve a new adventurer until they
can afford something better. The leather grip is soft from years of
use by countless beginners.`,
      handedness: 'one_handed',
      weight: 2, // Explicit: lighter than typical swords
      value: 5,
      minDamage: 2,
      maxDamage: 4,
      damageType: 'slashing',
    });

    this.addId('sword');
    this.addId('training sword');
    this.addId('newbie sword');
    this.addId('worn sword');
    this.addId('blade');

    // Mark as unsavable - newbie gear shouldn't persist
    this.savable = false;
  }
}

export default NewbieSword;
