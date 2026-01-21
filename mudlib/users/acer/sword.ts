/**
 * Acer's Enchanted Longsword
 *
 * A finely crafted longsword with a faint magical glow.
 */

import { Weapon, Living } from '../../lib/std.js';

export class EnchantedLongsword extends Weapon {
  constructor() {
    super();

    this.setWeapon({
      shortDesc: 'an enchanted longsword',
      longDesc: `This elegant longsword gleams with a faint blue luminescence. The blade is forged
from finest steel, its edge honed to razor sharpness. Intricate runes are etched
along the fuller, pulsing softly with arcane energy. The crossguard is wrought in
the shape of dragon wings, and the leather-wrapped hilt feels perfectly balanced
in your hand.`,
      handedness: 'one_handed',
      size: 'large',
      weight: 4,
      itemLevel: 15, // Auto-balance: enchanted quality
      value: 500, // Override: enchanted items are valuable
      damageType: 'slashing',
      slot: 'main_hand',
    });

    // Add identifiers so players can refer to it
    this.addId('sword');
    this.addId('longsword');
    this.addId('enchanted sword');
    this.addId('enchanted longsword');
  }

  /**
   * Called when the sword is wielded.
   */
  override onWield(wielder: Living): void {
    const receiver = wielder as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{cyan}The runes along the blade flare brightly as you grip the hilt!{/}\n');
    }
  }

  /**
   * Called when the sword is unwielded.
   */
  override onUnwield(wielder: Living): void {
    const receiver = wielder as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}The runes on the blade fade as you release the sword.{/}\n');
    }
  }
}

export default EnchantedLongsword;
