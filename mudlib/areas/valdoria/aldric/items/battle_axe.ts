/**
 * Battle Axe - A powerful two-handed weapon.
 */

import { Weapon } from '../../../../std/weapon.js';

export class BattleAxe extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'a battle axe',
      longDesc: `A massive two-handed battle axe with a crescent-shaped head. The
blade is made of thick, tempered steel capable of cleaving through
armor. The long oak shaft is reinforced with iron bands. It's a
weapon that demands strength but rewards with devastating power.`,
      weight: 8,
      value: 180,
      minDamage: 8,
      maxDamage: 16,
      damageType: 'slashing',
      handedness: 'two_handed',
      attackSpeed: -0.2,
    });

    this.addId('axe');
    this.addId('battle axe');
    this.addId('battleaxe');
  }
}

export default BattleAxe;
