/**
 * Shadow Assassin - Example Thief NPC with melee DPS behavior
 *
 * This NPC demonstrates the dps_melee combat role.
 * It will:
 * - Hide to enter stealth
 * - Use Backstab/Assassinate from stealth for bonus damage
 * - Maintain Poison Blade buff
 * - Use regular backstab when not stealthed
 */

import { NPC } from '../../../std/npc.js';

export class ShadowAssassin extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'shadow assassin',
      shortDesc: 'a shadowy assassin',
      longDesc: 'Dressed in dark leather that seems to absorb light, this figure moves with predatory grace. Twin daggers hang at their belt, and their eyes constantly scan for threats - or opportunities.',
      gender: 'neutral',
      level: 14,
    });

    // Set moderate mana pool
    this.maxMana = 150;
    this.mana = 150;

    // Configure melee DPS behavior
    this.setBehavior({
      mode: 'aggressive',
      role: 'dps_melee',
      guild: 'thief',
      wimpyThreshold: 10, // Fight to the near-death
    });

    // Learn thief skills appropriate for level
    this.learnSkills([
      'thief:hide',
      'thief:nimble_fingers',
      'thief:sneak',
      'thief:backstab',
      'thief:lockpick',
      'thief:poison_blade',
    ], 14);

    // Add some flavor - assassins are quiet
    this.addChat('watches silently from the shadows.', 'emote', 40);
    this.addChat('A job is a job.', 'say', 10);
    this.addChat('adjusts their daggers.', 'emote', 20);

    // Respond to interactions
    this.addResponse('hello', 'narrows their eyes suspiciously.', 'emote');
    this.addResponse('hire', 'That depends on the target... and the price.', 'say');
    this.addResponse('thief', 'I prefer "acquisitions specialist."', 'say');
  }
}

export default ShadowAssassin;
