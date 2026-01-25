/**
 * Battle Mage - Example Mage NPC with ranged DPS behavior
 *
 * This NPC demonstrates the dps_ranged combat role.
 * It will:
 * - Maintain self-buffs (Frost Armor, Mana Shield)
 * - Use AoE spells (Fireball) when multiple enemies present
 * - Use single-target spells (Lightning, Fire Bolt, Magic Missile)
 * - Prioritize higher damage skills when available
 */

import { NPC } from '../../../std/npc.js';

export class BattleMage extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'battle mage',
      shortDesc: 'a robed battle mage',
      longDesc: 'This mage wears robes adorned with arcane sigils that pulse with barely contained magical energy. Their eyes glow faintly with power, and sparks occasionally dance between their fingers.',
      gender: 'female',
      level: 12,
    });

    // Set large mana pool (mages are mana-dependent)
    this.maxMana = 300;
    this.mana = 300;

    // Configure ranged DPS behavior
    this.setBehavior({
      mode: 'defensive',
      role: 'dps_ranged',
      guild: 'mage',
      wimpyThreshold: 15, // Flee if very low
    });

    // Learn mage skills appropriate for level
    this.learnSkills([
      'mage:magic_missile',
      'mage:arcane_knowledge',
      'mage:fire_bolt',
      'mage:frost_armor',
      'mage:lightning',
      'mage:fireball',
    ], 12);

    // Add some flavor
    this.addChat('The arcane flows through all things...', 'say', 20);
    this.addChat('traces glowing runes in the air.', 'emote', 25);
    this.addChat('Knowledge is the greatest weapon.', 'say', 15);

    // Respond to interactions
    this.addResponse('hello', 'Greetings. Are you here to discuss the arcane arts?', 'say');
    this.addResponse('magic', 'Magic requires discipline and understanding. It is not a toy.', 'say');
    this.addResponse('teach', 'Seek the Mage Guild if you wish to learn.', 'say');
  }
}

export default BattleMage;
