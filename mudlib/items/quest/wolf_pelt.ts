/**
 * Wolf Pelt - Quest item dropped by wolves.
 *
 * Collected for the Wolf Pelts quest from the tanner.
 */

import { Item } from '../../lib/std.js';

export class WolfPelt extends Item {
  constructor() {
    super();

    this.shortDesc = 'a wolf pelt';
    this.longDesc = `This is a thick, gray wolf pelt with soft fur and tough hide.
The quality is excellent - a skilled tanner could make fine leather
goods from this material. It still carries a faint musky scent.`;

    this.addId('pelt');
    this.addId('wolf pelt');
    this.addId('fur');
    this.addId('hide');

    this.weight = 3;
    this.value = 8;

    // Quest items can be dropped and saved
    this.dropable = true;
    this.savable = true;
  }
}

export default WolfPelt;
