/**
 * PetMerchant - A specialized merchant for selling pets.
 *
 * Unlike regular merchants, pet merchants create pets via the pet daemon
 * rather than cloning items. They respond to commands like "list" and "buy <pet>".
 */

import { NPC } from './npc.js';
import { Living } from './living.js';
import { MudObject } from './object.js';
import type { PetTemplate } from './pet.js';

/**
 * Player interface for type checking.
 */
interface PetBuyer extends Living {
  gold: number;
  removeGold(amount: number): boolean;
  receive(message: string): void;
  name: string;
}

/**
 * Pet stock entry with price override.
 */
interface PetStockEntry {
  template: PetTemplate;
  price: number;
  description: string;
}

/**
 * Base class for pet merchant NPCs.
 */
export class PetMerchant extends NPC {
  private _shopName: string = 'Pet Shop';
  private _shopDescription: string = 'A shop that sells loyal companions.';
  private _petStock: Map<string, PetStockEntry> = new Map();

  constructor() {
    super();
    this.shortDesc = 'a pet merchant';
    this.longDesc = 'A friendly merchant who sells loyal animal companions.';
  }

  /**
   * Configure the pet merchant.
   */
  setPetMerchant(config: {
    name: string;
    shopName: string;
    shopDescription?: string;
    shortDesc?: string;
    longDesc?: string;
  }): void {
    this.name = config.name;
    this._shopName = config.shopName;
    if (config.shopDescription) {
      this._shopDescription = config.shopDescription;
    }
    if (config.shortDesc) {
      this.shortDesc = config.shortDesc;
    }
    if (config.longDesc) {
      this.longDesc = config.longDesc;
    }
  }

  /**
   * Get the shop name.
   */
  get shopName(): string {
    return this._shopName;
  }

  /**
   * Add a pet to the shop's stock.
   */
  addPetStock(
    type: string,
    template: PetTemplate,
    priceOverride?: number,
    description?: string
  ): void {
    this._petStock.set(type.toLowerCase(), {
      template,
      price: priceOverride ?? template.cost,
      description: description ?? template.longDesc,
    });
  }

  /**
   * Get all pet stock.
   */
  getPetStock(): Map<string, PetStockEntry> {
    return this._petStock;
  }

  /**
   * Show available pets to a player.
   */
  showPetList(player: MudObject): void {
    const buyer = player as PetBuyer;

    buyer.receive(`\n{bold}${this._shopName}{/}\n`);
    buyer.receive(`${this._shopDescription}\n\n`);
    buyer.receive('{cyan}Available Companions:{/}\n');
    buyer.receive('{dim}' + '-'.repeat(60) + '{/}\n');

    for (const [type, entry] of this._petStock) {
      const template = entry.template;
      const sizeLabel = template.size.charAt(0).toUpperCase() + template.size.slice(1);
      // Format name nicely (replace underscores, capitalize words)
      const displayName = template.type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      buyer.receive(`\n{yellow}${displayName}{/} - {bold}${entry.price} gold{/}\n`);
      buyer.receive(`  ${entry.description}\n`);
      buyer.receive(`  {dim}Size: ${sizeLabel} | Carry: ${template.maxItems} items, ${template.maxWeight} lbs | Health: ${template.health}{/}\n`);
    }

    buyer.receive('\n{dim}' + '-'.repeat(60) + '{/}\n');
    buyer.receive(`{green}To purchase, say "buy <pet type>" (e.g., "buy dog"){/}\n`);
    buyer.receive(`Your gold: {yellow}${buyer.gold}{/}\n\n`);
  }

