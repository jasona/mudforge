/**
 * Iron Shield - A sturdy shield for off-hand defense.
 */

import { Armor } from '../../../../std/armor.js';

export class IronShield extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'an iron shield',
      longDesc: `A round iron shield about two feet in diameter. The face is
slightly convex with a central boss, and the grip is made of
thick leather wrapped around an iron bar. Scratches and dents
on the surface attest to its proven reliability in battle.`,
      size: 'large', // Shield category
      weight: 6, // Explicit: iron shields are heavier than wooden
      value: 90,
      armor: 3,
      slot: 'shield',
      resistances: {
        bludgeoning: 1,
      },
    });

    this.addId('shield');
    this.addId('iron shield');
  }
}

export default IronShield;
