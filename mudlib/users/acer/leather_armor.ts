/**
 * Leather Armor
 *
 * Basic chest armor made of hardened leather.
 */

import { Armor } from '../../std/armor.js';
import { Living } from '../../std/living.js';

export class LeatherArmor extends Armor {
  constructor() {
    super();

    this.setArmor({
      shortDesc: 'leather armor',
      longDesc: `A sturdy suit of hardened leather armor, consisting of a cuirass that protects
the chest and back. The leather has been treated and hardened to provide decent
protection while remaining flexible enough for easy movement. Brass buckles
secure the sides, and the interior is lined with soft cloth for comfort.`,
      weight: 8,
      value: 100,
      armor: 3,
      slot: 'chest',
    });

    this.addId('armor');
    this.addId('leather');
    this.addId('leather armor');
    this.addId('cuirass');
  }

  override onWear(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}The leather armor settles snugly against your torso.{/}\n');
    }
  }
}

export default LeatherArmor;
