/**
 * Shop/Merchant System Types
 *
 * Type definitions for the merchant/store system, supporting a GUI-based
 * merged transaction flow where players can buy and sell items simultaneously.
 */

/**
 * An item stocked by a merchant for sale.
 */
export interface ShopItem {
  /** Blueprint path for the item */
  itemPath: string;
  /** Display name for the item */
  name: string;
  /** Price the merchant sells at */
  buyPrice: number;
  /** Current quantity available (-1 = unlimited) */
  stock: number;
  /** Maximum stock level for restocking */
  maxStock: number;
  /** Optional category for filtering (weapons, armor, potions, etc.) */
  category?: string;
}

/**
 * Configuration for setting up a merchant.
 */
export interface MerchantConfig {
  /** NPC name (e.g., "Grond the Smith") */
  name: string;
  /** Shop name displayed in modal (e.g., "Grond's Forge") */
  shopName: string;
  /** Optional shop description */
  shopDescription?: string;
  /** Rate at which merchant buys items (0.5 = 50% of item.value) */
  buyRate: number;
  /** Rate at which merchant sells items (1.0 = 100% of stock price) */
  sellRate: number;
  /** Item types the merchant will buy (empty = accepts all) */
  acceptedTypes?: string[];
  /** Gold available for buying items from players */
  shopGold: number;
  /** Whether stock restocks over time */
  restockEnabled?: boolean;
  /** How much charisma affects prices (default 0.01 = 1% per point above 10) */
  charismaEffect?: number;
}

/**
 * Display data for an item in the shop modal.
 */
export interface ShopItemDisplay {
  /** Unique identifier */
  id: string;
  /** Item name */
  name: string;
  /** Short description */
  description: string;
  /** Long description for preview */
  longDescription: string;
  /** Price (adjusted for charisma) */
  price: number;
  /** Base price (before charisma) */
  basePrice?: number;
  /** Portrait data URI or fallback */
  portraitUri: string;
  /** Item category */
  category: string;
  /** Whether player can afford this item */
  canAfford: boolean;
  /** Whether item is in stock */
  inStock: boolean;
  /** Blueprint path for buying */
  itemPath?: string;
  /** Object ID for player inventory items (selling) */
  objectId?: string;
  /** Whether merchant accepts this item type */
  accepted?: boolean;
}

/**
 * A used item sold to the merchant, available for resale.
 * Unlike ShopItem (blueprint-based), this represents an actual item instance.
 */
export interface SoldItem {
  /** Object ID of the actual item */
  objectId: string;
  /** Display name */
  name: string;
  /** Price the merchant sells at (markup from what they paid) */
  sellPrice: number;
  /** Category for display grouping */
  category: string;
}

/**
 * Entry for an item the player wants to buy.
 */
export interface BuyEntry {
  /** Blueprint path of the item (for stock items) */
  itemPath: string;
  /** Object ID (for sold items being rebought) */
  objectId?: string;
  /** Whether this is a sold item (not from stock) */
  isSoldItem?: boolean;
  /** Item name for display */
  name: string;
  /** Price per unit (debit) */
  price: number;
  /** Quantity to buy (default 1) */
  quantity: number;
  /** Portrait for ledger display */
  portraitUri?: string;
}

/**
 * Entry for an item the player wants to sell.
 */
export interface SellEntry {
  /** Object ID of the actual item instance */
  itemId: string;
  /** Item name for display */
  name: string;
  /** Price to receive (credit) */
  price: number;
  /** Portrait for ledger display */
  portraitUri?: string;
}

/**
 * Current state of a player's transaction with a merchant.
 */
export interface TransactionState {
  /** Items selected to buy from merchant */
  itemsToBuy: BuyEntry[];
  /** Items selected to sell to merchant */
  itemsToSell: SellEntry[];
}

/**
 * Summary of the transaction ledger.
 */
export interface LedgerSummary {
  /** Total from selling (positive) */
  credits: number;
  /** Total from buying (positive value representing cost) */
  debits: number;
  /** Net amount (credits - debits, positive = player receives gold) */
  netAmount: number;
  /** Whether player can finalize (has enough gold if net is negative) */
  canFinalize: boolean;
  /** Reason if cannot finalize */
  reason?: string;
}

/**
 * Result of finalizing a transaction.
 */
export interface TransactionResult {
  /** Whether the transaction succeeded */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Items successfully bought */
  itemsBought: string[];
  /** Items successfully sold */
  itemsSold: string[];
  /** Gold spent by player */
  goldSpent: number;
  /** Gold received by player */
  goldReceived: number;
  /** Net gold change (positive = player gained gold) */
  netGold: number;
}

/**
 * Item type categories for merchant filtering.
 * Used to determine what items a merchant will buy.
 */
export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'potion'
  | 'food'
  | 'container'
  | 'material'
  | 'misc'
  | 'all';

/**
 * Detect the category of an item based on its properties.
 * @param item The item object to categorize
 * @returns The item's category
 */
export function detectItemCategory(item: unknown): ItemCategory {
  // Check for weapon (has minDamage and maxDamage)
  if (item && typeof item === 'object') {
    if ('minDamage' in item && 'maxDamage' in item) {
      return 'weapon';
    }
    // Check for armor (has armor property and slot but not damage)
    if ('armor' in item && 'slot' in item && !('minDamage' in item)) {
      return 'armor';
    }
    // Check for container (has maxItems and canOpenClose)
    if ('maxItems' in item && 'canOpenClose' in item) {
      return 'container';
    }
    // Check for potion (could check for specific properties)
    const itemAny = item as Record<string, unknown>;
    if (itemAny.objectPath && typeof itemAny.objectPath === 'string') {
      const path = itemAny.objectPath.toLowerCase();
      if (path.includes('potion')) return 'potion';
      if (path.includes('food') || path.includes('bread') || path.includes('meat')) return 'food';
    }
  }
  return 'misc';
}
