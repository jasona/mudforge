/**
 * CookedMeat - A serving of cooked meat.
 *
 * Moderate food item that restores HP.
 */

import { Consumable } from '../consumable.js';

export class CookedMeat extends Consumable {
  constructor() {
    super();

    this.setIds(['meat', 'cooked meat', 'cooked_meat']);
    this.shortDesc = 'a portion of cooked meat';
    this.longDesc = 'A hearty portion of well-seasoned, cooked meat. It looks tender and juicy.';
    this.value = 10;
    this.size = 'small';
    this.weight = 0.5;

    this.setConsumable({
      type: 'food',
      healHp: 15,
      consumeMessage: 'You savor a bite of the delicious cooked meat.',
      roomMessage: '$N eats some cooked meat.',
    });
  }
}

export default CookedMeat;
