/**
 * Forest Deer - A graceful woodland creature.
 *
 * Provides atmosphere. Non-aggressive but will flee if attacked.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class ForestDeer extends NPC {
  constructor() {
    super();

    this.setIds(['deer', 'doe', 'stag', 'creature']);

    this.setNPC({
      name: 'deer',
      shortDesc: 'a graceful deer',
      longDesc: `A beautiful deer with a sleek brown coat and large, gentle eyes.
It moves with quiet grace through the forest, pausing occasionally
to nibble on leaves or listen for danger. Its ears swivel constantly,
alert to every sound.`,
      gender: 'neutral',
      level: 2,
      maxHealth: 20,
      health: 20,
      respawnTime: 90,
      chatChance: 15,
      chats: [
        { message: 'flicks its tail', type: 'emote' },
        { message: 'nibbles on some leaves', type: 'emote' },
        { message: 'looks around cautiously', type: 'emote' },
        { message: 'stamps a hoof softly', type: 'emote' },
        { message: 'raises its head, sniffing the air', type: 'emote' },
      ],
      baseXP: 8,
      gold: 0,
      goldDrop: { min: 0, max: 0 },
      lootTable: [],
    });

    this.setBaseStats({
      strength: 6,
      dexterity: 14,
      constitution: 8,
      intelligence: 3,
      wisdom: 10,
      charisma: 12,
      luck: 10,
    });

    this.maxMana = 0;
    this.mana = 0;
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  override async onEnter(who: Living, from?: Room): Promise<void> {
    const player = who as Living & { isConnected?: () => boolean };
    if (typeof player.isConnected === 'function') {
      if (Math.random() < 0.4) {
        setTimeout(() => {
          this.emote('raises its head and watches warily.');
        }, 1000);
      }
    }
  }
}

export default ForestDeer;
