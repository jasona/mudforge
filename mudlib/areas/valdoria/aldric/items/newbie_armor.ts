/**
 * Newbie Armor - Basic padded armor for new adventurers.
 */

import { Armor } from '../../../../std/armor.js';

export class NewbieArmor extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'a padded training vest',
      longDesc: `A simple padded vest made of quilted cloth. It offers minimal
protection but is better than nothing for a new adventurer just
starting out. The padding shows signs of repair from previous
owners' training sessions.`,
      size: 'medium',
      weight: 2,
      slot: 'chest',
      itemLevel: 1, // Auto-balance: newbie tier
      value: 5, // Override: newbie items are cheap
    });

    this.addId('armor');
    this.addId('vest');
    this.addId('padded vest');
    this.addId('training vest');
    this.addId('newbie armor');

    // Mark as unsavable - newbie gear shouldn't persist
    this.savable = false;
  }
}

export default NewbieArmor;
