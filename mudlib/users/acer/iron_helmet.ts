/**
 * Iron Helmet
 *
 * A basic protective helmet made of iron.
 */

import { Armor, Living } from '../../lib/std.js';

export class IronHelmet extends Armor {
  constructor() {
    super();

    this.setArmor({
      shortDesc: 'an iron helmet',
      longDesc: `A simple but effective helmet forged from iron. The rounded bowl protects the
skull, while a nose guard extends down to shield the face. Cheek guards hang
from the sides, and the interior is padded with leather for comfort. It's not
fancy, but it will protect your head from most blows.`,
      weight: 4,
      value: 75,
      armor: 2,
      slot: 'head',
    });

    this.addId('helmet');
    this.addId('iron helmet');
    this.addId('helm');
  }

  override onWear(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You settle the iron helmet on your head.{/}\n');
    }
  }
}

export default IronHelmet;
