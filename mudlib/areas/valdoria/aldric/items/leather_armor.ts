/**
 * Leather Armor - Basic chest protection.
 */

import { Armor } from '../../../../std/armor.js';

export class LeatherArmor extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'leather armor',
      longDesc: `A vest of hardened leather reinforced with metal studs at critical
points. The leather has been treated and cured to provide decent
protection while remaining flexible enough for full freedom of
movement. Ideal for scouts and rogues who value mobility.`,
      size: 'large',
      weight: 5,
      slot: 'chest',
      itemLevel: 6, // Auto-balance: studded leather quality
    });

    this.addId('armor');
    this.addId('leather');
    this.addId('leather armor');
    this.addId('vest');
  }
}

export default LeatherArmor;
