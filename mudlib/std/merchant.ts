/**
 * Merchant - Base class for shop NPCs.
 *
 * Merchants are NPCs that can buy and sell items to players through
 * a GUI-based shop interface. They support:
 * - Configurable buy/sell rates
 * - Item type filtering
 * - Charisma-based price modifiers
 * - Merged transaction flow (buy + sell in one transaction)
 *
 * Usage:
 *   class Blacksmith extends Merchant {
 *     constructor() {
 *       super();
 *       this.setMerchant({
 *         name: 'Grond the Smith',
 *         shopName: "Grond's Forge",
 *         buyRate: 0.6,
 *         sellRate: 1.2,
 *         acceptedTypes: ['weapon', 'armor'],
 *         shopGold: 5000
 *       });
 *       this.addStock('/items/iron_sword', 100, 5, 'weapons');
 *     }
 *   }
 */

import { NPC } from './npc.js';
import { Living } from './living.js';
import { Item } from './item.js';
import type {
  ShopItem,
  SoldItem,
  MerchantConfig,
  TransactionState,
  TransactionResult,
  LedgerSummary,
  BuyEntry,
  SellEntry,
  ItemCategory,
} from '../lib/shop-types.js';
import { detectItemCategory } from '../lib/shop-types.js';

/**
 * Player interface for type checking.
 */
interface ShopPlayer extends Living {
  gold: number;
  addGold(amount: number): void;
  removeGold(amount: number): boolean;
  stats?: { charisma?: number };
  objectId: string;
  inventory: Item[];
}

/**
 * Base class for merchant NPCs.
 */
export class Merchant extends NPC {
  // Shop identity
  private _shopName: string = 'Shop';
  private _shopDescription: string = '';

  // Pricing
  private _buyRate: number = 0.5; // What merchant pays for items (50% of value)
  private _sellRate: number = 1.0; // What player pays (100% of stock price)
  private _charismaEffect: number = 0.01; // 1% per point above 10

  // Inventory and gold
  private _shopGold: number = 1000;
  private _acceptedTypes: ItemCategory[] = [];
  private _shopInventory: ShopItem[] = [];
  private _soldItems: Map<string, { item: Item; soldItem: SoldItem }> = new Map();

  // Transaction state per player
  private _activeSessions: Map<string, TransactionState> = new Map();

  // Restock settings
  private _restockEnabled: boolean = false;
  private _restockInterval: number = 3600; // seconds
  private _lastRestock: number = 0;

  constructor() {
    super();
    this.shortDesc = 'a merchant';
    this.longDesc = 'A merchant who buys and sells goods.';
  }

  // ========== Shop Configuration ==========

  /**
   * Configure the merchant with a config object.
   */
  setMerchant(config: MerchantConfig): void {
    this.name = config.name;
    this._shopName = config.shopName;
    if (config.shopDescription) {
      this._shopDescription = config.shopDescription;
    }
    this._buyRate = config.buyRate;
    this._sellRate = config.sellRate;
    if (config.acceptedTypes) {
      this._acceptedTypes = config.acceptedTypes as ItemCategory[];
    }
    this._shopGold = config.shopGold;
    if (config.restockEnabled !== undefined) {
      this._restockEnabled = config.restockEnabled;
    }
    if (config.charismaEffect !== undefined) {
      this._charismaEffect = config.charismaEffect;
    }
  }

  /**
   * Get the shop name.
   */
  get shopName(): string {
    return this._shopName;
  }

  /**
   * Get the shop description.
   */
  get shopDescription(): string {
    return this._shopDescription;
  }

  /**
   * Get the merchant's available gold.
   */
  get shopGold(): number {
    return this._shopGold;
  }

  /**
   * Set the merchant's gold.
   */
  set shopGold(value: number) {
    this._shopGold = Math.max(0, value);
  }

  // ========== Stock Management ==========

