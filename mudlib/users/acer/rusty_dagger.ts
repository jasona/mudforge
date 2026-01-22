/**
 * Rusty Dagger - A worn goblin weapon.
 *
 * A small, corroded blade that has seen better days.
 * Common drop from goblins.
 */

import { Weapon } from '../../lib/std.js';

export class RustyDagger extends Weapon {
  constructor() {
    super();

    this.setIds(['dagger', 'rusty dagger', 'knife', 'blade']);

    this.setWeapon({
      shortDesc: 'a rusty dagger',
      longDesc:
        'This small dagger is pitted with rust and has clearly seen better days. ' +
        'The blade is chipped in several places, but it could still do some damage ' +
        'in a pinch. A faint smell of goblin lingers on the leather-wrapped hilt.',
      handedness: 'light',
      size: 'medium',
      itemLevel: 1, // Auto-balance: trash tier
      value: 5, // Override: rusty items worth less
      damageType: 'piercing',
      attackSpeed: 0.1,
    });
  }
}

export default RustyDagger;
