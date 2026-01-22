/**
 * Grond the Blacksmith - A merchant who sells weapons and armor.
 *
 * Example implementation of the Merchant class.
 */

import { Living, Room } from '../../../lib/std.js';
import { Merchant } from '../../../std/merchant.js';

export class Blacksmith extends Merchant {
  constructor() {
    super();

    // Configure the merchant
    this.setMerchant({
      name: 'Grond the Smith',
      shopName: "Grond's Forge",
      shopDescription: 'Quality weapons and armor, forged with skill.',
      buyRate: 0.6, // Pays 60% of item value
      sellRate: 1.0, // Sells at 100% of stock price
      acceptedTypes: ['weapon', 'armor'],
      shopGold: 5000,
      charismaEffect: 0.01, // 1% per charisma point above 10
    });

    // Set NPC properties
    this.shortDesc = 'Grond the Smith';
    this.longDesc = `Grond is a massive, barrel-chested man with arms like tree trunks,
built from years of working the forge. His bald head glistens with
sweat, and his thick beard is singed at the edges from errant
sparks. A heavy leather apron covers his chest, stained with soot
and burn marks.

Despite his intimidating appearance, his eyes are warm and friendly,
and he speaks with surprising gentleness. The weapons and armor
displayed around his shop are clearly works of craftsmanship.`;
    this.gender = 'male';

    // Use auto-balance for level 12 normal (strong civilian)
    this.setLevel(12);

    // Override health - he's strong but not a fighter
    this.maxHealth = 120;
    this.health = 120;

    this.addId('grond');
    this.addId('smith');
    this.addId('blacksmith');
    this.addId('merchant');
    this.addId('shopkeeper');

    // Stock the shop
    this.setupStock();
    this.setupChats();
    this.setupResponses();
  }

  private setupStock(): void {
    // Weapons (path, name, price, quantity, category)
    // Note: category should match detectItemCategory() output (singular: 'weapon', 'armor', etc.)
    this.addStock('/areas/valdoria/aldric/items/iron_sword', 'Iron Sword', 100, 5, 'weapon');
    this.addStock('/areas/valdoria/aldric/items/steel_sword', 'Steel Sword', 250, 3, 'weapon');
    this.addStock('/areas/valdoria/aldric/items/iron_dagger', 'Iron Dagger', 40, 8, 'weapon');
    this.addStock('/areas/valdoria/aldric/items/battle_axe', 'Battle Axe', 180, 2, 'weapon');

    // Armor
    this.addStock('/areas/valdoria/aldric/items/leather_armor', 'Leather Armor', 75, 5, 'armor');
    this.addStock('/areas/valdoria/aldric/items/chainmail', 'Chainmail Shirt', 200, 3, 'armor');
    this.addStock('/areas/valdoria/aldric/items/iron_helm', 'Iron Helm', 60, 6, 'armor');
    this.addStock('/areas/valdoria/aldric/items/iron_shield', 'Iron Shield', 90, 4, 'armor');

    // Supplies
    this.addStock('/users/acer/torch', 'Torch', 5, -1, 'misc');
  }

  private setupChats(): void {
    this.addChat('wipes sweat from his brow with a sooty rag.', 'emote');
    this.addChat('Nothing beats good steel and honest work!', 'say');
    this.addChat('hammers rhythmically on a glowing piece of metal.', 'emote');
    this.addChat("Feel free to browse my wares. Say 'shop' if you want to trade!", 'say');
    this.addChat('examines the edge of a newly forged blade.', 'emote');
    this.addChat('My grandfather taught me this craft. Three generations of smiths!', 'say');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) =>
        `Welcome to my forge, ${speaker.name || 'traveler'}! Looking for weapons or armor?`,
      'say'
    );

    this.addResponse(
      /shop|buy|sell|trade|wares|browse/i,
      "Interested in my wares? Just say 'shop' and I'll show you everything I have!",
      'say'
    );

    this.addResponse(
      /sword|blade/i,
      "Ah, swords! I've got iron and steel blades. The steel ones cost more but they're worth every coin.",
      'say'
    );

    this.addResponse(
      /armor|protection/i,
      "Need protection? I've got leather for the light-footed, chainmail for proper warriors, helms to protect your noggin, and shields for those who like to block.",
      'say'
    );

    this.addResponse(
      /axe|axes/i,
      "Battle axes are for those who want to make a statement! Two-handed beasts that can cleave through anything.",
      'say'
    );

    this.addResponse(
      /dagger|knife/i,
      "Daggers are perfect for backup weapons or for those who prefer speed. Light enough to dual-wield, too!",
      'say'
    );

    this.addResponse(
      /price|cost|gold|expensive|cheap/i,
      "My prices are fair - you're paying for quality! And if you've got a silver tongue, you might find the prices a bit friendlier.",
      'say'
    );

    this.addResponse(
      /thank|thanks/i,
      'nods with a warm smile. "Come back anytime!"',
      'emote'
    );

    this.addResponse(
      /forge|smith|craft/i,
      "Been smithing for thirty years now. Started as an apprentice right here in Aldric. This forge has seen better days, but she still burns hot!",
      'say'
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
        this.say('Welcome to my forge! Looking to buy or sell?');
      }, 1000);
    }
  }
}

export default Blacksmith;
