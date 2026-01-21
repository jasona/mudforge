/**
 * Traveler's Cloak
 *
 * A warm woolen cloak that provides modest protection from the elements.
 */

import { Armor, Living } from '../../lib/std.js';

export class TravelersCloak extends Armor {
  constructor() {
    super();

    this.setArmor({
      shortDesc: "a traveler's cloak",
      longDesc: `A heavy woolen cloak dyed a deep forest green. The fabric is tightly woven
to keep out wind and rain, and the hood is large enough to shadow your face.
A bronze clasp shaped like a leaf holds it closed at the throat. The hem
shows signs of road dust and minor repairs, marking it as well-traveled.`,
      size: 'medium', // Cloth cloak
      value: 45,
      armor: 1,
      slot: 'cloak',
    });

    this.addId('cloak');
    this.addId('travelers cloak');
    this.addId("traveler's cloak");
    this.addId('green cloak');
  }

  override onWear(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You swing the cloak around your shoulders and fasten the clasp.{/}\n');
    }
  }

  override onRemove(wearer: Living): void {
    const receiver = wearer as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You unfasten the clasp and remove your cloak.{/}\n');
    }
  }
}

export default TravelersCloak;
