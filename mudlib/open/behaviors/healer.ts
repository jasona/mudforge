/**
 * Healer NPC - Cleric with healer behavior
 *
 * Prioritizes keeping allies alive, heals critical targets first,
 * maintains bless buffs, and uses offensive holy magic when able.
 */

import { NPC } from '../../std/npc.js';

export class Healer extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'divine healer',
      shortDesc: 'a divine healer',
      longDesc: 'Robed in white vestments marked with holy symbols, this healer radiates an aura of calm. Their hands glow faintly with healing energy.',
      gender: 'neutral',
      level: 10,
    });

    this.maxMana = 200;
    this.mana = 200;

    this.setBehavior({
      mode: 'defensive',
      role: 'healer',
      guild: 'cleric',
      healSelfThreshold: 60,
      healAllyThreshold: 50,
      criticalAllyThreshold: 30,
      willHealAllies: true,
      willBuffAllies: true,
    });

    this.learnSkills([
      'cleric:heal',
      'cleric:divine_grace',
      'cleric:bless',
      'cleric:cure_poison',
      'cleric:turn_undead',
      'cleric:group_heal',
    ], 10);
  }
}

export default Healer;
