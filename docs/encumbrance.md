# Weight & Encumbrance System Documentation

The weight and encumbrance system tracks how much players can carry and applies penalties when they become overloaded. Items have size-based default weights, and bags can reduce the effective weight of their contents.

## Table of Contents

- [Overview](#overview)
- [Player Commands](#player-commands)
- [Item Sizes](#item-sizes)
- [Carry Capacity](#carry-capacity)
- [Encumbrance Levels](#encumbrance-levels)
- [Combat Penalties](#combat-penalties)
- [Bags and Weight Reduction](#bags-and-weight-reduction)
- [Builder Guide: Creating Items](#builder-guide-creating-items)
- [Developer Reference](#developer-reference)

---

## Overview

The encumbrance system provides:

- **Size-Based Weights**: Items have a default weight based on their size category
- **Strength-Based Capacity**: How much you can carry scales with your Strength stat
- **Encumbrance Levels**: Gradual penalties as you approach or exceed capacity
- **Combat Penalties**: Slower attacks and reduced dodge when overloaded
- **Bag Weight Reduction**: Specialized containers that reduce the effective weight of contents
- **Immovable Objects**: Items that cannot be picked up regardless of strength

---

## Player Commands

### Viewing Encumbrance Status

Use the `encumbrance` command (or its aliases) to check your current weight and status:

```
> encumbrance        - Show weight bar, current/max weight, and penalties
> enc                - Alias for encumbrance
> weight             - Alias for encumbrance
```

**Example Output:**
```
=== Encumbrance ===

Weight: [████████████░░░░░░░░] 58.5%

Current Weight: 58.5 / 100.0
  Equipped: 23.0
  Carried:  35.5

Status: None

Strength: 10 (carry capacity: 100)
```

### When Encumbered

When carrying too much weight, you'll see your penalties:

```
=== Encumbrance ===

Weight: [████████████████████] 112.3%

Current Weight: 112.3 / 100.0
  Equipped: 45.0
  Carried:  67.3

Status: Medium

Active Penalties:
  -25% attack speed
  -10% dodge chance

Strength: 10 (carry capacity: 100)
```

---

## Item Sizes

Every item has a size category that determines its default weight. Builders can still override weight explicitly when needed.

| Size | Default Weight | Examples |
|------|----------------|----------|
| `tiny` | 0.1 | coins, rings, gems, scrolls, letters |
| `small` | 0.5 | daggers, potions, wands, keys |
| `medium` | 1.0 | swords, helms, books, tools |
| `large` | 3.0 | two-handed weapons, shields, armor |
| `huge` | 10.0 | chests, large furniture |
| `immovable` | ∞ | boulders, statues, pillars, fixtures |

### Immovable Items

Items with size `immovable` cannot be picked up under any circumstances. They are automatically set to `takeable: false` and have infinite weight. Use this for:

- Environmental fixtures (fountains, statues)
- Heavy furniture (thrones, altars)
- Natural obstacles (boulders, fallen trees)
- Quest objects that shouldn't be moved

---

## Carry Capacity

A player's maximum carry weight is calculated from their Strength stat:

```
maxCarryWeight = 50 + (STR × 5)
```

| Strength | Carry Capacity |
|----------|----------------|
| 1 | 55 |
| 5 | 75 |
| 10 | 100 |
| 15 | 125 |
| 20 | 150 |
| 30 | 200 |
| 50 | 300 |

This means a character with average Strength (10) can carry 100 weight units before becoming overloaded.

---

## Encumbrance Levels

As you approach and exceed your carry capacity, you progress through encumbrance levels:

| Level | Threshold | Description |
|-------|-----------|-------------|
| **None** | 0-74% | No penalties, normal gameplay |
| **Light** | 75-99% | Minor penalties, can still function |
| **Medium** | 100-124% | Significant penalties, overloaded |
| **Heavy** | 125%+ | Severe penalties, cannot pick up more |

### Cannot Pick Up More

At **Heavy** encumbrance (125%+), you cannot pick up additional items. The game will reject pickup attempts with:

```
You're carrying too much weight to pick that up.
```

You must drop items or find a bag with weight reduction to free up capacity.

---

## Combat Penalties

Encumbrance affects your combat effectiveness through two penalties:

### Attack Speed Penalty

Your attack speed is reduced, making combat rounds take longer:

| Encumbrance Level | Attack Speed Penalty |
|-------------------|---------------------|
| None | 0% |
| Light | -10% |
| Medium | -25% |
| Heavy | -50% |

**Example**: With a base round time of 3 seconds at Heavy encumbrance, your round time becomes 4.5 seconds.

### Dodge Penalty

Your ability to dodge attacks is reduced:

| Encumbrance Level | Dodge Penalty |
|-------------------|---------------|
| None | 0% |
| Light | 0% |
| Medium | -10% of max dodge |
| Heavy | -25% of max dodge |

**Example**: If you normally have a 40% dodge chance at Heavy encumbrance, you lose 12.5% (25% of 50 max), reducing your effective dodge to 27.5%.

---

## Bags and Weight Reduction

Bags are special containers that can reduce the effective weight of their contents.

### How Weight Reduction Works

A bag's `weightReduction` property (0-100%) reduces how much the items inside contribute to your encumbrance:

```
effectiveContentsWeight = actualContentsWeight × (1 - weightReduction/100)
totalBagWeight = bagOwnWeight + effectiveContentsWeight
```

**Example**: A bag with 50% weight reduction:
- Bag's own weight: 1
- Contents actual weight: 20
- Effective contents weight: 20 × 0.5 = 10
- Total contribution to encumbrance: 1 + 10 = 11 (instead of 21)

### Bag Properties

| Property | Type | Description |
|----------|------|-------------|
| `weightReduction` | number | Percentage reduction (0-100) |
| `size` | ItemSize | Size category of the bag itself |
| `maxItems` | number | Maximum items the bag can hold |
| `maxWeight` | number | Maximum total weight the bag can hold |

### Nested Bags

Bags can contain other bags. Weight reduction applies recursively, but be careful - nested bags can make weight calculations complex and potentially exploitable if not balanced carefully.

---

## Builder Guide: Creating Items

### Setting Item Size

The simplest way to set weight is to specify the item's size:

```typescript
import { Item, ItemSize } from '../../lib/std.js';

export class GoldCoin extends Item {
  constructor() {
    super();
    this.size = 'tiny' as ItemSize; // Weight: 0.1
    this.shortDesc = 'a gold coin';
  }
}
```

### Overriding Default Weight

If an item needs a weight different from its size default, set both:

```typescript
export class HeavyIronSword extends Item {
  constructor() {
    super();
    this.size = 'large' as ItemSize; // Category: large items
    this.weight = 8; // But heavier than the default 3
    this.shortDesc = 'a heavy iron sword';
  }
}
```

**Important**: Set `size` before `weight`. The size setter updates weight automatically unless weight has been explicitly set.

### Using setItem() Options

The `setItem()` method accepts size and weight:

```typescript
this.setItem({
  shortDesc: 'a healing potion',
  longDesc: 'A small vial of red liquid.',
  size: 'small', // Weight 0.5
  value: 25,
});
```

With explicit weight override:

```typescript
this.setItem({
  shortDesc: 'a large healing potion',
  longDesc: 'A large flask of red liquid.',
  size: 'small', // Still categorized as small
  weight: 1.5,   // But heavier than default
  value: 50,
});
```

### Creating Weapons

Weapons automatically adjust size based on handedness:

| Handedness | Default Size | Default Weight |
|------------|--------------|----------------|
| `light` | small | 0.5 |
| `one_handed` | medium | 1.0 |
| `two_handed` | large | 3.0 |

```typescript
import { Weapon } from '../../lib/std.js';

export class Dagger extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'a steel dagger',
      handedness: 'light', // Auto-sets size to 'small' (0.5)
      minDamage: 2,
      maxDamage: 5,
      damageType: 'piercing',
    });
  }
}

export class BattleAxe extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'a battle axe',
      handedness: 'two_handed', // Auto-sets size to 'large' (3.0)
      weight: 8, // Override: this axe is extra heavy
      minDamage: 8,
      maxDamage: 16,
      damageType: 'slashing',
    });
  }
}
```

### Creating Armor

Armor defaults to size `large` (weight 3):

```typescript
import { Armor } from '../../lib/std.js';

export class LeatherCap extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'a leather cap',
      size: 'medium', // Override default: lighter headgear
      armor: 1,
      slot: 'head',
    });
  }
}

export class PlateArmor extends Armor {
  constructor() {
    super();
    this.setArmor({
      shortDesc: 'plate armor',
      size: 'huge', // Very heavy armor
      weight: 15, // Even heavier than 'huge' default
      armor: 8,
      slot: 'chest',
    });
  }
}
```

### Creating Bags

```typescript
import { Bag, ItemSize } from '../../lib/std.js';

export class LeatherBackpack extends Bag {
  constructor() {
    super();
    this.setBag({
      shortDesc: 'a leather backpack',
      longDesc: 'A sturdy leather backpack with multiple compartments.',
      size: 'medium' as ItemSize, // The bag itself weighs 1
      maxItems: 20,
      maxWeight: 50,
      weightReduction: 25, // 25% weight reduction
      value: 100,
    });

    this.addId('backpack');
    this.addId('pack');
  }
}

export class MagicalBag extends Bag {
  constructor() {
    super();
    this.setBag({
      shortDesc: 'a bag of holding',
      longDesc: 'This magical bag is larger on the inside than the outside.',
      size: 'small' as ItemSize, // Small bag
      maxItems: 100,
      maxWeight: 500,
      weightReduction: 90, // 90% weight reduction!
      value: 5000,
    });

    this.addId('bag');
    this.addId('bag of holding');
  }
}
```

### Creating Immovable Objects

```typescript
import { Item, ItemSize } from '../../lib/std.js';

export class StonePillar extends Item {
  constructor() {
    super();
    this.size = 'immovable' as ItemSize; // Cannot be picked up
    this.shortDesc = 'a stone pillar';
    this.longDesc = 'A massive stone pillar reaches toward the ceiling.';
    this.addId('pillar');
    this.addId('stone pillar');
  }
}
```

Players attempting to pick up immovable items will see:

```
You can't pick that up. It's immovable.
```

---

## Developer Reference

### Item Properties

```typescript
class Item extends MudObject {
  /** Item size category */
  size: ItemSize;

  /** Item weight (auto-set by size unless explicitly overridden) */
  weight: number;

  /** Whether the item can be picked up */
  takeable: boolean;

  /** Get effective weight for encumbrance (overridden by Bag) */
  getEffectiveWeight(): number;
}
```

### Living Encumbrance Methods

```typescript
class Living extends MudObject {
  /** Get max carry weight based on Strength: 50 + (STR * 5) */
  getMaxCarryWeight(): number;

  /** Get total carried weight (uses effective weights) */
  getCarriedWeight(): number;

  /** Get encumbrance as percentage of max */
  getEncumbrancePercent(): number;

  /** Get current encumbrance level */
  getEncumbranceLevel(): EncumbranceLevel;

  /** Get current encumbrance penalties */
  getEncumbrancePenalties(): {
    attackSpeedPenalty: number;
    dodgePenalty: number;
  };

  /** Check if player can carry an item */
  canCarryItem(item: MudObject): {
    canCarry: boolean;
    reason?: string;
  };
}
```

### Bag Class

```typescript
class Bag extends Container {
  /** Weight reduction percentage (0-100) */
  weightReduction: number;

  /** Get effective weight of contents after reduction */
  getContentsEffectiveWeight(): number;

  /** Total weight: bag weight + reduced contents weight */
  override getEffectiveWeight(): number;

  /** Configure the bag */
  setBag(options: {
    shortDesc?: string;
    longDesc?: string;
    size?: ItemSize;
    weight?: number;
    value?: number;
    maxItems?: number;
    maxWeight?: number;
    weightReduction?: number;
    open?: boolean;
  }): void;
}
```

### Types and Constants

```typescript
/** Item size categories */
type ItemSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'immovable';

/** Default weights for each size */
const SIZE_WEIGHTS: Record<ItemSize, number> = {
  tiny: 0.1,
  small: 0.5,
  medium: 1,
  large: 3,
  huge: 10,
  immovable: Infinity,
};

/** Encumbrance level names */
type EncumbranceLevel = 'none' | 'light' | 'medium' | 'heavy';

/** Encumbrance thresholds (percentage of max carry weight) */
const ENCUMBRANCE_THRESHOLDS = {
  none: 74,
  light: 99,
  medium: 124,
  heavy: Infinity,
};

/** Encumbrance penalties per level */
const ENCUMBRANCE_PENALTIES = {
  none: { attackSpeedPenalty: 0, dodgePenalty: 0 },
  light: { attackSpeedPenalty: 0.10, dodgePenalty: 0 },
  medium: { attackSpeedPenalty: 0.25, dodgePenalty: 0.10 },
  heavy: { attackSpeedPenalty: 0.50, dodgePenalty: 0.25 },
};
```

### Files

| File | Purpose |
|------|---------|
| `mudlib/std/item.ts` | ItemSize type, SIZE_WEIGHTS, size property, getEffectiveWeight() |
| `mudlib/std/bag.ts` | Bag class with weight reduction |
| `mudlib/std/living.ts` | Encumbrance methods, thresholds, penalties |
| `mudlib/std/weapon.ts` | Auto-size based on handedness |
| `mudlib/std/armor.ts` | Default large size |
| `mudlib/cmds/player/_encumbrance.ts` | Player encumbrance command |
| `mudlib/cmds/player/_get.ts` | Weight checks on pickup |
| `mudlib/daemons/combat.ts` | Combat penalty application |

---

## Examples

### Item with Size-Based Weight

```typescript
import { Item, ItemSize } from '../../lib/std.js';

export class Ruby extends Item {
  constructor() {
    super();
    this.size = 'tiny' as ItemSize; // Weight 0.1
    this.shortDesc = 'a glittering ruby';
    this.longDesc = 'A beautifully cut ruby that sparkles in the light.';
    this.value = 500;
    this.addId('ruby');
    this.addId('gem');
  }
}
```

### Heavy Weapon

```typescript
import { Weapon } from '../../lib/std.js';

export class Warhammer extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      shortDesc: 'a massive warhammer',
      longDesc: 'This enormous hammer could crush stone.',
      handedness: 'two_handed',
      size: 'huge', // Override: extra large weapon
      weight: 15, // Even heavier than huge default
      minDamage: 12,
      maxDamage: 24,
      damageType: 'bludgeoning',
      attackSpeed: -0.3, // Very slow
    });
    this.addId('hammer');
    this.addId('warhammer');
  }
}
```

### Merchant Selling Bags

```typescript
// In a merchant NPC
this.addItem('/users/acer/leather_backpack', 100, {
  description: 'Leather Backpack (25% weight reduction)',
});
this.addItem('/users/acer/bag_of_holding', 5000, {
  description: 'Bag of Holding (90% weight reduction)',
});
```

### Room with Immovable Decoration

```typescript
import { Room, Item, ItemSize } from '../../lib/std.js';

// Create a decorative fountain
class Fountain extends Item {
  constructor() {
    super();
    this.size = 'immovable' as ItemSize;
    this.shortDesc = 'an ornate fountain';
    this.longDesc = `Crystal clear water bubbles up from this marble fountain,
cascading down three tiers into a wide basin below. Golden fish swim
lazily in the pool, their scales glinting in the light.`;
    this.addId('fountain');
    this.addId('pool');
    this.addId('basin');
  }
}

export class TownSquare extends Room {
  async create(): Promise<void> {
    this.setRoom({
      shortDesc: 'Town Square',
      longDesc: 'The bustling center of town.',
    });

    // Add the fountain to the room
    const fountain = new Fountain();
    await fountain.moveTo(this);
  }
}
```

### Checking Encumbrance in Code

```typescript
// Check before giving a heavy item
function giveReward(player: Living, item: Item): boolean {
  const canCarry = player.canCarryItem(item);
  if (!canCarry.canCarry) {
    player.receive(`{yellow}${canCarry.reason}{/}\n`);
    player.receive(`{yellow}The item falls to the ground.{/}\n`);
    item.moveTo(player.environment);
    return false;
  }

  item.moveTo(player);
  player.receive(`{green}You receive ${item.shortDesc}.{/}\n`);
  return true;
}
```

### Adjusting Combat Based on Encumbrance

The combat system automatically applies penalties, but you can also check manually:

```typescript
// In a special ability
function performDodgeRoll(defender: Living): boolean {
  const penalties = defender.getEncumbrancePenalties();
  let dodgeChance = 30; // Base 30%

  // Apply encumbrance penalty
  if (penalties.dodgePenalty > 0) {
    dodgeChance -= 50 * penalties.dodgePenalty; // Max dodge is 50
  }

  return Math.random() * 100 < dodgeChance;
}
```
