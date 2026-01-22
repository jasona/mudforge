/**
 * Pet Keeper - The proprietor of Whiskers & Hooves Pet Emporium.
 */

import { PetMerchant } from '../../../std/pet-merchant.js';
import { getPetDaemon } from '../../../daemons/pet.js';

/**
 * Mira the Pet Keeper.
 */
export class PetKeeper extends PetMerchant {
  constructor() {
    super();

    // Configure the merchant
    this.setPetMerchant({
      name: 'Mira',
      shopName: "Whiskers & Hooves Pet Emporium",
      shopDescription: 'Quality companions for adventurers of all kinds!',
      shortDesc: 'Mira the pet keeper',
      longDesc: `Mira is a cheerful woman in her middle years with laugh lines around her
bright green eyes. She wears a practical apron covered in animal hair and
the occasional muddy paw print. A small bird perches on her shoulder,
occasionally chirping in her ear as if sharing secrets.

Her gentle manner with the animals is evident - even the most skittish
creatures seem to calm in her presence. She clearly loves her work.`,
    });

    // Add IDs for the NPC
    this.addId('mira');
    this.addId('keeper');
    this.addId('shopkeeper');
    this.addId('pet keeper');

    // Add chat lines for ambiance
    this.addChat('pets a nearby puppy, causing it to wag its tail furiously.', 'emote');
    this.addChat('fills water dishes for the animals.', 'emote');
    this.addChat('hums a cheerful tune while brushing one of the horses.', 'emote');
    this.addChat("Every animal here has been raised with love. They'll be loyal companions!", 'say');
    this.addChat('adjusts some hay bales in the stable area.', 'emote');

    // Add responses to keywords
    this.addResponse(
      /list|pets?|companions?|animals?|what do you (have|sell)/i,
      "I have wonderful companions for sale! Let me show you what's available.",
      'say',
      (speaker) => {
        // Show the pet list after the response
        setTimeout(() => this.showPetList(speaker), 100);
      }
    );

    this.addResponse(
      /dog|puppy|puppies/i,
      "Dogs are wonderful companions! Loyal, brave, and always happy to see you. They can carry a few small items too.",
      'say'
    );

    this.addResponse(
      /horse|horses/i,
      "Horses are swift and noble! Perfect for carrying supplies on long journeys. Nothing beats the bond between rider and horse.",
      'say'
    );

    this.addResponse(
      /mule|mules/i,
      "Ah, mules! Don't let their stubborn reputation fool you. They're incredibly strong and can carry enormous loads. Perfect for the serious adventurer!",
      'say'
    );

    this.addResponse(
      /floating|chest|magical/i,
      "The floating chest is quite special! Enchanted by the wizards of the Azure Tower themselves. It can carry more than you'd believe possible!",
      'say'
    );

    this.addResponse(
      /price|cost|how much|gold/i,
      "Say 'list' and I'll show you all my companions with their prices!",
      'say'
    );

    this.addResponse(
      /care|feed|training/i,
      "All my companions come fully trained and ready for adventure! They know how to follow their owner and stay out of trouble. Just treat them kindly and they'll be loyal for life.",
      'say'
    );

    // Setup pet stock from the pet daemon templates
    this.setupPetStock();
  }

  /**
   * Setup the pet stock from daemon templates.
   */
  private setupPetStock(): void {
    // We'll use the templates from the pet daemon
    const petDaemon = getPetDaemon();
    const templates = petDaemon.getAllTemplates();

    for (const template of templates) {
      // Add with custom descriptions for the shop
      let description = template.longDesc;

      // Add some shop-specific flavor text
      switch (template.type) {
        case 'dog':
          description = "A loyal companion that will follow you everywhere. Dogs are brave, " +
            "alert, and always happy to see their owner. Can carry small items in a little pack.";
          break;
        case 'mule':
          description = "The ultimate pack animal! Mules are incredibly strong and patient, " +
            "able to carry heavy loads across any terrain. Perfect for serious adventurers.";
          break;
        case 'horse':
          description = "A noble steed and trusted companion. Horses are swift and graceful, " +
            "with saddlebags for carrying your gear. A bond with a horse lasts a lifetime.";
          break;
        case 'floating_chest':
          description = "A marvel of magical engineering! This enchanted chest floats " +
            "behind its owner and can hold an enormous amount of treasure and supplies.";
          break;
      }

      this.addPetStock(template.type, template, template.cost, description);
    }
  }
}

export default PetKeeper;
