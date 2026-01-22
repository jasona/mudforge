/**
 * Iron Boots
 *
 * Heavy boots reinforced with iron plates for protection.
 */

import { Armor, Living } from '../../lib/std.js';

export class IronBoots extends Armor {
  constructor() {
    super();

    this.setArmor({
      shortDesc: 'iron boots',
      longDesc: `A pair of heavy boots constructed from thick leather reinforced with
overlapping iron plates. The soles are studded for traction, and the
toe caps are solid iron to protect against crushing blows. Padding
lines the interior for comfort during long marches. They're not quiet,
but they'll keep your feet safe in battle.`,
      size: 'large',
      weight: 4,
      slot: 'feet',
      itemLevel: 8, // Auto-balance: iron quality
      resistances: {
        bludgeoning: 1,
      },
    });

    this.addId('boots');
    this.addId('iron boots');
    this.addId('armored boots');
    this.addId('footwear');
  }

  override onWear(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You stomp into the iron boots and lace them up.{/}\n');
    }
  }

  override onRemove(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You unlace and pull off your iron boots.{/}\n');
    }
  }
}

export default IronBoots;
