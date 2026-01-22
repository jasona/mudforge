/**
 * Forest Wolf - A hostile predator found in the eastern forest.
 *
 * Wolves hunt in packs and drop wolf pelts when killed.
 * Required for the Wolf Pelts quest from the tanner.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class ForestWolf extends NPC {
  constructor() {
    super();

    this.setIds(['wolf', 'forest wolf', 'grey wolf', 'gray wolf', 'beast', 'predator']);

    this.setNPC({
      name: 'forest wolf',
      shortDesc: 'a grey forest wolf',
      longDesc: `This is a lean, powerful wolf with thick grey fur and piercing yellow eyes.
Its muscles ripple beneath its coat as it pads silently through the undergrowth.
Sharp teeth glint when it snarls, and its ears are constantly swiveling,
alert for both prey and danger. This is clearly a dangerous predator.`,
      gender: 'neutral',
      respawnTime: 180, // 3 minutes
      chatChance: 10,
      chats: [
        { message: 'growls menacingly', type: 'emote' },
        { message: 'sniffs the air', type: 'emote' },
        { message: 'paces back and forth restlessly', type: 'emote' },
        { message: 'lets out a low, threatening growl', type: 'emote' },
        { message: 'watches you with hungry eyes', type: 'emote' },
        { message: 'raises its hackles', type: 'emote' },
      ],
      lootTable: [
        { itemPath: '/items/quest/wolf_pelt', chance: 65 },
        { itemPath: '/items/quest/wolf_pelt', chance: 30 }, // Chance for second pelt
      ],
      wandering: true,
      wanderChance: 10,
      wanderAreaRestricted: true,
    });

    // Use auto-balance for level 5 normal NPC
    this.setLevel(5);

    // Override stats for wolf flavor (fast and tough)
    this.setBaseStat('strength', 12);
    this.setBaseStat('dexterity', 14);
    this.setBaseStat('constitution', 12);
    this.setBaseStat('intelligence', 4);
    this.setBaseStat('wisdom', 10);
    this.setBaseStat('charisma', 6);
    this.setBaseStat('luck', 8);

    // Wolves don't use mana
    this.maxMana = 0;
    this.mana = 0;

    // Wolves are aggressive to players
    this.setAggressive((target: Living) => {
      // Check if target is a player (has isConnected method)
      const player = target as Living & { isConnected?: () => boolean };
      return typeof player.isConnected === 'function';
    });
  }

  /**
   * Enable heartbeat when created in the world.
   */
  override async onCreate(): Promise<void> {
    await super.onCreate();

    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  /**
   * React when players enter the room.
   */
  override async onEnter(who: Living, from?: Room): Promise<void> {
    // Check if it's a player
    const player = who as Living & { isConnected?: () => boolean };
    if (typeof player.isConnected === 'function') {
      // 40% chance to growl at newcomers
      if (Math.random() < 0.4) {
        setTimeout(() => {
          this.emote('turns its attention toward the newcomer and growls.');
        }, 1500);
      }
    }
  }
}

export default ForestWolf;
