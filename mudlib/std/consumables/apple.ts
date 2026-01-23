/**
 * Apple - A fresh apple.
 *
 * Cheap and light food item.
 */

import { Consumable } from '../consumable.js';

export class Apple extends Consumable {
  constructor() {
    super();

    this.setIds(['apple', 'fruit']);
    this.shortDesc = 'a red apple';
    this.longDesc = 'A fresh, crisp red apple. It looks perfectly ripe.';
    this.value = 1;
    this.size = 'tiny';
    this.weight = 0.2;

    this.setConsumable({
      type: 'food',
      healHp: 3,
      consumeMessage: 'You bite into the crisp apple with a satisfying crunch.',
      roomMessage: '$N eats an apple.',
    });
  }
}

export default Apple;
