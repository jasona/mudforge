/**
 * Merchant Aldwin - The quest giver for Lost Supplies.
 *
 * A caravan merchant whose supplies were stolen by bandits.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class Merchant extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'Merchant Aldwin',
      shortDesc: 'Merchant Aldwin',
      longDesc: `Merchant Aldwin is a well-dressed man in his middle years, though his
fine traveling clothes are dusty and disheveled. His usually jovial
face is creased with worry, and he paces anxiously near his empty
cart. The cart's broken wheel tells the story of a recent misfortune.

He keeps glancing toward the south road, muttering about bandits
and lost profits. Several other merchants cast sympathetic looks
his way, but business is business.`,
      gender: 'male',
      maxHealth: 60,
      health: 60,
      chatChance: 10,
    });

    this.addId('merchant');
    this.addId('aldwin');
    this.addId('merchant aldwin');
    this.addId('man');
    this.addId('trader');

    // Quest giver configuration
    this.setQuestsOffered(['aldric:lost_supplies']);
    this.setQuestsTurnedIn(['aldric:lost_supplies']);

    this.setupChats();
    this.setupResponses();
  }

  private setupChats(): void {
    this.addChat('kicks at the broken wheel of his cart in frustration.', 'emote');
    this.addChat('Those cursed bandits! A season\'s worth of goods, gone!', 'say');
    this.addChat('paces back and forth, wringing his hands.', 'emote');
    this.addChat('The guild will have my head if I don\'t recover those supplies.', 'say');
    this.addChat('peers anxiously toward the south road.', 'emote');
    this.addChat('Three crates of valuable goods... just taken!', 'say');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) => `Oh, ${speaker.name || 'traveler'}... forgive me, I'm not in the best of spirits today.`,
      'say'
    );

    this.addResponse(
      /bandit|supplies|crate|stolen|help|problem/i,
      "Bandits attacked my caravan on the south road yesterday! They took three crates of valuable supplies meant for the shops here. If someone could recover them before they're sold on the black market, I'd pay handsomely!",
      'say'
    );

    this.addResponse(
      /cart|wheel|broken/i,
      "looks at his cart sadly. \"The bandits broke the wheel when they ambushed us. At least they didn't take the cart itself... small mercies.\"",
      'emote'
    );

    this.addResponse(
      /reward|pay|gold/i,
      "I'll pay fifty gold coins for the safe return of my supplies, plus the eternal gratitude of the Merchant's Guild. Those crates are worth far more than that!",
      'say'
    );

    this.addResponse(
      /thank|thanks/i,
      'nods gratefully.',
      'emote'
    );

    this.addResponse(
      /quest/i,
      "clasps his hands together pleadingly. \"Please, if you could recover my stolen supplies, type 'quest accept' and I'll make it worth your while!\"",
      'emote'
    );
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  override async onEnter(who: Living, from?: Room): Promise<void> {
    const random = Math.random() * 100;
    if (random < 30) {
      setTimeout(() => {
        this.say("Excuse me! You look capable - might I have a word about a pressing matter?");
      }, 1500);
    }
  }
}

export default Merchant;
