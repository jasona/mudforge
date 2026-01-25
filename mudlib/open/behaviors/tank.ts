/**
 * Tank NPC - Fighter with tank behavior
 *
 * Protects allies by taunting enemies, maintains defensive stance,
 * and uses shield wall when taking heavy damage.
 */

import { NPC } from '../../std/npc.js';

export class Tank extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'armored sentinel',
      shortDesc: 'an armored sentinel',
      longDesc: 'A heavily armored warrior stands ready, shield raised and sword drawn. Their stance speaks of years of training in the art of defense.',
      gender: 'neutral',
      level: 10,
    });

    this.maxMana = 100;
    this.mana = 100;

    this.setBehavior({
      mode: 'aggressive',
      role: 'tank',
      guild: 'fighter',
      willTaunt: true,
    });

    this.learnSkills([
      'fighter:bash',
      'fighter:toughness',
      'fighter:parry',
      'fighter:defensive_stance',
      'fighter:taunt',
      'fighter:shield_wall',
    ], 10);
  }
}

export default Tank;
