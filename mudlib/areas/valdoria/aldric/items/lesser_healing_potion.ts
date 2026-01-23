/**
 * Lesser Healing Potion - Wrapper for the base HealingPotion class.
 */

import { HealingPotion } from '../../../../std/consumables/healing_potion.js';

export class LesserHealingPotion extends HealingPotion {
  constructor() {
    super('lesser');
  }
}

export default LesserHealingPotion;
