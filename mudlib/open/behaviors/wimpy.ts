/**
 * Wimpy NPC - Generic NPC with wimpy behavior
 *
 * Fights cautiously and flees when health drops below threshold.
 * Useful for NPCs that shouldn't fight to the death.
 */

import { NPC } from '../../std/npc.js';

export class Wimpy extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'nervous fighter',
      shortDesc: 'a nervous fighter',
      longDesc: 'This combatant looks uncertain, their grip on their weapon unsteady. They keep glancing toward potential escape routes.',
      gender: 'neutral',
      level: 5,
    });

    this.setBehavior({
      mode: 'wimpy',
      role: 'generic',
      wimpyThreshold: 25,
    });

    // Enable wandering so they can flee
    this.enableWandering();
  }
}

export default Wimpy;