  /**
   * Attempt to sell a pet to a player.
   */
  async sellPet(player: MudObject, petType: string): Promise<boolean> {
    const buyer = player as PetBuyer;
    const type = petType.toLowerCase().replace(/_/g, ' ').trim();

    // Find the pet in stock (try with and without underscores)
    let entry = this._petStock.get(type);
    if (!entry) {
      entry = this._petStock.get(type.replace(/ /g, '_'));
    }
    if (!entry) {
      // Try partial match
      for (const [stockType, stockEntry] of this._petStock) {
        if (stockType.includes(type) || type.includes(stockType)) {
          entry = stockEntry;
          break;
        }
      }
    }

    if (!entry) {
      this.say(`I'm sorry, I don't have any "${petType}" for sale. Say "list" to see what's available.`);
      return false;
    }

    // Check if player has enough gold
    if (buyer.gold < entry.price) {
      const displayName = entry.template.type.replace(/_/g, ' ');
      this.say(`I'm sorry, but a ${displayName} costs ${entry.price} gold. You only have ${buyer.gold} gold.`);
      return false;
    }

    // Create the pet via the pet daemon
    try {
      const { getPetDaemon } = await import('../daemons/pet.js');
      const petDaemon = getPetDaemon();

      // Check if player already has pets (optional limit)
      const existingPets = petDaemon.getPlayerPets(buyer.name);
      const sentAwayPets = petDaemon.getSentAwayPets(buyer.name);
      const totalPets = existingPets.length + sentAwayPets.length;

      if (totalPets >= 5) {
        this.say("You already have quite a few companions! Perhaps you should care for the ones you have first.");
        return false;
      }

      // Create the pet
      const pet = await petDaemon.createPet(player, entry.template.type);

      if (!pet) {
        this.say("I'm sorry, something went wrong. Please try again.");
        return false;
      }

      // Deduct gold
      buyer.removeGold(entry.price);

      // Success messages - format name nicely
      const displayName = entry.template.type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      this.say(`Excellent choice! Here's your new ${displayName.toLowerCase()}. Take good care of them!`);
      buyer.receive(`\n{green}You purchased a ${displayName} for ${entry.price} gold!{/}\n`);
      buyer.receive(`{dim}Use "pet" to manage your new companion, or "pet name <name>" to give them a name.{/}\n\n`);

      // Notify room
      const room = player.environment;
      if (room && 'broadcast' in room) {
        (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void }).broadcast(
          `${buyer.name} purchases a ${displayName.toLowerCase()} from ${this.name}.`,
          { exclude: [player, this] }
        );
      }

      return true;
    } catch (error) {
      console.error('[PetMerchant] Error selling pet:', error);
      this.say("I'm sorry, something went wrong. Please try again later.");
      return false;
    }
  }

  /**
   * Override hearSay to respond to buy/list commands.
   */
  override hearSay(speaker: Living, message: string): void {
    const lowerMsg = message.toLowerCase().trim();

    // Check for list command
    if (lowerMsg === 'list' || lowerMsg === 'pets' || lowerMsg === 'show pets' || lowerMsg === 'what do you have') {
      this.showPetList(speaker as MudObject);
      return;
    }

    // Check for buy command
    const buyMatch = lowerMsg.match(/^buy\s+(.+)$/);
    if (buyMatch) {
      void this.sellPet(speaker as MudObject, buyMatch[1]);
      return;
    }

    // Check for shop-related keywords
    if (
      lowerMsg.includes('pet') ||
      lowerMsg.includes('buy') ||
      lowerMsg.includes('sell') ||
      lowerMsg.includes('companion') ||
      lowerMsg.includes('animal')
    ) {
      this.say(`Looking for a loyal companion? Say "list" to see my available pets, or "buy <pet type>" to purchase one!`);
      return;
    }

    // Let parent handle other responses
    super.hearSay(speaker, message);
  }

  /**
   * Called when someone enters the room.
   */
  override onEnter(who: Living): void {
    // Only greet players
    if ('gold' in who) {
      setTimeout(() => {
        this.say(`Welcome to ${this._shopName}! Say "list" to see my companions for sale.`);
      }, 500);
    }
  }
}

export default PetMerchant;
