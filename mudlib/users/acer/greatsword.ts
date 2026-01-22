/**
 * Iron Greatsword
 *
 * A massive two-handed sword that requires both hands to wield.
 */

import { Weapon, Living } from '../../lib/std.js';

export class IronGreatsword extends Weapon {
  constructor() {
    super();

    this.setWeapon({
      shortDesc: 'an iron greatsword',
      longDesc: `This massive greatsword stands nearly as tall as a man. The broad blade is forged
from solid iron, with a central fuller running its length to reduce weight while
maintaining strength. The long hilt is wrapped in worn leather, designed to
accommodate a two-handed grip. Wield this weapon requires considerable strength,
but the devastating power it delivers makes the effort worthwhile.`,
      handedness: 'two_handed',
      size: 'huge',
      weight: 12,
      itemLevel: 10, // Auto-balance: iron quality
      damageType: 'slashing',
      slot: 'main_hand',
    });

    this.addId('greatsword');
    this.addId('iron greatsword');
    this.addId('sword');
    this.addId('great sword');
  }

  override onWield(wielder: Living): void {
    const receiver = wielder as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{yellow}You grip the massive blade with both hands, feeling its weight.{/}\n');
    }
  }

  override onUnwield(wielder: Living): void {
    const receiver = wielder as Living & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('{dim}You lower the heavy greatsword.{/}\n');
    }
  }
}

export default IronGreatsword;
