/**
 * Greater Healing Potion - Wrapper for the base HealingPotion class.
 */

import { HealingPotion } from '../../../../std/consumables/healing_potion.js';

export class GreaterHealingPotion extends HealingPotion {
  constructor() {
    super('greater');
  }
}

export default GreaterHealingPotion;
