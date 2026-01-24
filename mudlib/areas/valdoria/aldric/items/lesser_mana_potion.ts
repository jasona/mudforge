/**
 * Lesser Mana Potion - Wrapper for the base ManaPotion class.
 */

import { ManaPotion } from '../../../../std/consumables/mana_potion.js';

export class LesserManaPotion extends ManaPotion {
  constructor() {
    super('lesser');
  }
}

export default LesserManaPotion;
