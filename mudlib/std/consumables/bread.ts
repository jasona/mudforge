/**
 * Bread - A simple loaf of bread.
 *
 * Basic food item that restores a small amount of HP.
 */

import { Consumable } from '../consumable.js';

export class Bread extends Consumable {
  constructor() {
    super();

    this.setIds(['bread', 'loaf', 'loaf of bread']);
    this.shortDesc = 'a loaf of bread';
    this.longDesc = 'A freshly baked loaf of bread with a golden crust. It smells wonderful.';
    this.value = 3;
    this.size = 'small';
    this.weight = 0.5;

    this.setConsumable({
      type: 'food',
      healHp: 5,
      consumeMessage: 'You tear off a piece of bread and eat it.',
      roomMessage: '$N eats some bread.',
    });
  }
}

export default Bread;
