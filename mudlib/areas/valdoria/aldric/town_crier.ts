/**
 * Town Crier - An AI-enabled NPC who announces news in the town square.
 *
 * The town crier stands near the fountain, ringing his bell and
 * announcing the day's news to anyone who will listen. He is AI-enabled
 * and can engage in dynamic conversations with players about local news,
 * rumors, and happenings in the kingdom.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

/**
 * The Town Crier NPC.
 */
export class TownCrier extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'town crier',
      shortDesc: 'the town crier',
      longDesc: `The town crier is a stout man in a faded blue coat with brass buttons.
His voice is surprisingly powerful for his size, honed by years of
bellowing announcements across the busy square. A polished brass bell
hangs at his belt, which he rings before each proclamation. His face
is weathered but friendly, with keen eyes that miss little of the
comings and goings in the square. He carries a rolled parchment
tucked under one arm - no doubt containing the latest decrees and
news from the castle.`,
      gender: 'male',
      chatChance: 15, // 15% chance per heartbeat to announce something
      lookSound: 'npcs/town-crier.mp3',
    });

    // Use auto-balance for level 3 normal (civilian)
    this.setLevel(3);

    // Override health - he's a civilian, not a fighter
    this.maxHealth = 50;
    this.health = 50;

    this.addId('crier');
    this.addId('town crier');
    this.addId('man');

    // Quest giver configuration
    this.setQuestsOffered(['aldric:urgent_message', 'aldric:meet_guildmasters']);
    this.setQuestsTurnedIn(['aldric:urgent_message', 'aldric:meet_guildmasters']);

    this.setupAIContext();
  }

  /**
   * Configure AI-powered dialogue for dynamic conversations.
   */
  private setupAIContext(): void {
    this.setAIContext({
      name: 'Bartleby the Town Crier',
      personality: `Bartleby is a jovial, garrulous man who takes immense pride in his role as
the official voice of the town. He loves gossip and news of all kinds, and has an
encyclopedic knowledge of local happenings. He speaks in a booming, theatrical voice
even in casual conversation - a habit from years of proclamations. He's friendly and
helpful, always eager to share what he knows, though he sometimes embellishes stories
for dramatic effect.`,
      background: `Bartleby has served as town crier of Aldric for twenty years, inheriting the
position from his father. His brass bell is a family heirloom passed down through three
generations of criers. He knows everyone in town and is privy to most of the official
news from the castle, as well as unofficial rumors from the tavern. He's a patriotic
citizen who genuinely cares about the wellbeing of Valdoria and its people.`,
      knowledgeScope: {
        topics: [
          'local news and announcements',
          'town layout and directions',
          'merchants and shops in town',
          'the castle and King Aldric III',
          'local gossip and rumors',
          'tavern happenings',
          'market days and festivals',
          'weather and farming conditions',
          'nearby dangers like bandits',
          'adventuring opportunities',
          'his bell and the crier tradition',
        ],
        forbidden: [
          'castle secrets or confidential royal matters',
          'thieves guild activities or criminal networks',
          'magic theory or spellcasting',
          'detailed military strategy',
          'things happening in distant lands he\'s never been to',
        ],
        localKnowledge: [
          'The castle lies north of the square, the tavern is east, merchants are west, and the gates are south',
          'King Aldric III rules from Sunspire Castle with his council of nobles',
          'Valdoria has been at peace for thirty years since the Orc Wars ended',
          'The harvest festival approaches in the coming weeks',
          'Bandits have been spotted on the roads south of town',
          'The blacksmith has the finest weapons in the region',
          'The tavern offers half-price ale on certain evenings',
          'Market day brings merchants from across the kingdom',
          'There are rumors of treasure in the old ruins to the south',
          'The castle guards are always recruiting brave souls',
        ],
        worldLore: [
          'region:valdoria',
          'economics:trade-routes',
          'faith:sun-god',
        ],
      },
      speakingStyle: {
        formality: 'casual',
        verbosity: 'verbose',
        accent: 'Speaks in a booming, theatrical manner. Often starts sentences with "Hear ye!" or "Mark my words!" Uses dramatic pauses and flourishes.',
      },
    });
  }




  /**
   * Called when the NPC is created.
   */
  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Enable heartbeat for periodic chat
    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  /**
   * Called when someone enters the room.
   */
  override async onEnter(who: Living, from?: Room): Promise<void> {
    // Occasionally greet newcomers
    const random = Math.random() * 100;
    if (random < 30) {
      // 30% chance to greet
      setTimeout(() => {
        const name = who.name || 'traveler';
        this.say(`Welcome to the town square, ${name}!`);
      }, 1000); // Small delay for natural feel
    }
  }
}

export default TownCrier;