  /**
   * Add an item to the shop's stock.
   * @param itemPath Blueprint path for the item
   * @param name Display name for the item
   * @param price The selling price
   * @param quantity Stock quantity (-1 = unlimited)
   * @param category Optional category for filtering
   */
  addStock(
    itemPath: string,
    name: string,
    price: number,
    quantity: number = -1,
    category?: string
  ): void {
    // Check if already in stock
    const existing = this._shopInventory.find((i) => i.itemPath === itemPath);
    if (existing) {
      existing.name = name;
      existing.buyPrice = price;
      existing.stock = quantity;
      existing.maxStock = quantity;
      if (category) existing.category = category;
      return;
    }

    this._shopInventory.push({
      itemPath,
      name,
      buyPrice: price,
      stock: quantity,
      maxStock: quantity,
      category,
    });
  }

  /**
   * Remove an item from the shop's stock.
   */
  removeStock(itemPath: string): void {
    this._shopInventory = this._shopInventory.filter((i) => i.itemPath !== itemPath);
  }

  /**
   * Get all stocked items (blueprint-based).
   */
  getStock(): ShopItem[] {
    return [...this._shopInventory];
  }

  /**
   * Get all sold items (actual item instances from players).
   */
  getSoldItems(): SoldItem[] {
    return Array.from(this._soldItems.values()).map((v) => v.soldItem);
  }

  /**
   * Get the actual Item object for a sold item.
   */
  getSoldItemObject(objectId: string): Item | undefined {
    return this._soldItems.get(objectId)?.item;
  }

  /**
   * Get stocked items by category.
   */
  getStockByCategory(category: string): ShopItem[] {
    return this._shopInventory.filter((i) => i.category === category);
  }

  /**
   * Get all unique categories (from both stock and sold items).
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const item of this._shopInventory) {
      if (item.category) {
        categories.add(item.category);
      }
    }
    for (const { soldItem } of this._soldItems.values()) {
      if (soldItem.category) {
        categories.add(soldItem.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * Check if an item is in stock (blueprint or sold item).
   */
  isInStock(itemPathOrObjectId: string): boolean {
    // Check blueprint stock
    const item = this._shopInventory.find((i) => i.itemPath === itemPathOrObjectId);
    if (item) {
      return item.stock === -1 || item.stock > 0;
    }
    // Check sold items by objectId
    return this._soldItems.has(itemPathOrObjectId);
  }

  /**
   * Reduce stock for an item.
   */
  private reduceStock(itemPath: string): boolean {
    const item = this._shopInventory.find((i) => i.itemPath === itemPath);
    if (!item) return false;
    if (item.stock === -1) return true; // Unlimited
    if (item.stock <= 0) return false;
    item.stock--;
    return true;
  }

  // ========== Price Calculations ==========

  /**
   * Calculate the charisma modifier for a player.
   * Higher charisma = better deals (positive modifier).
   */
  getCharismaModifier(player: ShopPlayer): number {
    const charisma = player.stats?.charisma ?? 10;
    // Positive modifier = better deal for player
    return (charisma - 10) * this._charismaEffect;
  }

  /**
   * Get the price a player must pay to buy an item.
   * Higher charisma = lower price.
   */
  getSellPrice(itemPath: string, player: ShopPlayer): number {
    const stockItem = this._shopInventory.find((i) => i.itemPath === itemPath);
    if (!stockItem) return 0;

    const basePrice = stockItem.buyPrice * this._sellRate;
    const modifier = this.getCharismaModifier(player);
    // High charisma = pay less (subtract modifier percentage)
    return Math.max(1, Math.floor(basePrice * (1 - modifier)));
  }

  /**
   * Get the base sell price (without charisma modifier).
   */
  getBaseSellPrice(itemPath: string): number {
    const stockItem = this._shopInventory.find((i) => i.itemPath === itemPath);
    if (!stockItem) return 0;
    return Math.floor(stockItem.buyPrice * this._sellRate);
  }

  /**
   * Get the price the merchant will pay for an item.
   * Higher charisma = higher payment.
   */
  getBuyPrice(item: Item, player: ShopPlayer): number {
    const basePrice = Math.floor((item.value ?? 0) * this._buyRate);
    const modifier = this.getCharismaModifier(player);
    // High charisma = receive more (add modifier percentage)
    return Math.max(1, Math.floor(basePrice * (1 + modifier)));
  }

