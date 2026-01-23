/**
 * Major Healing Potion - Wrapper for the base HealingPotion class.
 */

import { HealingPotion } from '../../../../std/consumables/healing_potion.js';

export class MajorHealingPotion extends HealingPotion {
  constructor() {
    super('major');
  }
}

export default MajorHealingPotion;
