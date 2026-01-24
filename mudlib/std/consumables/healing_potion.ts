/**
 * HealingPotion - Magical potions that restore HP.
 *
 * Available in different strengths: minor, lesser, standard, greater, major.
 */

import { Consumable } from '../consumable.js';

/**
 * Potion strength levels.
 */
export type PotionStrength = 'minor' | 'lesser' | 'standard' | 'greater' | 'major';

/**
 * Healing amounts and values per strength.
 */
const POTION_DATA: Record<PotionStrength, { heal: number; value: number; color: string }> = {
  minor: { heal: 15, value: 25, color: 'pale red' },
  lesser: { heal: 30, value: 50, color: 'light red' },
  standard: { heal: 50, value: 100, color: 'red' },
  greater: { heal: 80, value: 200, color: 'deep red' },
  major: { heal: 120, value: 400, color: 'brilliant crimson' },
};

/**
 * A magical potion that restores health.
 */
export class HealingPotion extends Consumable {
  private _strength: PotionStrength;

  constructor(strength: PotionStrength = 'minor') {
    super();

    this._strength = strength;
    const data = POTION_DATA[strength];

    const strengthName = strength === 'standard' ? '' : `${strength} `;
    this.setIds([
      'potion',
      'healing potion',
      'healing_potion',
      `${strength} healing potion`,
      `${strength}_healing_potion`,
      'health potion',
    ]);
    this.shortDesc = `a ${strengthName}healing potion`;
    this.longDesc = `A small glass vial filled with a ${data.color} liquid. The potion swirls gently even when still.`;
    this.value = data.value;
    this.size = 'tiny';
    this.weight = 0.2;

    this.setConsumable({
      type: 'potion',
      healHp: data.heal,
      consumeMessage: `You drink the ${strengthName}healing potion. Warmth floods through your body.`,
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
export const createMinorHealingPotion = () => new HealingPotion('minor');
export const createLesserHealingPotion = () => new HealingPotion('lesser');
export const createStandardHealingPotion = () => new HealingPotion('standard');
export const createGreaterHealingPotion = () => new HealingPotion('greater');
export const createMajorHealingPotion = () => new HealingPotion('major');

export default HealingPotion;