  /**
   * Get the base buy price (without charisma modifier).
   */
  getBaseBuyPrice(item: Item): number {
    return Math.max(1, Math.floor((item.value ?? 0) * this._buyRate));
  }

  /**
   * Check if the merchant will accept an item type.
   */
  acceptsItem(item: Item): boolean {
    // Accept all if no types specified
    if (this._acceptedTypes.length === 0) return true;

    const category = detectItemCategory(item);
    return this._acceptedTypes.includes(category) || this._acceptedTypes.includes('all');
  }

  // ========== Transaction State Management ==========

  /**
   * Get or create transaction state for a player.
   */
  getTransactionState(player: ShopPlayer): TransactionState {
    let state = this._activeSessions.get(player.objectId);
    if (!state) {
      state = {
        itemsToBuy: [],
        itemsToSell: [],
      };
      this._activeSessions.set(player.objectId, state);
    }
    return state;
  }

  /**
   * Add a stock item to the buy cart (blueprint-based).
   */
  addToBuyCart(player: ShopPlayer, itemPath: string): boolean {
    const state = this.getTransactionState(player);
    const stockItem = this._shopInventory.find((i) => i.itemPath === itemPath);
    if (!stockItem) return false;

    // Check stock
    if (!this.isInStock(itemPath)) return false;

    // Get item info
    const price = this.getSellPrice(itemPath, player);

    state.itemsToBuy.push({
      itemPath,
      name: stockItem.name,
      price,
      isSoldItem: false,
    });

    return true;
  }

  /**
   * Add a sold item to the buy cart (actual item instance).
   */
  addSoldItemToBuyCart(player: ShopPlayer, objectId: string): boolean {
    const state = this.getTransactionState(player);
    const soldEntry = this._soldItems.get(objectId);
    if (!soldEntry) return false;

    // Check not already in cart
    if (state.itemsToBuy.some((e) => e.objectId === objectId)) return false;

    state.itemsToBuy.push({
      itemPath: objectId, // Use objectId as itemPath for consistency
      objectId,
      name: soldEntry.soldItem.name,
      price: soldEntry.soldItem.sellPrice,
      isSoldItem: true,
    });

    return true;
  }

  /**
   * Add an item to the sell cart.
   */
  addToSellCart(player: ShopPlayer, itemId: string): boolean {
    const state = this.getTransactionState(player);

    // Find the item in player's inventory
    const item = player.inventory.find((i) => i.objectId === itemId);
    if (!item) return false;

    // Check if merchant accepts this item type
    if (!this.acceptsItem(item)) return false;

    // Check if already in cart
    if (state.itemsToSell.some((e) => e.itemId === itemId)) return false;

    // Check if item is equipped (wielded or worn)
    if (this.isItemEquipped(item)) return false;

    const price = this.getBuyPrice(item, player);

    state.itemsToSell.push({
      itemId,
      name: item.shortDesc || item.name || 'Unknown Item',
      price,
    });

    return true;
  }

  /**
   * Check if an item is currently equipped.
   */
  private isItemEquipped(item: Item): boolean {
    // Check for wielded weapon
    if ('isWielded' in item && (item as Item & { isWielded: boolean }).isWielded) {
      return true;
    }
    // Check for worn armor
    if ('isWorn' in item && (item as Item & { isWorn: boolean }).isWorn) {
      return true;
    }
    return false;
  }

  /**
   * Remove an item from the buy cart.
   * Can match by itemPath (for stock items) or objectId (for sold items).
   */
  removeFromBuyCart(player: ShopPlayer, itemPathOrObjectId: string): boolean {
    const state = this.getTransactionState(player);
    // Try to find by itemPath first, then by objectId for sold items
    let index = state.itemsToBuy.findIndex((e) => e.itemPath === itemPathOrObjectId);
    if (index === -1) {
      index = state.itemsToBuy.findIndex((e) => e.objectId === itemPathOrObjectId);
    }
    if (index === -1) return false;
    state.itemsToBuy.splice(index, 1);
    return true;
  }

