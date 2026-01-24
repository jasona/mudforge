/**
 * Marta the Food Vendor - A merchant who sells food and crafting materials.
 *
 * Sells consumable food items for healing and materials for crafting campfires.
 */

import { Living, Room } from '../../../lib/std.js';
import { Merchant } from '../../../std/merchant.js';

export class FoodVendor extends Merchant {
  constructor() {
    super();

    // Configure the merchant
    this.setMerchant({
      name: 'Marta',
      shopName: "Marta's Provisions",
      shopDescription: 'Fresh food, travel supplies, and camping materials.',
      buyRate: 0.4, // Pays 40% of item value
      sellRate: 1.0, // Sells at 100% of stock price
      acceptedTypes: ['food', 'misc'],
      shopGold: 500,
      charismaEffect: 0.01,
    });

    // Set NPC properties
    this.shortDesc = 'Marta the Food Vendor';
    this.longDesc = `Marta is a cheerful, round-faced woman with rosy cheeks and flour-dusted
hands. She wears a practical apron over a simple brown dress, and her
graying hair is tucked under a kerchief. Her stall is lined with baskets
of fresh bread, wrapped meats, and bundles of supplies for travelers.

A pile of firewood and pouches of tinder sit in one corner - she clearly
caters to adventurers who camp on the road.`;
    this.gender = 'female';

    // Use auto-balance for level 5 normal (civilian vendor)
    this.setLevel(5);

    // Override health - she's a civilian
    this.maxHealth = 60;
    this.health = 60;

    this.addId('marta');
    this.addId('food vendor');
    this.addId('vendor');
    this.addId('food merchant');
    this.addId('provisions');
    this.addId('shopkeeper');

    // Stock the shop
    this.setupStock();
    this.setupChats();
    this.setupResponses();
  }

  private setupStock(): void {
    // Food items (path, name, price, quantity, category)
    this.addStock('/std/consumables/bread', 'Loaf of Bread', 3, -1, 'food');
    this.addStock('/std/consumables/cooked_meat', 'Cooked Meat', 10, -1, 'food');
    this.addStock('/std/consumables/hearty_stew', 'Hearty Stew', 25, 10, 'food');
    this.addStock('/std/consumables/travel_rations', 'Travel Rations', 5, -1, 'food');
    this.addStock('/std/consumables/apple', 'Apple', 1, -1, 'food');

    // Crafting materials
    this.addStock('/std/materials/firewood', 'Firewood Bundle', 2, -1, 'misc');
    this.addStock('/std/materials/tinder', 'Tinder Pouch', 1, -1, 'misc');
  }

  private setupChats(): void {
    this.addChat('arranges some apples in a wicker basket.', 'emote');
    this.addChat('Fresh provisions for your journey!', 'say');
    this.addChat('wipes her hands on her apron.', 'emote');
    this.addChat('Best stew in Aldric, I promise you that!', 'say');
    this.addChat('wraps some bread in clean cloth.', 'emote');
    this.addChat("Got everything an adventurer needs - food, firewood, tinder!", 'say');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) =>
        `Welcome, ${speaker.name || 'traveler'}! Looking for provisions?`,
      'say'
    );

    this.addResponse(
      /shop|buy|sell|trade|wares|browse/i,
      "I've got food to fill your belly and supplies for camping. Just say 'shop' to see what I have!",
      'say'
    );

    this.addResponse(
      /bread|loaf/i,
      "Fresh bread, baked this morning! Nothing fancy, but it'll keep you going.",
      'say'
    );

    this.addResponse(
      /meat|cooked/i,
      "The cooked meat is from the butcher next door - I season it with my special herbs!",
      'say'
    );

    this.addResponse(
      /stew/i,
      "My hearty stew is legendary! Chunks of meat, fresh vegetables, and a secret blend of spices. It'll warm you right up and keep healing you for a while!",
      'say'
    );

    this.addResponse(
      /rations|travel/i,
      "Travel rations - dried meat, hard cheese, and biscuits. Keeps well on the road!",
      'say'
    );

    this.addResponse(
      /firewood|wood|fire/i,
      "Planning to make camp? You'll need three bundles of firewood and some tinder to start a campfire.",
      'say'
    );

    this.addResponse(
      /tinder|spark/i,
      "Tinder's essential for starting fires. Dry moss, wood shavings, and such. One pouch is all you need.",
      'say'
    );

    this.addResponse(
      /campfire|camp|craft/i,
      "To make a campfire, you'll need three firewood bundles and one tinder pouch. Use 'craft campfire' when you have the materials!",
      'say'
    );

    this.addResponse(
      /heal|health|recover/i,
      "Food's good for healing! Bread for a quick bite, meat for something heartier, or stew if you want the best - it'll keep healing you over time!",
      'say'
    );

    this.addResponse(
      /thank|thanks/i,
      'smiles warmly. "Safe travels, dear!"',
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
        this.say('Welcome! Looking for food or supplies?');
      }, 1000);
    }
  }
}

export default FoodVendor;
