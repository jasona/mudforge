/**
 * Tanner Gorik - The quest giver for Wolf Pelts.
 *
 * A skilled leatherworker who needs wolf pelts for his craft.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class Tanner extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'Tanner Gorik',
      shortDesc: 'Tanner Gorik',
      longDesc: `Tanner Gorik is a weathered man with powerful forearms developed from
years of working leather. His apron is stained with the chemicals of
his trade, and his hands are permanently discolored from the tanning
process. Despite the rough appearance, his eyes are shrewd and his
movements precise.

He examines a piece of leather with practiced scrutiny, testing its
suppleness with calloused fingers. A look of dissatisfaction crosses
his face - clearly, he's running low on quality materials.`,
      gender: 'male',
      chatChance: 10,
    });

    // Use auto-balance for level 8 normal (tough civilian)
    this.setLevel(8);

    // Override health - he's a civilian, not a fighter
    this.maxHealth = 80;
    this.health = 80;

    this.addId('tanner');
    this.addId('gorik');
    this.addId('tanner gorik');
    this.addId('leatherworker');
    this.addId('man');

    // Quest giver configuration
    this.setQuestsOffered(['aldric:wolf_pelts']);
    this.setQuestsTurnedIn(['aldric:wolf_pelts']);

    this.setupChats();
    this.setupResponses();
  }

  private setupChats(): void {
    this.addChat('examines a piece of leather critically.', 'emote');
    this.addChat('Wolf pelts make the finest leather. Tough but supple.', 'say');
    this.addChat('dips his hands in a vat and wrings out a hide.', 'emote');
    this.addChat("I'm running low on good materials.", 'say');
    this.addChat('tests the edge of a fleshing knife with his thumb.', 'emote');
    this.addChat("The wolves in the eastern forest have the best pelts.", 'say');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) => `Greetings, ${speaker.name || 'traveler'}. Looking for leather goods, or perhaps something else?`,
      'say'
    );

    this.addResponse(
      /wolf|pelt|hunt|leather|material|supply/i,
      "Ah, you've noticed my predicament. I'm running dangerously low on wolf pelts - they make the finest leather, you see. The wolves in the forest east of town would provide excellent materials, but they hunt in packs and I'm no fighter.",
      'say'
    );

    this.addResponse(
      /buy|goods|belt|armor|boots/i,
      "gestures at his displayed wares. \"Fine leather goods, all hand-crafted. But I warn you - with supplies running low, prices may rise soon. Unless someone can help with that...\"",
      'emote'
    );

    this.addResponse(
      /forest|east|danger|pack/i,
      "nods grimly. \"The forest wolves are cunning beasts. They hunt in packs of eight or more. You'd need to be skilled with a blade to survive an encounter. But the pelts... ah, the pelts are worth the risk.\"",
      'emote'
    );

    this.addResponse(
      /reward|pay|gold/i,
      "Seventy-five gold for a proper batch of wolf pelts - at least five good ones. Plus I'd throw in a piece of fine leatherwork of your choosing. That's a fair deal for honest work.",
      'say'
    );

    this.addResponse(
      /thank|thanks/i,
      'nods and returns to his work.',
      'emote'
    );

    this.addResponse(
      /quest/i,
      "rubs his chin thoughtfully. \"If you're willing to hunt some wolves and bring me their pelts, type 'quest accept'. I'll make it worth your while.\"",
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
    if (random < 35) {
      setTimeout(() => {
        const name = who.name || 'traveler';
        this.say(`Welcome to my tannery, ${name}. Looking for quality leather goods?`);
      }, 1000);
    }
  }
}

export default Tanner;
