/**
 * HeartyStew - A nourishing bowl of stew.
 *
 * Premium food item that heals instantly and provides regeneration over time.
 */

import { Consumable, Effects } from '../consumable.js';

export class HeartyStew extends Consumable {
  constructor() {
    super();

    this.setIds(['stew', 'hearty stew', 'hearty_stew', 'bowl of stew']);
    this.shortDesc = 'a bowl of hearty stew';
    this.longDesc = 'A steaming bowl of thick, hearty stew filled with chunks of meat and vegetables. The aroma is irresistible.';
    this.value = 25;
    this.size = 'small';
    this.weight = 0.8;

    this.setConsumable({
      type: 'food',
      healHp: 20,
      regenEffect: Effects.regeneration(30000, 3, 2000), // +3 HP every 2s for 30s (45 HP total)
      consumeMessage: 'You drink the hearty stew, feeling warmth spread through your body.',
      roomMessage: '$N drinks a bowl of hearty stew.',
    });
  }
}

export default HeartyStew;
