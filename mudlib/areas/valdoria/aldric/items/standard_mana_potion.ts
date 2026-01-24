/**
 * Standard Mana Potion - Wrapper for the base ManaPotion class.
 */

import { ManaPotion } from '../../../../std/consumables/mana_potion.js';

export class StandardManaPotion extends ManaPotion {
  constructor() {
    super('standard');
  }
}

export default StandardManaPotion;
