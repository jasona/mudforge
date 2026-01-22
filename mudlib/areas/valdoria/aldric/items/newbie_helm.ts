/**
 * Newbie Helm - A basic leather cap for new adventurers.
 */

import { Armor } from '../../../../std/armor.js';

export class NewbieHelm extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'a leather training cap',
      longDesc: `A simple leather cap that provides basic head protection. It's
been worn by many training recruits before you, as evidenced by
the scuff marks and slightly stretched fit. Still, it might save
you from a nasty bump.`,
      size: 'medium',
      slot: 'head',
      itemLevel: 1, // Auto-balance: newbie tier
      value: 3, // Override: newbie items are cheap
    });

    this.addId('helm');
    this.addId('cap');
    this.addId('leather cap');
    this.addId('training cap');
    this.addId('newbie helm');
    this.addId('hat');

    // Mark as unsavable - newbie gear shouldn't persist
    this.savable = false;
  }
}

export default NewbieHelm;
