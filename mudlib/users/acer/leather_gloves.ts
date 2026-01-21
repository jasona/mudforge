/**
 * Leather Gloves
 *
 * Sturdy leather gloves that protect the hands while maintaining dexterity.
 */

import { Armor, Living } from '../../lib/std.js';

export class LeatherGloves extends Armor {
  constructor() {
    super();

    this.setArmor({
      shortDesc: 'leather gloves',
      longDesc: `A pair of well-crafted leather gloves made from supple brown cowhide. The
palms are reinforced with an extra layer of leather for grip and protection,
while the fingers remain thin enough to maintain fine dexterity. The cuffs
extend partway up the forearm and are secured with small brass buckles.`,
      size: 'small', // Light hand armor
      value: 35,
      armor: 1,
      slot: 'hands',
    });

    this.addId('gloves');
    this.addId('leather gloves');
    this.addId('gauntlets');
  }

  override onWear(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You pull on the leather gloves and flex your fingers.{/}\n');
    }
  }

  override onRemove(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You pull off your leather gloves.{/}\n');
    }
  }
}

export default LeatherGloves;
