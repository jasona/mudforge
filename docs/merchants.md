# Merchant System

The merchant system allows players to buy and sell items through NPCs with a GUI-based shop interface. Merchants are reusable base classes that can be specialized for different shop types (blacksmiths, alchemists, general stores, etc.).

## Overview

The merchant system consists of:

- **Merchant class** (`/mudlib/std/merchant.ts`) - Base NPC class with shop functionality
- **Shop Modal** (`/mudlib/lib/shop-modal.ts`) - Three-panel GUI interface
- **Shop Types** (`/mudlib/lib/shop-types.ts`) - Type definitions
- **Shop Command** (`/mudlib/cmds/player/_shop.ts`) - Player command to open shops

## Quick Start

### Creating a Merchant

```typescript
// /mudlib/areas/town/blacksmith.ts
import { Merchant } from '../../std/merchant.js';

export class Blacksmith extends Merchant {
  constructor() {
    super();

    // Configure the merchant
    this.setMerchant({
      name: 'Grond the Smith',
      shopName: "Grond's Forge",
      shopDescription: 'Quality weapons and armor, forged with skill.',
      buyRate: 0.6,           // Pays 60% of item value when buying from players
      sellRate: 1.0,          // Sells at 100% of stock price
      acceptedTypes: ['weapon', 'armor'],  // Only buys weapons and armor
      shopGold: 5000,         // Gold available to buy from players
      charismaEffect: 0.01,   // 1% price improvement per charisma point above 10
    });

    // Set NPC properties
    this.shortDesc = 'Grond the Smith';
    this.longDesc = `A massive, barrel-chested man with arms like tree trunks.`;
    this.gender = 'male';

    // Add identifiers
    this.addId('grond');
    this.addId('smith');
    this.addId('blacksmith');
    this.addId('merchant');

    // Stock the shop
    this.addStock('/areas/town/items/iron_sword', 'Iron Sword', 100, 5, 'weapon');
    this.addStock('/areas/town/items/steel_sword', 'Steel Sword', 250, 3, 'weapon');
    this.addStock('/areas/town/items/leather_armor', 'Leather Armor', 75, 5, 'armor');
  }
}
```

### Adding Stock

Use `addStock()` to add items the merchant sells:

```typescript
// addStock(itemPath, name, price, quantity, category)
this.addStock('/items/iron_sword', 'Iron Sword', 100, 5, 'weapon');
this.addStock('/items/health_potion', 'Health Potion', 50, -1, 'potion');  // -1 = unlimited
```

| Parameter | Description |
|-----------|-------------|
| `itemPath` | Blueprint path for the item |
| `name` | Display name in the shop |
| `price` | Base selling price |
| `quantity` | Stock quantity (-1 for unlimited) |
| `category` | Category for grouping (weapon, armor, potion, etc.) |

## Merchant Configuration

### MerchantConfig Properties

```typescript
interface MerchantConfig {
  name: string;           // NPC name (e.g., "Grond the Smith")
  shopName: string;       // Shop name in modal header
  shopDescription?: string;  // Optional description
  buyRate: number;        // Rate for buying from players (0.5 = 50% of item.value)
  sellRate: number;       // Rate for selling to players (1.0 = 100% of stock price)
  acceptedTypes?: string[];  // Item types merchant will buy (empty = accepts all)
  shopGold: number;       // Gold available to buy items from players
  restockEnabled?: boolean;  // Whether stock restocks over time
  charismaEffect?: number;   // Price modifier per charisma point (default 0.01)
}
```

### Item Categories

The system recognizes these item categories:

| Category | Detection |
|----------|-----------|
| `weapon` | Has `minDamage` and `maxDamage` properties |
| `armor` | Has `armor` and `slot` properties (no damage) |
| `container` | Has `maxItems` and `canOpenClose` properties |
| `potion` | Path contains "potion" |
| `food` | Path contains "food", "bread", or "meat" |
| `misc` | Default for unrecognized items |

### Accepted Types

Control what items the merchant will buy from players:

```typescript
// Only buy weapons and armor
this.setMerchant({
  acceptedTypes: ['weapon', 'armor'],
  // ...
});

// Accept all items (general store)
this.setMerchant({
  acceptedTypes: [],  // Empty array = accepts all
  // ...
});
```

