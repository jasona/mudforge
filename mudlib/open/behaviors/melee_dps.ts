/**
 * Melee DPS NPC - Thief with melee DPS behavior
 *
 * Uses stealth to set up backstabs, maintains poison blade buff,
 * and deals high burst damage from the shadows.
 */

import { NPC } from '../../std/npc.js';

export class MeleeDPS extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'shadow striker',
      shortDesc: 'a shadow striker',
      longDesc: 'Clad in dark leather, this figure seems to blend with the shadows. Twin blades glint at their sides, and their eyes constantly scan for weaknesses.',
      gender: 'neutral',
      level: 10,
    });

    this.maxMana = 120;
    this.mana = 120;

    this.setBehavior({
      mode: 'aggressive',
      role: 'dps_melee',
      guild: 'thief',
      wimpyThreshold: 10,
    });

    this.learnSkills([
      'thief:hide',
      'thief:nimble_fingers',
      'thief:sneak',
      'thief:backstab',
      'thief:poison_blade',
    ], 10);
  }
}

export default MeleeDPS;
