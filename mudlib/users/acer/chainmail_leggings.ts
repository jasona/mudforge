/**
 * Chainmail Leggings
 *
 * Protective leg armor made of interlocking metal rings.
 */

import { Armor, Living } from '../../lib/std.js';

export class ChainmailLeggings extends Armor {
  constructor() {
    super();

    this.setArmor({
      shortDesc: 'chainmail leggings',
      longDesc: `A pair of chainmail leggings constructed from thousands of interlocking
iron rings. They extend from the waist down to the ankles, with leather
straps at the waist and knees to keep them secure. A padded cloth lining
prevents the metal from chafing against skin. The rings are riveted for
extra durability, a mark of quality craftsmanship.`,
      size: 'large', // Metal leg armor
      weight: 6, // Heavier than default large
      value: 150,
      armor: 3,
      slot: 'legs',
      resistances: {
        slashing: 1,
      },
    });

    this.addId('leggings');
    this.addId('chainmail leggings');
    this.addId('chain leggings');
    this.addId('leg armor');
    this.addId('greaves');
  }

  override onWear(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You step into the chainmail leggings and secure the straps.{/}\n');
    }
  }

  override onRemove(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You unbuckle the straps and step out of your chainmail leggings.{/}\n');
    }
  }
}

export default ChainmailLeggings;
