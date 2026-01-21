/**
 * Newbie Shield - A basic wooden shield for new adventurers.
 */

import { Armor } from '../../../../std/armor.js';

export class NewbieShield extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'a wooden training shield',
      longDesc: `A round wooden shield reinforced with a simple iron rim. It's
seen better days - the wood is dented and scratched from
countless practice sessions. But it will serve to block a blow
or two while you learn the basics of combat.`,
      size: 'large',
      slot: 'shield',
      itemLevel: 1, // Auto-balance: newbie tier
      value: 5, // Override: newbie items are cheap
    });

    this.addId('shield');
    this.addId('wooden shield');
    this.addId('training shield');
    this.addId('newbie shield');

    // Mark as unsavable - newbie gear shouldn't persist
    this.savable = false;
  }
}

export default NewbieShield;
