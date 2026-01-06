/**
 * Wooden Shield
 *
 * A basic shield that uses the off-hand slot.
 */

import { Armor } from '../../std/armor.js';
import { Living } from '../../std/living.js';

export class WoodenShield extends Armor {
  constructor() {
    super();

    this.setArmor({
      shortDesc: 'a wooden shield',
      longDesc: `A round shield crafted from sturdy oak planks, bound together with iron bands.
The face is slightly convex to deflect blows, and a large iron boss in the
center protects your hand grip. The back has a leather-padded handle and arm
strap. While not as durable as a metal shield, it provides solid protection
without being overly heavy.`,
      weight: 5,
      value: 40,
      armor: 2,
      slot: 'shield',
    });

    this.addId('shield');
    this.addId('wooden shield');
    this.addId('wood shield');
  }

  override onWear(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You strap the wooden shield to your arm.{/}\n');
    }
  }

  override onRemove(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You unstrap the shield from your arm.{/}\n');
    }
  }
}

export default WoodenShield;
