/**
 * Sealed Letter - Quest item for the Urgent Message quest.
 *
 * A sealed letter that must be delivered to Master Vorn.
 */

import { Item } from '../../lib/std.js';

export class SealedLetter extends Item {
  constructor() {
    super();

    this.shortDesc = 'a sealed letter';
    this.longDesc = `This is an official-looking letter sealed with red wax. The seal bears
an intricate emblem - perhaps a noble house or military insignia. The
parchment is thick and high-quality, suggesting the contents are important.

The letter is addressed to "Master Vorn, Training Hall" in neat script.
Whatever message it contains, it seems urgent.`;

    this.addId('letter');
    this.addId('sealed letter');
    this.addId('message');
    this.addId('sealed');

    this.weight = 0;
    this.value = 0;

    // Quest items should save but not be droppable (prevent losing them)
    this.dropable = false;
    this.savable = true;
  }
}

export default SealedLetter;
