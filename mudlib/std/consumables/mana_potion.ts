/**
 * ManaPotion - Magical potions that restore MP.
 *
 * Available in different strengths: minor, lesser, standard, greater, major.
 */

import { Consumable } from '../consumable.js';

/**
 * Potion strength levels.
 */
export type PotionStrength = 'minor' | 'lesser' | 'standard' | 'greater' | 'major';

/**
 * Mana restoration amounts and values per strength.
 */
const POTION_DATA: Record<PotionStrength, { restore: number; value: number; color: string }> = {
  minor: { restore: 15, value: 25, color: 'pale blue' },
  lesser: { restore: 30, value: 50, color: 'light blue' },
  standard: { restore: 50, value: 100, color: 'blue' },
  greater: { restore: 80, value: 200, color: 'deep blue' },
  major: { restore: 120, value: 400, color: 'brilliant azure' },
};

/**
 * A magical potion that restores mana.
 */
export class ManaPotion extends Consumable {
  private _strength: PotionStrength;

  constructor(strength: PotionStrength = 'minor') {
    super();

    this._strength = strength;
    const data = POTION_DATA[strength];

    const strengthName = strength === 'standard' ? '' : `${strength} `;
    this.setIds([
      'mana potion',
      'mana_potion',
      `${strength} mana potion`,
      `${strength}_mana_potion`,
      'mp potion',
      'magic potion',
    ]);
    this.shortDesc = `a ${strengthName}mana potion`;
    this.longDesc = `A small glass vial filled with a ${data.color} liquid that seems to shimmer with arcane energy.`;
    this.value = data.value;
    this.size = 'tiny';
    this.weight = 0.2;

    this.setConsumable({
      type: 'potion',
      healMp: data.restore,
      consumeMessage: `You drink the ${strengthName}mana potion. Magical energy surges through you.`,
      roomMessage: `$N drinks a ${data.color} potion.`,
    });
  }

  /**
   * Get the potion's strength.
   */
  get strength(): PotionStrength {
    return this._strength;
  }
}

// Factory functions for convenience
export const createMinorManaPotion = () => new ManaPotion('minor');
export const createLesserManaPotion = () => new ManaPotion('lesser');
export const createStandardManaPotion = () => new ManaPotion('standard');
export const createGreaterManaPotion = () => new ManaPotion('greater');
export const createMajorManaPotion = () => new ManaPotion('major');

export default ManaPotion;
