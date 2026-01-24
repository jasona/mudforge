/**
 * Thaddeus the Alchemist - A merchant who sells potions.
 *
 * Sells healing and mana potions of various strengths.
 */

import { Living, Room } from '../../../lib/std.js';
import { Merchant } from '../../../std/merchant.js';

export class Alchemist extends Merchant {
  constructor() {
    super();

    // Configure the merchant
    this.setMerchant({
      name: 'Thaddeus',
      shopName: "Thaddeus's Apothecary",
      shopDescription: 'Potions, elixirs, and alchemical remedies.',
      buyRate: 0.5, // Pays 50% of item value
      sellRate: 1.2, // Sells at 120% (20% markup for specialized goods)
      acceptedTypes: ['potion', 'misc'],
      shopGold: 2000,
      charismaEffect: 0.02, // 2% per charisma point (potions are negotiable)
    });

    // Set NPC properties
    this.shortDesc = 'Thaddeus the Alchemist';
    this.longDesc = `Thaddeus is a thin, elderly man with wild gray hair that seems to have
a life of its own. His spectacles perch precariously on a hawkish nose,
and his long fingers are stained with various chemicals. He wears a
threadbare robe covered in burn marks and mysterious stains.

Behind him, shelves groan under the weight of countless bottles, vials,
and jars filled with liquids of every color imaginable. Some bubble
quietly, others glow faintly, and a few seem to move of their own accord.`;
    this.gender = 'male';

    // Use auto-balance for level 8 normal (learned civilian)
    this.setLevel(8);

    // Override health - he's old and frail
    this.maxHealth = 40;
    this.health = 40;

    // Higher wisdom for an alchemist
    this.setBaseStat('wisdom', 16);
    this.setBaseStat('intelligence', 18);

    this.addId('thaddeus');
    this.addId('alchemist');
    this.addId('apothecary');
    this.addId('potion seller');
    this.addId('old man');
    this.addId('shopkeeper');

    // Stock the shop
    this.setupStock();
    this.setupChats();
    this.setupResponses();
  }

  private setupStock(): void {
    // Create blueprint paths for each potion strength
    // Note: These use a special format that the driver will instantiate
    // For now, we'll use the base class and rely on construction

    // Healing Potions (path, name, price, quantity, category)
    this.addStock('/std/consumables/healing_potion', 'Minor Healing Potion', 25, -1, 'potion');

    // We need to create specific item files for different potion strengths
    // For now, let's reference them with a note about needing wrapper items
    this.addStock('/areas/valdoria/aldric/items/lesser_healing_potion', 'Lesser Healing Potion', 50, 10, 'potion');
    this.addStock('/areas/valdoria/aldric/items/standard_healing_potion', 'Healing Potion', 100, 8, 'potion');
    this.addStock('/areas/valdoria/aldric/items/greater_healing_potion', 'Greater Healing Potion', 200, 5, 'potion');
    this.addStock('/areas/valdoria/aldric/items/major_healing_potion', 'Major Healing Potion', 400, 2, 'potion');

    // Mana Potions
    this.addStock('/std/consumables/mana_potion', 'Minor Mana Potion', 25, -1, 'potion');
    this.addStock('/areas/valdoria/aldric/items/lesser_mana_potion', 'Lesser Mana Potion', 50, 10, 'potion');
    this.addStock('/areas/valdoria/aldric/items/standard_mana_potion', 'Mana Potion', 100, 8, 'potion');
  }

  private setupChats(): void {
    this.addChat('peers at a bubbling flask through his spectacles.', 'emote');
    this.addChat('Potions, elixirs, remedies for what ails you!', 'say');
    this.addChat('carefully measures out a powder into a vial.', 'emote');
    this.addChat('Ah, the wonders of alchemy... transforming base matter into miracles!', 'say');
    this.addChat('mutters arcane formulas under his breath.', 'emote');
    this.addChat('A healing potion a day keeps the resurrection priests away!', 'say');
    this.addChat('adjusts his spectacles and squints at a label.', 'emote');
  }

  private setupResponses(): void {
    this.addResponse(
      /hello|hi|greetings|hey/i,
      (speaker) =>
        `Ah, ${speaker.name || 'young one'}! Welcome to my humble apothecary. In need of potions?`,
      'say'
    );

    this.addResponse(
      /shop|buy|sell|trade|wares|browse/i,
      "Interested in my wares? Just say 'shop' and I'll show you my stock of potions!",
      'say'
    );

    this.addResponse(
      /heal|health|healing|red/i,
      "Healing potions! The lifeblood of any adventurer. I have them in various strengths - minor for small wounds, greater for near-death experiences!",
      'say'
    );

    this.addResponse(
      /mana|mp|magic|blue/i,
      "Mana potions restore your magical energies. Essential for spellcasters! The stronger the potion, the more mana it restores.",
      'say'
    );

    this.addResponse(
      /minor/i,
      "Minor potions are affordable and reliable. Perfect for everyday adventuring!",
      'say'
    );

    this.addResponse(
      /lesser/i,
      "Lesser potions offer more restoration at a reasonable price. Good for moderate encounters.",
      'say'
    );

    this.addResponse(
      /greater|major/i,
      "The greater and major potions are my finest work! Reserve them for emergencies - they're costly but can save your life!",
      'say'
    );

    this.addResponse(
      /price|cost|expensive|gold/i,
      "My prices reflect the quality of ingredients and the skill required. A master alchemist doesn't come cheap! But... if you have a silver tongue, we might negotiate.",
      'say'
    );

    this.addResponse(
      /alchemy|craft|make/i,
      "Ah, interested in the alchemical arts? It takes years of study to master the balance of ingredients. These potions are the result of decades of research!",
      'say'
    );

    this.addResponse(
      /thank|thanks/i,
      'bows slightly. "May your health never fail you!"',
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
        this.say("Ah, a customer! Come in, come in. Don't mind the smell.");
      }, 1000);
    }
  }
}

export default Alchemist;
