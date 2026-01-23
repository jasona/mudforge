/**
 * Tinder - Crafting material for campfires.
 *
 * Used to craft campfires and relight extinguished ones.
 * 3 firewood + 1 tinder = 1 campfire.
 */

import { Item } from '../item.js';

export class Tinder extends Item {
  constructor() {
    super();

    this.setIds(['tinder', 'tinder pouch', 'pouch']);
    this.shortDesc = 'a tinder pouch';
    this.longDesc = 'A small leather pouch containing dry moss, wood shavings, and other materials perfect for starting fires.';
    this.value = 1;
    this.size = 'tiny';
    this.weight = 0.1;
  }
}

export default Tinder;
