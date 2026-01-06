/**
 * Goblin - A low-level hostile NPC.
 *
 * A small, green-skinned creature with beady eyes and sharp teeth.
 * Common enemy for beginning adventurers.
 */

import { NPC } from '../../std/npc.js';

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
      level: 2,
      maxHealth: 25,
      health: 25,
      respawnTime: 120, // 2 minutes
      chatChance: 15,
      chats: [
        { message: 'snarls menacingly', type: 'emote' },
        { message: 'picks its nose', type: 'emote' },
        { message: 'Shinies! Give shinies!', type: 'say' },
        { message: 'scratches itself', type: 'emote' },
        { message: 'Me stab you!', type: 'say', chance: 50 },
      ],
      // Combat configuration
      baseXP: 15,
      gold: 0, // Will use goldDrop range instead
      goldDrop: { min: 2, max: 8 },
      lootTable: [
        { itemPath: '/users/acer/rusty_dagger', chance: 25 },
        { itemPath: '/users/acer/goblin_ear', chance: 75 },
        { itemPath: '/users/acer/healing_potion', chance: 10 },
      ],
    });

    // Set base stats (goblins are weak but quick)
    this.setBaseStats({
      strength: 8,
      dexterity: 12,
      constitution: 8,
      intelligence: 6,
      wisdom: 6,
      charisma: 4,
      luck: 8,
    });

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
