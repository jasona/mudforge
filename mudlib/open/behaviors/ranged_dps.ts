/**
 * Ranged DPS NPC - Mage with ranged DPS behavior
 *
 * Maintains self-buffs, uses AoE damage against groups,
 * and prioritizes high-damage single-target spells.
 */

import { NPC } from '../../std/npc.js';

export class RangedDPS extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'arcane caster',
      shortDesc: 'an arcane caster',
      longDesc: 'Arcane energy crackles around this robed figure. Their eyes shimmer with magical power, and runes float lazily around their hands.',
      gender: 'neutral',
      level: 10,
    });

    this.maxMana = 250;
    this.mana = 250;

    this.setBehavior({
      mode: 'defensive',
      role: 'dps_ranged',
      guild: 'mage',
      wimpyThreshold: 15,
    });

    this.learnSkills([
      'mage:magic_missile',
      'mage:arcane_knowledge',
      'mage:fire_bolt',
      'mage:frost_armor',
      'mage:lightning',
      'mage:fireball',
    ], 10);
  }
}

export default RangedDPS;
