/**
 * General Ironheart
 *
 * Tutorial NPC — a battle-scarred veteran who guides new recruits through
 * basic training. Effectively unkillable (level 30, 9999 HP).
 * Responds to "skip" to let players bypass the tutorial.
 */

import { NPC, Living } from '../../lib/std.js';
import { getTutorialDaemon } from '../../daemons/tutorial.js';

export class GeneralIronheart extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'General Ironheart',
      shortDesc: 'General Ironheart',
      longDesc: `A towering figure in scarred plate armor, General Ironheart looks like
he was carved from the same stone as the mountains. A jagged scar
runs from his left temple to his jaw, and his steel-grey eyes hold
the weight of a hundred battles. Despite his fearsome appearance,
there is a gruff patience about him — the kind earned from training
countless green recruits.`,
      gender: 'male',
      respawnTime: 0,
    });

    this.setLevel(30, 'boss');
    this.health = 9999;
    this.maxHealth = 9999;
    this.maxMana = 0;
    this.mana = 0;

    // Skip tutorial response
    this.addResponse(
      /\bskip\b/i,
      (speaker: Living) => {
        try {
          getTutorialDaemon().skipTutorial(speaker);
        } catch (e) {
          console.error('[TUTORIAL] skip error:', e);
        }
        return 'Very well, recruit. Some learn by doing. Go with honor.';
      },
      'say'
    );
  }
}

export default GeneralIronheart;
