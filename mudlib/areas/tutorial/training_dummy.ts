/**
 * Training Dummy
 *
 * Tutorial NPC — a straw-and-wood practice target. Level 1, 30 HP,
 * weak natural attack. Quick respawn (15s). Notifies TutorialDaemon
 * on death so the tutorial can advance.
 */

import { NPC, Living } from '../../lib/std.js';
import { getTutorialDaemon } from '../../daemons/tutorial.js';

export class TrainingDummy extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'training dummy',
      shortDesc: 'a straw training dummy',
      longDesc: `A crude wooden frame stuffed with straw, shaped vaguely like a man.
It wears a battered wooden shield and has a bucket for a head. Red
paint on its chest marks the target zone. Despite its shabby appearance,
it serves its purpose — giving recruits something to hit that won't
hit back very hard.`,
      gender: 'neutral',
      respawnTime: 15,
      naturalAttacks: ['bludgeon'],
    });

    this.addId('dummy');
    this.addId('training dummy');
    this.addId('target');

    this.level = 1;
    this.health = 30;
    this.maxHealth = 30;
    this.maxMana = 0;
    this.mana = 0;
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  override async onDeath(): Promise<void> {
    // Notify attackers' tutorial daemon before standard death handling
    const attackers = [...this.attackers];
    for (const attacker of attackers) {
      try {
        getTutorialDaemon().notify(attacker, 'killed_dummy');
      } catch (e) {
        console.error('[TUTORIAL] training_dummy onDeath error:', e);
      }
    }

    await super.onDeath();
  }
}

export default TrainingDummy;
