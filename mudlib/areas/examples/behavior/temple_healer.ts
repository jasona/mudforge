/**
 * Temple Healer - Example Cleric NPC with healer behavior
 *
 * This NPC demonstrates the healer combat role.
 * It will:
 * - Prioritize healing itself when critically low
 * - Heal party members who are injured
 * - Keep bless buffs active on allies
 * - Use offensive skills when healing isn't needed
 */

import { NPC } from '../../../std/npc.js';

export class TempleHealer extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'temple healer',
      shortDesc: 'a kind temple healer',
      longDesc: 'A serene figure in white robes, the temple healer radiates a calming presence. Their eyes are gentle but alert, ready to tend to any who need aid.',
      gender: 'neutral',
      level: 10,
    });

    // Set mana pool
    this.maxMana = 200;
    this.mana = 200;

    // Configure healer behavior
    this.setBehavior({
      mode: 'defensive',
      role: 'healer',
      guild: 'cleric',
      healSelfThreshold: 60,      // Start self-healing at 60% HP
      healAllyThreshold: 50,      // Heal allies at 50% HP
      criticalAllyThreshold: 30,  // Prioritize critical allies below 30%
      willHealAllies: true,
      willBuffAllies: true,
    });

    // Learn cleric skills appropriate for level
    this.learnSkills([
      'cleric:heal',
      'cleric:divine_grace',
      'cleric:bless',
      'cleric:cure_poison',
      'cleric:turn_undead',
      'cleric:group_heal',
    ], 10);

    // Add some flavor
    this.addChat('May the light guide your path.', 'say', 30);
    this.addChat('murmurs a quiet prayer.', 'emote', 20);
    this.addChat('I sense troubled souls nearby...', 'say', 10);

    // Respond to greetings
    this.addResponse('hello', 'Blessings upon you, traveler. How may I help?', 'say');
    this.addResponse('heal', 'I shall tend to your wounds. Come closer.', 'say');
    this.addResponse('help', 'The temple offers healing and sanctuary to all who seek it.', 'say');
  }
}

export default TempleHealer;
