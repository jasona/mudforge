/**
 * Firewood - Crafting material for campfires.
 *
 * Used to craft campfires. 3 firewood + 1 tinder = 1 campfire.
 */

import { Item } from '../item.js';

export class Firewood extends Item {
  constructor() {
    super();

    this.setIds(['firewood', 'wood', 'bundle of firewood', 'bundle']);
    this.shortDesc = 'a bundle of firewood';
    this.longDesc = 'A bundle of dry sticks and small logs, perfect for building a campfire.';
    this.value = 2;
    this.size = 'small';
    this.weight = 1.5;
  }
}

export default Firewood;
