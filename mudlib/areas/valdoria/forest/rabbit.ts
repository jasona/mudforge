/**
 * Forest Rabbit - A harmless woodland creature.
 *
 * Provides atmosphere and is non-aggressive.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class ForestRabbit extends NPC {
  constructor() {
    super();

    this.setIds(['rabbit', 'bunny', 'hare', 'creature']);

    this.setNPC({
      name: 'rabbit',
      shortDesc: 'a brown forest rabbit',
      longDesc: `A small brown rabbit with long ears and a fluffy white tail.
Its nose twitches constantly as it nibbles on grass and keeps
a wary eye out for predators.`,
      gender: 'neutral',
      respawnTime: 60,
      chatChance: 20,
      chats: [
        { message: 'twitches its nose', type: 'emote' },
        { message: 'nibbles on some grass', type: 'emote' },
        { message: 'perks up its ears, listening', type: 'emote' },
        { message: 'hops around in a small circle', type: 'emote' },
        { message: 'grooms its fur with its paws', type: 'emote' },
      ],
      lootTable: [],
      wandering: true,
      wanderChance: 20,
      wanderAreaRestricted: true,
    });

    // Use auto-balance for level 1 normal NPC
    this.setLevel(1);

    // Override stats for rabbit flavor (very fast, fragile)
    this.setBaseStat('strength', 2);
    this.setBaseStat('dexterity', 16);
    this.setBaseStat('constitution', 4);
    this.setBaseStat('intelligence', 2);
    this.setBaseStat('wisdom', 8);
    this.setBaseStat('charisma', 10);
    this.setBaseStat('luck', 12);

    // Override: rabbits are fragile
    this.maxHealth = 8;
    this.health = 8;

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
      if (Math.random() < 0.3) {
        setTimeout(() => {
          this.emote('freezes, ears alert, watching the newcomer.');
        }, 800);
      }
    }
  }
}

export default ForestRabbit;