## The Shop Interface

### Opening a Shop

Players can open a merchant's shop with the `shop` command:

```
shop                    # Open shop with merchant in room
shop grond              # Open shop with specific merchant
shop blacksmith         # Use any merchant identifier
```

### Three-Panel Layout

The shop modal displays three panels:

```
+------------------------------------------------------------------+
|  [Shop Name]                                    Gold: 1,234      |
+------------------------------------------------------------------+
|  MERCHANT WARES          |  TRANSACTION LEDGER  |  YOUR ITEMS    |
|                          |                      |                |
|  Weapon                  |  BUYING:             | [Img] Sword    |
|  +------+ +------+       |  - Iron Sword   -50g |       25g [+]  |
|  |[Img] | |[Img] |       |  - Potion       -25g |                |
|  | Name | | Name |       |                      | [Img] Cap      |
|  | 50g  | | 75g  |       |  SELLING:            |       10g [+]  |
|  | [+]  | | [+]  |       |  + Leather Cap  +15g |                |
|  +------+ +------+       |                      | [Img] Ring     |
|                          |  ─────────────────── |       (N/A)    |
|  Armor                   |  Debits:    -75g     |                |
|  +------+ +------+       |  Credits:   +15g     |                |
|  |[Img] | |[Img] |       |  ─────────────────── |                |
|  | Name | | Name |       |  NET:       -60g     |                |
|  | 50g  | | 75g  |       |                      |                |
|  +------+ +------+       |                      |                |
+------------------------------------------------------------------+
|  [Clear Cart]           [Finalize Transaction]    [Leave Shop]   |
+------------------------------------------------------------------+
```

**Left Panel - Merchant Wares:**
- Items grouped by category
- Shows item portrait, name, and price
- Click [+] to add to cart
- Sold items (from players) shown with "(used)" tag

**Center Panel - Transaction Ledger:**
- Running list of items to buy (debits)
- Running list of items to sell (credits)
- Total debits, credits, and net amount
- Click [-] to remove items from cart

**Right Panel - Your Items:**
- Player's inventory
- Items merchant accepts show sell price
- Items merchant doesn't accept show "(N/A)"
- Equipped items show "(Equipped)"

### Merged Transaction Flow

The shop uses a merged transaction flow:

1. **Selection Phase**: Player selects items to buy AND sell
2. **Live Ledger**: Center panel shows running totals
3. **Single Finalize**: One transaction settles the net gold difference

This allows players to trade items efficiently - selling items to offset purchase costs.

## Price Calculations

### Charisma Modifier

Player charisma affects prices:

```typescript
// Formula
modifier = (charisma - 10) * charismaEffect

// Buying from merchant: lower is better for player
sellPrice = basePrice * (1 - modifier)

// Selling to merchant: higher is better for player
buyPrice = basePrice * (1 + modifier)
```

**Example with 15 Charisma (5 points above baseline):**
- charismaEffect = 0.01 (1% per point)
- modifier = 5 * 0.01 = 0.05 (5%)
- Buying sword worth 100g: pays 95g instead of 100g
- Selling sword merchant buys at 50g: receives 52g instead of 50g

### Display in Modal

Prices with charisma bonuses show both values:
- Base price with strikethrough: ~~100g~~
- Adjusted price: 95g

## Sold Items

When players sell items to a merchant:

1. Item moves to merchant's inventory (not destroyed)
2. Item appears in merchant's wares with "(used)" tag
3. Merchant marks up 20% from purchase price
4. New categories appear dynamically for sold items
5. Other players can buy these used items

This creates a dynamic economy where players can find unique items that other players have sold.

## Merchant NPC Integration

### Chat Responses

Merchants automatically respond to shop-related keywords:

```typescript
// Built-in response to "shop", "buy", "sell", "browse", "trade", "wares"
// The merchant will suggest using the shop command
```

### Custom Responses

Add custom chat and responses like any NPC:

```typescript
export class Blacksmith extends Merchant {
  constructor() {
    super();
    // ... merchant config ...

    // Add chat messages
    this.addChat('wipes sweat from his brow.', 'emote');
    this.addChat('Nothing beats good steel and honest work!', 'say');

    // Add response triggers
    this.addResponse(/hello|hi/i, 'Welcome to my forge!', 'say');
    this.addResponse(/sword|blade/i, "I've got iron and steel blades.", 'say');
  }
}
```

