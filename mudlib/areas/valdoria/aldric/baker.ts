/**
 * Baker Hilda - The quest giver for The Rat Problem.
 *
 * A friendly baker troubled by rats in her cellar.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class Baker extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'Baker Hilda',
      shortDesc: 'Baker Hilda',
      longDesc: `Baker Hilda is a stout woman in her middle years, with kind eyes and
strong, capable hands. Her apron is dusted with flour, and a few
wisps of gray hair escape from under her cap. Despite her normally
cheerful demeanor, she looks worried - glancing nervously at the
trapdoor leading to the cellar.

She hums as she works, kneading dough with practiced ease, but you
can tell something weighs on her mind.`,
      gender: 'female',
      maxHealth: 50,
      health: 50,
      chatChance: 10,
    });

    this.addId('baker');
    this.addId('hilda');
    this.addId('baker hilda');
    this.addId('woman');

    // Quest giver configuration
    this.setQuestsOffered(['aldric:rat_problem']);
    this.setQuestsTurnedIn(['aldric:rat_problem']);

    this.setupChats();
    this.setupResponses();
  }

  private setupChats(): void {
    this.addChat('sighs and glances nervously at the cellar door.', 'emote');
    this.addChat('Fresh bread, still warm from the oven!', 'say');
    this.addChat('wipes flour from her hands on her apron.', 'emote');
    this.addChat("Those awful rats... I can hear them scratching down there.", 'say');
    this.addChat('kneads a ball of dough with practiced hands.', 'emote');
    this.addChat("I haven't been able to go down to the cellar in days.", 'say');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) => `Welcome to my bakery, ${speaker.name || 'traveler'}! Can I interest you in some fresh bread?`,
      'say'
    );

    this.addResponse(
      /rat|rats|cellar|problem|help/i,
      "Oh, those dreadful rats! They've completely taken over my cellar! I can't get to my flour stores, and they're ruining everything. If only someone brave enough would go down there and deal with them...",
      'say'
    );

    this.addResponse(
      /bread|buy|pastry|pie|cake/i,
      "We have fresh bread, pastries, meat pies, and cakes - all made this morning! Just say 'buy' and what you'd like.",
      'say'
    );

    this.addResponse(
      /thank|thanks/i,
      'smiles warmly.',
      'emote'
    );

    this.addResponse(
      /quest/i,
      "wrings her hands anxiously. \"Please, if you could help with the rats in my cellar, I'd be ever so grateful! Type 'quest accept' to help me.\"",
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
    if (random < 40) {
      setTimeout(() => {
        const name = who.name || 'traveler';
        this.say(`Welcome, ${name}! Would you like some fresh bread?`);
      }, 1000);
    }
  }
}

export default Baker;
