/**
 * Elite Guard - Example Fighter NPC with tank behavior
 *
 * This NPC demonstrates the tank combat role.
 * It will:
 * - Taunt enemies attacking allies to protect them
 * - Maintain Defensive Stance for threat generation
 * - Use Shield Wall when taking heavy damage
 * - Use cleave against multiple enemies
 * - Use power attacks and bash on single targets
 */

import { NPC } from '../../../std/npc.js';

export class EliteGuard extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'elite guard',
      shortDesc: 'an armored elite guard',
      longDesc: 'Clad in gleaming plate armor, this elite guard stands at attention with military precision. A heavy shield is strapped to their arm and a well-maintained longsword rests at their hip.',
      gender: 'male',
      level: 15,
    });

    // Set mana pool (fighters use less mana)
    this.maxMana = 100;
    this.mana = 100;

    // Configure tank behavior
    this.setBehavior({
      mode: 'aggressive',
      role: 'tank',
      guild: 'fighter',
      willTaunt: true,  // Actively taunt enemies off allies
      wimpyThreshold: 0, // Never flee
    });

    // Learn fighter skills appropriate for level
    this.learnSkills([
      'fighter:bash',
      'fighter:toughness',
      'fighter:parry',
      'fighter:defensive_stance',
      'fighter:power_attack',
      'fighter:taunt',
      'fighter:shield_wall',
      'fighter:cleave',
    ], 15);

    // Add some flavor
    this.addChat('Stay alert.', 'say', 20);
    this.addChat('scans the area for threats.', 'emote', 30);
    this.addChat('None shall pass without permission.', 'say', 15);

    // Respond to interactions
    this.addResponse('hello', 'State your business.', 'say');
    this.addResponse('attack', 'You would challenge me? So be it!', 'say');
    this.addResponse('help', 'I am sworn to protect this area. Move along.', 'say');
  }
}

export default EliteGuard;
