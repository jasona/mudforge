/**
 * TravelRations - Preserved food for travelers.
 *
 * Affordable food that keeps well and provides moderate healing.
 */

import { Consumable } from '../consumable.js';

export class TravelRations extends Consumable {
  constructor() {
    super();

    this.setIds(['rations', 'travel rations', 'travel_rations', 'food']);
    this.shortDesc = 'travel rations';
    this.longDesc = 'A bundle of dried meat, hard cheese, and biscuits wrapped in cloth. Practical food for the road.';
    this.value = 5;
    this.size = 'small';
    this.weight = 0.4;

    this.setConsumable({
      type: 'food',
      healHp: 8,
      consumeMessage: 'You eat some travel rations. Not fancy, but filling.',
      roomMessage: '$N eats some travel rations.',
    });
  }
}

export default TravelRations;
