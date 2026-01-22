/**
 * Guard Captain Marcus - The quest giver for Map the Depths.
 *
 * A veteran soldier responsible for castle security.
 */

import { NPC, Living, Room } from '../../../lib/std.js';

export class GuardCaptain extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'Captain Marcus',
      shortDesc: 'Captain Marcus, commander of the castle guard',
      longDesc: `Captain Marcus is a tall, imposing figure in polished plate armor
bearing the lord's heraldry. His graying hair is cropped short in
military fashion, and a long scar runs down the left side of his
face - a memento from the border wars. Despite his stern demeanor,
his eyes hold the wisdom of a career soldier who has seen much.

He stands near the dungeon entrance, occasionally glancing down at
the iron grate with a troubled expression. A rolled map protrudes
from his belt pouch.`,
      gender: 'male',
      chatChance: 8,
    });

    this.addId('captain');
    this.addId('marcus');
    this.addId('captain marcus');
    this.addId('guard captain');
    this.addId('commander');
    this.addId('soldier');

    // Quest giver configuration
    this.setQuestsOffered(['aldric:map_the_depths']);
    this.setQuestsTurnedIn(['aldric:map_the_depths']);

    // Use auto-balance for level 20 normal (veteran soldier)
    this.setLevel(20);

    // Override stats - he's a tough veteran
    this.setBaseStat('strength', 16);
    this.setBaseStat('dexterity', 14);
    this.setBaseStat('constitution', 16);
    this.setBaseStat('intelligence', 12);
    this.setBaseStat('wisdom', 14);
    this.setBaseStat('charisma', 14);
    this.setBaseStat('luck', 10);

    this.setupChats();
    this.setupResponses();
  }

  private setupChats(): void {
    this.addChat('peers down at the dungeon grate with a frown.', 'emote');
    this.addChat("We've been hearing strange noises from below.", 'say');
    this.addChat('adjusts his sword belt.', 'emote');
    this.addChat("The old maps are worthless now. We need current intelligence.", 'say');
    this.addChat('nods curtly to a passing guard.', 'emote');
    this.addChat("Whatever's down there, it's been getting bolder.", 'say');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) => `Hail, ${speaker.name || 'citizen'}. State your business at the castle.`,
      'say'
    );

    this.addResponse(
      /depth|dungeon|below|underground|map|explore/i,
      "The underground passages beneath the castle are centuries old, and our maps are woefully out of date. Strange sounds echo up at night, and my scouts refuse to venture too deep. I need someone brave - or foolish - enough to explore and bring back current intelligence.",
      'say'
    );

    this.addResponse(
      /noise|sound|strange|creature/i,
      "scratches his scarred cheek thoughtfully. \"Scraping. Shuffling. Sometimes what sounds like chanting. My men are soldiers, not explorers - they know when they're out of their depth.\"",
      'emote'
    );

    this.addResponse(
      /reward|pay|gold/i,
      "One hundred gold pieces and the gratitude of Lord Aldric himself for a complete survey of the depths. That's no small sum, but what we're asking is no small task.",
      'say'
    );

    this.addResponse(
      /scar|face|wound/i,
      "touches his scar absently. \"A gift from an orc chieftain in the border wars. He didn't survive to give me another.\"",
      'emote'
    );

    this.addResponse(
      /thank|thanks/i,
      'nods with military precision.',
      'emote'
    );

    this.addResponse(
      /quest/i,
      "straightens to attention. \"If you're willing to explore the depths and report back, type 'quest accept'. The castle needs your service.\"",
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
    if (random < 25) {
      setTimeout(() => {
        this.say("Hold there. You have the look of an adventurer about you.");
      }, 1000);
    }
  }
}

export default GuardCaptain;
