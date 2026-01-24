/**
 * Wild Boar - A tough forest creature.
 *
 * Aggressive if provoked. Tougher than rabbits and deer.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class WildBoar extends NPC {
  constructor() {
    super();

    this.setIds(['boar', 'wild boar', 'pig', 'swine', 'beast']);

    this.setNPC({
      name: 'wild boar',
      shortDesc: 'a bristly wild boar',
      longDesc: `A stocky wild boar with coarse, bristly brown-grey fur and small,
mean eyes. Its curved tusks look sharp and dangerous, and it snorts
aggressively as it roots through the underbrush. These creatures
are known for their bad temper and surprising ferocity when cornered.`,
      gender: 'neutral',
      respawnTime: 150,
      chatChance: 12,
      chats: [
        { message: 'snorts loudly', type: 'emote' },
        { message: 'roots around in the dirt', type: 'emote' },
        { message: 'paws at the ground aggressively', type: 'emote' },
        { message: 'grunts and snuffles', type: 'emote' },
        { message: 'shakes its bristly hide', type: 'emote' },
      ],
      lootTable: [],
      naturalAttacks: ['gore', 'slam'],
      wandering: true,
      wanderChance: 12,
      wanderAreaRestricted: true,
    });

    // Use auto-balance for level 4 normal NPC
    this.setLevel(4);

    // Override stats for boar flavor (strong, tough, slow)
    this.setBaseStat('strength', 14);
    this.setBaseStat('dexterity', 8);
    this.setBaseStat('constitution', 14);
    this.setBaseStat('intelligence', 3);
    this.setBaseStat('wisdom', 6);
    this.setBaseStat('charisma', 4);
    this.setBaseStat('luck', 8);

    this.maxMana = 0;
    this.mana = 0;

    // Boars are aggressive
    this.setAggressive((target: Living) => {
      const player = target as Living & { isConnected?: () => boolean };
      return typeof player.isConnected === 'function';
    });
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
      if (Math.random() < 0.5) {
        setTimeout(() => {
          this.emote('snorts aggressively and lowers its head.');
        }, 1200);
      }
    }
  }
}

export default WildBoar;