  /**
   * Remove an item from the sell cart.
   */
  removeFromSellCart(player: ShopPlayer, itemId: string): boolean {
    const state = this.getTransactionState(player);
    const index = state.itemsToSell.findIndex((e) => e.itemId === itemId);
    if (index === -1) return false;
    state.itemsToSell.splice(index, 1);
    return true;
  }

  /**
   * Clear all items from the cart.
   */
  clearCart(player: ShopPlayer): void {
    const state = this.getTransactionState(player);
    state.itemsToBuy = [];
    state.itemsToSell = [];
  }

  /**
   * Calculate ledger summary for a transaction state.
   */
  calculateLedger(state: TransactionState, playerGold: number): LedgerSummary {
    const credits = state.itemsToSell.reduce((sum, e) => sum + e.price, 0);
    const debits = state.itemsToBuy.reduce((sum, e) => sum + e.price, 0);
    const netAmount = credits - debits;

    let canFinalize = true;
    let reason: string | undefined;

    // If net is negative, player owes gold
    if (netAmount < 0) {
      if (playerGold < Math.abs(netAmount)) {
        canFinalize = false;
        reason = 'Not enough gold';
      }
    }
    // If net is positive, merchant owes gold
    else if (netAmount > 0) {
      if (this._shopGold < netAmount) {
        canFinalize = false;
        reason = 'Merchant lacks gold';
      }
    }

    return { credits, debits, netAmount, canFinalize, reason };
  }

  // ========== Shop Actions ==========

  /**
   * Open the shop interface for a player.
   */
  async openShop(player: ShopPlayer): Promise<void> {
    // Clear any existing transaction state
    this.clearCart(player);

    try {
      // Dynamically import to avoid circular dependencies
      const { openShopModal } = await import('../lib/shop-modal.js');
      await openShopModal(player, this);
    } catch (error) {
      console.error('[Merchant] Error opening shop:', error);
      // Try to notify the player
      if ('receive' in player) {
        (player as ShopPlayer & { receive: (msg: string) => void }).receive(
          `{red}Error opening shop: ${error}{/}\n`
        );
      }
    }
  }

  /**
   * Close the shop interface for a player.
   */
  async closeShop(player: ShopPlayer): Promise<void> {
    // Clear transaction state
    this._activeSessions.delete(player.objectId);

    // Close the modal
    const { closeShopModal } = await import('../lib/shop-modal.js');
    closeShopModal(player);
  }

