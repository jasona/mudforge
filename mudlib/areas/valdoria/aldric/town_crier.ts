/**
 * Town Crier - An NPC who announces news in the town square.
 *
 * The town crier stands near the fountain, ringing his bell and
 * announcing the day's news to anyone who will listen.
 */

import { NPC, MudObject } from '../../../lib/std.js';

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
      maxHealth: 50,
      health: 50,
      chatChance: 15, // 15% chance per heartbeat to announce something
    });

    this.addId('crier');
    this.addId('town crier');
    this.addId('man');

    // Quest giver configuration
    this.setQuestsOffered(['aldric:urgent_message', 'aldric:meet_guildmasters']);
    this.setQuestsTurnedIn(['aldric:urgent_message', 'aldric:meet_guildmasters']);

    this.setupAnnouncements();
    this.setupResponses();
  }

  /**
   * Set up the crier's periodic announcements.
   */
  private setupAnnouncements(): void {
    // Bell ring before announcements
    this.addChat('rings his brass bell loudly.', 'emote', 100);

    // Various announcements
    this.addChat('Hear ye, hear ye! The castle seeks brave adventurers!', 'say');
    this.addChat('Fresh bread at the bakery! Get it while it\'s warm!', 'say');
    this.addChat('The tavern offers half-price ale this evening!', 'say');
    this.addChat('Beware the roads south - bandits have been spotted!', 'say');
    this.addChat('The blacksmith has new weapons in stock!', 'say');
    this.addChat('All citizens are reminded to pay their taxes promptly!', 'say');
    this.addChat('The harvest festival approaches! Prepare your offerings!', 'say');
    this.addChat('Lost: One gray cat. Answers to "Whiskers". Reward offered.', 'say');
    this.addChat('The castle guards are recruiting new members!', 'say');
    this.addChat('Market day is tomorrow! Merchants welcome!', 'say');
    this.addChat('glances at his parchment and clears his throat.', 'emote');
    this.addChat('straightens his blue coat importantly.', 'emote');
  }

  /**
   * Set up responses to players.
   */
  private setupResponses(): void {
    // Respond to greetings
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) => `Good day to you, ${speaker.name || 'traveler'}! Fine weather for news!`,
      'say'
    );

    // Respond to questions about news
    this.addResponse(
      /news|what.*happening|tell me/i,
      'Ah, you seek the latest news? The castle has posted new bounties, and there are rumors of treasure in the old ruins to the south!',
      'say'
    );

    // Respond to questions about the town
    this.addResponse(
      /town|where|directions/i,
      'This is the heart of our fair town! The castle lies north, the tavern east, merchants to the west, and the gates south. What destination do you seek?',
      'say'
    );

    // Respond to thanks
    this.addResponse(
      /thank|thanks/i,
      'tips his hat politely.',
      'emote'
    );

    // Respond to questions about himself
    this.addResponse(
      /who are you|your name|yourself/i,
      'I am the town crier! It is my duty to keep the good citizens informed of all important happenings!',
      'say'
    );

    // Respond to questions about the bell
    this.addResponse(
      /bell/i,
      (speaker) => {
        this.emote('proudly shows off his polished brass bell.');
        return 'This bell has served three generations of criers before me. Its ring can be heard across the entire square!';
      },
      'say'
    );
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
  override async onEnter(who: MudObject, from?: MudObject): Promise<void> {
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