### Entry Greeting

Override `onEnter` for arrival greetings:

```typescript
override async onEnter(who: Living, from?: Room): Promise<void> {
  if (Math.random() < 0.4) {  // 40% chance
    setTimeout(() => {
      this.say('Welcome to my forge! Looking to buy or sell?');
    }, 1000);
  }
}
```

## Example Merchants

### Blacksmith (Weapons & Armor)

```typescript
export class Blacksmith extends Merchant {
  constructor() {
    super();
    this.setMerchant({
      name: 'Grond the Smith',
      shopName: "Grond's Forge",
      buyRate: 0.6,
      sellRate: 1.0,
      acceptedTypes: ['weapon', 'armor'],
      shopGold: 5000,
    });

    this.addStock('/items/iron_sword', 'Iron Sword', 100, 5, 'weapon');
    this.addStock('/items/leather_armor', 'Leather Armor', 75, 5, 'armor');
  }
}
```

### Alchemist (Potions)

```typescript
export class Alchemist extends Merchant {
  constructor() {
    super();
    this.setMerchant({
      name: 'Elara the Mystic',
      shopName: "Elara's Potions",
      buyRate: 0.4,      // Pays less for potions
      sellRate: 1.5,     // Sells at premium
      acceptedTypes: ['potion'],
      shopGold: 2000,
    });

    // Unlimited stock
    this.addStock('/items/health_potion', 'Health Potion', 50, -1, 'potion');
    this.addStock('/items/mana_potion', 'Mana Potion', 75, -1, 'potion');
  }
}
```

### General Store (Everything)

```typescript
export class GeneralStore extends Merchant {
  constructor() {
    super();
    this.setMerchant({
      name: 'Marta the Shopkeeper',
      shopName: "Marta's General Store",
      buyRate: 0.5,
      sellRate: 1.0,
      acceptedTypes: [],  // Accepts everything
      shopGold: 3000,
    });

    this.addStock('/items/torch', 'Torch', 5, 20, 'misc');
    this.addStock('/items/rope', 'Rope', 10, 10, 'misc');
    this.addStock('/items/rations', 'Trail Rations', 3, 50, 'food');
  }
}
```

## Restocking

Merchants can automatically restock their inventory:

```typescript
this.setMerchant({
  restockEnabled: true,
  // ...
});
```

Restocking occurs during the merchant's heartbeat cycle and restores stock to `maxStock` levels.

## API Reference

### Merchant Class Methods

| Method | Description |
|--------|-------------|
| `setMerchant(config)` | Configure merchant properties |
| `addStock(path, name, price, qty, cat)` | Add item to stock |
| `removeStock(itemPath)` | Remove item from stock |
| `getStock()` | Get all stocked items |
| `getSoldItems()` | Get items sold by players |
| `getCategories()` | Get all item categories |
| `openShop(player)` | Open shop modal for player |
| `closeShop(player)` | Close shop modal |
| `acceptsItem(item)` | Check if merchant buys item type |
| `getSellPrice(path, player)` | Get price player pays |
| `getBuyPrice(item, player)` | Get price player receives |
| `restock()` | Manually trigger restocking |

### Shop Types

```typescript
import type {
  ShopItem,           // Stock item definition
  SoldItem,           // Player-sold item
  MerchantConfig,     // Merchant configuration
  TransactionState,   // Current cart state
  TransactionResult,  // Finalize result
  LedgerSummary,      // Credits/debits summary
  BuyEntry,           // Item being purchased
  SellEntry,          // Item being sold
  ItemCategory,       // Item type categories
} from '../lib/shop-types.js';

import { detectItemCategory } from '../lib/shop-types.js';
```

## Best Practices

1. **Use appropriate buy/sell rates** - Higher markup for specialized shops
2. **Set reasonable shop gold** - Affects how much merchants can buy
3. **Group items by category** - Makes browsing easier
4. **Add flavor with chat/responses** - Makes merchants feel alive
5. **Consider charisma balance** - High charisma shouldn't break economy
6. **Test sold items** - Verify dynamic categories work correctly