  /**
   * Finalize the transaction.
   */
  async finalizeTransaction(player: ShopPlayer): Promise<TransactionResult> {
    const state = this.getTransactionState(player);

    // Validate transaction
    const ledger = this.calculateLedger(state, player.gold);
    if (!ledger.canFinalize) {
      return {
        success: false,
        message: ledger.reason || 'Cannot complete transaction',
        itemsBought: [],
        itemsSold: [],
        goldSpent: 0,
        goldReceived: 0,
        netGold: 0,
      };
    }

    // Validate all sell items still exist and aren't equipped
    const validSellItems: Array<{ item: Item; entry: SellEntry }> = [];
    for (const entry of state.itemsToSell) {
      const item = player.inventory.find((i) => i.objectId === entry.itemId);
      if (!item) {
        return {
          success: false,
          message: `Item "${entry.name}" is no longer in your inventory.`,
          itemsBought: [],
          itemsSold: [],
          goldSpent: 0,
          goldReceived: 0,
          netGold: 0,
        };
      }
      if (this.isItemEquipped(item)) {
        return {
          success: false,
          message: `Item "${entry.name}" is equipped. Unequip it first.`,
          itemsBought: [],
          itemsSold: [],
          goldSpent: 0,
          goldReceived: 0,
          netGold: 0,
        };
      }
      validSellItems.push({ item, entry });
    }

    // Validate all buy items still in stock
    for (const entry of state.itemsToBuy) {
      if (!this.isInStock(entry.itemPath)) {
        return {
          success: false,
          message: `Item "${entry.name}" is no longer in stock.`,
          itemsBought: [],
          itemsSold: [],
          goldSpent: 0,
          goldReceived: 0,
          netGold: 0,
        };
      }
    }

    const itemsSold: string[] = [];
    const itemsBought: string[] = [];

    // Execute sells first - add items to merchant's sold inventory
    for (const { item, entry } of validSellItems) {
      // Move item to merchant's sold inventory instead of destroying
      const category = detectItemCategory(item);
      const sellPrice = Math.floor(entry.price * 1.2); // Merchant marks up 20% from what they paid

      // Remove from player
      await item.moveTo(this);

      // Add to sold items
      this._soldItems.set(item.objectId, {
        item,
        soldItem: {
          objectId: item.objectId,
          name: item.shortDesc || item.name || 'Unknown Item',
          sellPrice,
          category,
        },
      });

      itemsSold.push(entry.name);
    }

    // Execute buys
    for (const entry of state.itemsToBuy) {
      if (entry.isSoldItem && entry.objectId) {
        // Buying a sold item - transfer the actual item
        const soldEntry = this._soldItems.get(entry.objectId);
        if (soldEntry) {
          await soldEntry.item.moveTo(player);
          this._soldItems.delete(entry.objectId);
          itemsBought.push(entry.name);
        }
      } else {
        // Buying from stock - clone from blueprint
        if (typeof efuns !== 'undefined' && efuns.cloneObject) {
          const newItem = await efuns.cloneObject(entry.itemPath);
          if (newItem) {
            await newItem.moveTo(player);
            this.reduceStock(entry.itemPath);
            itemsBought.push(entry.name);
          }
        }
      }
    }

    // Settle gold
    const netGold = ledger.netAmount;
    if (netGold < 0) {
      // Player pays
      player.removeGold(Math.abs(netGold));
      this._shopGold += Math.abs(netGold);
    } else if (netGold > 0) {
      // Merchant pays
      player.addGold(netGold);
      this._shopGold -= netGold;
    }

    // Clear the cart
    this.clearCart(player);

    // Build result message
    const parts: string[] = [];
    if (itemsBought.length > 0) {
      parts.push(`Bought: ${itemsBought.join(', ')}`);
    }
    if (itemsSold.length > 0) {
      parts.push(`Sold: ${itemsSold.join(', ')}`);
    }
    if (netGold !== 0) {
      if (netGold < 0) {
        parts.push(`Paid ${Math.abs(netGold)} gold`);
      } else {
        parts.push(`Received ${netGold} gold`);
      }
    }

    return {
      success: true,
      message: parts.join('. ') || 'Transaction complete.',
      itemsBought,
      itemsSold,
      goldSpent: ledger.debits,
      goldReceived: ledger.credits,
      netGold,
    };
  }

  // ========== NPC Integration ==========

  /**
   * Override hearSay to respond to shop-related keywords.
   */
  override hearSay(speaker: Living, message: string): void {
    // Let parent handle AI/static responses first
    super.hearSay(speaker, message);

    // Check for shop keywords
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes('shop') ||
      lowerMsg.includes('buy') ||
      lowerMsg.includes('sell') ||
      lowerMsg.includes('browse') ||
      lowerMsg.includes('trade') ||
      lowerMsg.includes('wares')
    ) {
      // Check if speaker is a player
      if ('gold' in speaker && 'addGold' in speaker) {
        // Suggest using the shop command
        this.say(
          `Interested in trading? Just say "shop" or type 'shop ${this.name.split(' ')[0].toLowerCase()}' to open my shop.`
        );
      }
    }
  }

  // ========== Restocking ==========

  /**
   * Restock items to their max levels.
   */
  restock(): void {
    for (const item of this._shopInventory) {
      if (item.maxStock > 0) {
        item.stock = item.maxStock;
      }
    }
    this._lastRestock = Date.now();
  }

  /**
   * Check if restocking is needed and perform it.
   */
  checkRestock(): void {
    if (!this._restockEnabled) return;

    const now = Date.now();
    if (now - this._lastRestock >= this._restockInterval * 1000) {
      this.restock();
    }
  }

  /**
   * Heartbeat handler - check for restocking.
   */
  override async heartbeat(): Promise<void> {
    await super.heartbeat();
    this.checkRestock();
  }
}

export default Merchant;
