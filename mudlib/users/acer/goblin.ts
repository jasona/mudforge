/**
 * Goblin - A low-level hostile NPC.
 *
 * A small, green-skinned creature with beady eyes and sharp teeth.
 * Common enemy for beginning adventurers.
 */

import { NPC } from '../../lib/std.js';

export class Goblin extends NPC {
  constructor() {
    super();

    this.setIds(['goblin', 'creature']);

    this.setNPC({
      name: 'goblin',
      shortDesc: 'a scrawny goblin',
      longDesc:
        'This small, green-skinned creature stands about three feet tall. ' +
        'Its beady yellow eyes dart around nervously, and its mouth is full ' +
        'of sharp, crooked teeth. It clutches a rusty dagger in one clawed hand.',
      gender: 'neutral',
      respawnTime: 120, // 2 minutes
      chatChance: 15,
      chats: [
        { message: 'snarls menacingly', type: 'emote' },
        { message: 'picks its nose', type: 'emote' },
        { message: 'Shinies! Give shinies!', type: 'say' },
        { message: 'scratches itself', type: 'emote' },
        { message: 'Me stab you!', type: 'say', chance: 50 },
      ],
      lootTable: [
        { itemPath: '/users/acer/rusty_dagger', chance: 25 },
        { itemPath: '/users/acer/goblin_ear', chance: 75 },
        { itemPath: '/users/acer/healing_potion', chance: 10 },
      ],
    });

    // Use auto-balance for level 2 normal NPC
    this.setLevel(2);

    // Override stats for goblin flavor (weak but quick)
    this.setBaseStat('strength', 8);
    this.setBaseStat('dexterity', 12);
    this.setBaseStat('constitution', 8);
    this.setBaseStat('intelligence', 6);
    this.setBaseStat('wisdom', 6);
    this.setBaseStat('charisma', 4);
    this.setBaseStat('luck', 8);

    // Set mana (goblins don't use magic)
    this.maxMana = 0;
    this.mana = 0;

    // Add responses to player speech
    this.addResponse('hello', 'Grrrr! No talk! Fight!', 'say');
    this.addResponse('gold', 'MY gold! You no take!', 'say');
    this.addResponse('friend', 'cackles wickedly', 'emote');
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
}

export default Goblin;
