/**
 * Newbie Armourer - Gives free starter equipment to new adventurers.
 *
 * Old Gareth provides a full set of basic training equipment to any
 * player level 5 or below, once per character.
 */

import { NPC, Living, Room, MudObject } from '../../../lib/std.js';

// Maximum level to receive free equipment
const MAX_LEVEL_FOR_FREE_GEAR = 5;

// Property key to track if player has received gear
const RECEIVED_GEAR_PROP = 'newbie_armourer_received';

// Item paths for the starter gear
const STARTER_GEAR = [
  '/areas/valdoria/aldric/items/newbie_sword',
  '/areas/valdoria/aldric/items/newbie_armor',
  '/areas/valdoria/aldric/items/newbie_helm',
  '/areas/valdoria/aldric/items/newbie_shield',
];

interface PlayerLike extends Living {
  level: number;
  getProperty<T>(key: string): T | undefined;
  setProperty(key: string, value: unknown): void;
}

function isPlayer(obj: MudObject): obj is PlayerLike {
  return 'level' in obj && 'getProperty' in obj && 'setProperty' in obj;
}

export class NewbieArmourer extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'Old Gareth',
      shortDesc: 'Old Gareth the armourer',
      longDesc: `Old Gareth is a grizzled veteran with a kind face weathered by decades
of sun and forge-fire. His arms are thick and muscular despite his
age, a testament to years of smithing. A leather apron covers his
simple clothes, and his hands are calloused but gentle.

He watches over the training hall's equipment with a practiced eye,
always ready to help new adventurers get started on their journey.
A hand-painted sign near him reads: "FREE GEAR FOR NEW ADVENTURERS!"`,
      gender: 'male',
      chatChance: 8,
    });

    // Use auto-balance for level 10 normal (veteran civilian)
    this.setLevel(10);

    // Override health - he's a tough veteran but not a fighter
    this.maxHealth = 100;
    this.health = 100;

    this.addId('gareth');
    this.addId('old gareth');
    this.addId('armourer');
    this.addId('armorer');
    this.addId('smith');
    this.addId('veteran');
    this.addId('man');

    this.setupChats();
    this.setupResponses();
  }

  private setupChats(): void {
    this.addChat('polishes a training sword with a worn cloth.', 'emote');
    this.addChat('New adventurer? Come talk to me for some free gear!', 'say');
    this.addChat('inspects a shield for cracks.', 'emote');
    this.addChat("Everyone's gotta start somewhere. I'm here to help.", 'say');
    this.addChat('adjusts his leather apron.', 'emote');
    this.addChat("Don't be shy, young ones. A good warrior needs proper equipment!", 'say');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) => {
        if (!isPlayer(speaker)) {
          return `Ah, greetings there!`;
        }
        if (speaker.level <= MAX_LEVEL_FOR_FREE_GEAR) {
          return `Welcome, ${speaker.name}! You look like you could use some equipment. Just say 'gear' and I'll set you up with everything you need to get started!`;
        }
        return `Hello there, ${speaker.name}! Good to see an experienced adventurer. Keep up the good work!`;
      },
      'say'
    );

    this.addResponse(
      /gear|equip|equipment|armor|armour|weapon|free|help|start/i,
      (speaker) => {
        this.giveStarterGear(speaker);
      },
      'say'
    );

    this.addResponse(
      /thank|thanks/i,
      "You're welcome! Now get out there and make us proud!",
      'say'
    );

    this.addResponse(
      /train|training|practice/i,
      'Master Vorn handles the training around here. I just make sure everyone has the gear they need to get started.',
      'say'
    );

    this.addResponse(
      /quest/i,
      "I don't have any quests for you, but Baker Hilda in the bakery might need some help. And there's always trouble to be found outside the town gates!",
      'say'
    );
  }

  /**
   * Give starter gear to a player if eligible.
   */
  private async giveStarterGear(speaker: Living): Promise<void> {
    if (!isPlayer(speaker)) {
      this.say("Sorry, I can only help adventurers.");
      return;
    }

    const player = speaker as PlayerLike;

    // Check if already received gear
    if (player.getProperty<boolean>(RECEIVED_GEAR_PROP)) {
      this.say(`I've already given you a set of gear, ${player.name}. I can't give you another - these supplies are meant for all the new adventurers!`);
      return;
    }

    // Check level
    if (player.level > MAX_LEVEL_FOR_FREE_GEAR) {
      this.say(`You're level ${player.level} now, ${player.name} - too experienced for my beginner's gear! You should visit the blacksmith in the forge for proper equipment.`);
      return;
    }

    // Give the gear
    this.emote(`nods approvingly at ${player.name} and turns to gather some equipment.`);

    if (typeof efuns === 'undefined' || !efuns.cloneObject) {
      this.say("Hmm, something's wrong with my supplies. Come back later.");
      return;
    }

    const givenItems: string[] = [];

    for (const itemPath of STARTER_GEAR) {
      try {
        const item = await efuns.cloneObject(itemPath);
        if (item) {
          await item.moveTo(player);
          givenItems.push(item.shortDesc);
        }
      } catch (error) {
        console.error(`[NewbieArmourer] Failed to clone ${itemPath}:`, error);
      }
    }

    if (givenItems.length === 0) {
      this.say("I seem to be out of supplies. Check back later!");
      return;
    }

    // Mark player as having received gear
    player.setProperty(RECEIVED_GEAR_PROP, true);

    // Announce what was given
    this.say(`There you go, ${player.name}! I've given you:`);

    // Small delay for dramatic effect
    setTimeout(() => {
      for (const desc of givenItems) {
        const room = this.environment;
        if (room && 'broadcast' in room) {
          (room as MudObject & { broadcast: (msg: string) => void }).broadcast(
            `  {cyan}${desc}{/}\n`
          );
        }
      }
    }, 500);

    setTimeout(() => {
      this.say("It's not much, but it'll keep you alive while you're learning. Use 'wield sword' and 'wear armor' to equip your new gear!");
    }, 1000);

    setTimeout(() => {
      this.say("And remember - this gear won't last forever. Save up some gold and visit the blacksmith when you can afford an upgrade!");
    }, 2500);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    if (typeof efuns !== 'undefined' && efuns.setHeartbeat) {
      efuns.setHeartbeat(this, true);
    }
  }

  override async onEnter(who: Living, from?: Room): Promise<void> {
    // Only greet players
    if (!isPlayer(who)) return;

    const player = who as PlayerLike;

    // Add a small delay before greeting
    setTimeout(() => {
      // Check if player is eligible for gear
      const alreadyReceived = player.getProperty<boolean>(RECEIVED_GEAR_PROP);

      if (player.level <= MAX_LEVEL_FOR_FREE_GEAR && !alreadyReceived) {
        this.say(`Ah, a new face! Welcome to the training hall, ${player.name}! If you need some starting equipment, just say 'gear' and I'll fix you right up!`);
      } else if (Math.random() < 0.3) {
        this.emote(`nods at ${player.name}.`);
      }
    }, 800);
  }
}

export default NewbieArmourer;
