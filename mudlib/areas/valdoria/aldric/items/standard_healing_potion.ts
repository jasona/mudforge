/**
 * Standard Healing Potion - Wrapper for the base HealingPotion class.
 */

import { HealingPotion } from '../../../../std/consumables/healing_potion.js';

export class StandardHealingPotion extends HealingPotion {
  constructor() {
    super('standard');
  }
}

export default StandardHealingPotion;
