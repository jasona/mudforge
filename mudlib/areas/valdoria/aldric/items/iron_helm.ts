/**
 * Iron Helm - Basic head protection.
 */

import { Armor } from '../../../../std/armor.js';

export class IronHelm extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'an iron helm',
      longDesc: `A simple iron helmet with a nose guard and ear flaps. The inside is
lined with leather padding for comfort. While it somewhat limits
peripheral vision, the protection it offers to the head is
invaluable in combat.`,
      size: 'large', // Metal helm (weight 3)
      value: 60,
      armor: 2,
      slot: 'head',
    });

    this.addId('helm');
    this.addId('helmet');
    this.addId('iron helm');
    this.addId('iron helmet');
  }
}

export default IronHelm;
