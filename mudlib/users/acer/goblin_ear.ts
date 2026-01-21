/**
 * Goblin Ear - A trophy from a slain goblin.
 *
 * Often collected as proof of goblin kills for bounties.
 */

import { Item } from '../../lib/std.js';

export class GoblinEar extends Item {
  constructor() {
    super();

    this.setIds(['ear', 'goblin ear', 'trophy']);

    this.setItem({
      shortDesc: 'a severed goblin ear',
      longDesc:
        'This small, pointed ear has been crudely hacked from a goblin corpse. ' +
        'The greenish skin is leathery and wrinkled. Some towns pay a bounty ' +
        'for these as proof of goblin extermination.',
      size: 'tiny', // A small ear (weight 0.1)
      value: 2,
    });
  }
}

export default GoblinEar;
