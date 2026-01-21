/**
 * Chainmail - Medium chest armor.
 */

import { Armor } from '../../../../std/armor.js';

export class Chainmail extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'a chainmail shirt',
      longDesc: `A shirt of interlocking metal rings that provides solid protection
against slashing attacks. Each ring has been individually riveted,
a sign of quality craftsmanship. The mail extends to mid-thigh and
includes a coif for head protection.`,
      size: 'huge',
      weight: 12,
      slot: 'chest',
      itemLevel: 15, // Auto-balance: quality chainmail
      resistances: {
        slashing: 2,
      },
    });

    this.addId('armor');
    this.addId('chainmail');
    this.addId('chain');
    this.addId('mail');
    this.addId('shirt');
  }
}

export default Chainmail;
