/**
 * Goblin Ear - A trophy from a slain goblin.
 *
 * Often collected as proof of goblin kills for bounties.
 */

import { Item } from '../../std/item.js';

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
      weight: 0.1,
      value: 2,
    });
  }
}

export default GoblinEar;
