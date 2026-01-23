# Random Loot Generator System

The random loot generator creates dynamically generated weapons, armor, and baubles with quality tiers, special abilities, and proper persistence. NPCs can register to drop random loot instead of using static loot tables.

## Table of Contents

- [Overview](#overview)
- [Quality Tiers](#quality-tiers)
- [Item Types](#item-types)
  - [Weapons](#weapons)
  - [Armor](#armor)
  - [Baubles](#baubles)
- [Name Generation](#name-generation)
- [Special Abilities](#special-abilities)
  - [On-Hit Abilities](#on-hit-abilities)
  - [On-Equip Abilities](#on-equip-abilities)
- [NPC Integration](#npc-integration)
- [Admin Commands](#admin-commands)
- [Persistence](#persistence)
- [Builder Guide](#builder-guide)
- [API Reference](#api-reference)

---

## Overview

The random loot system consists of:

- **Quality Tiers** - Six tiers from common to unique, each with stat multipliers and feature availability
- **Material System** - Materials appropriate for each quality tier affect stats and item names
- **Suffix System** - Stat and effect suffixes for rare+ items (e.g., "of Might", "of the Assassin")
- **Ability System** - Special on-hit and on-equip abilities for rare+ items
- **Name Generation** - Procedural names combining materials, base types, and suffixes
- **Unique Items** - Hand-crafted legendary items with special powers
- **AI Descriptions** - Optional AI-generated flavor text for generated items
- **Persistence** - Generated items save with player data and recreate on login

### File Structure

```
mudlib/std/loot/
  types.ts       # Core interfaces and type definitions
  tables.ts      # Materials, suffixes, unique items, weapon/armor configs
  quality.ts     # Quality tier configurations and roll logic
  abilities.ts   # Special ability templates and selection
  generator.ts   # Core LootGenerator class
  description.ts # AI description generation

mudlib/std/generated/
  weapon.ts      # GeneratedWeapon class
  armor.ts       # GeneratedArmor class
  bauble.ts      # GeneratedBauble class

mudlib/daemons/loot.ts           # LootDaemon singleton
mudlib/cmds/admin/_genloot.ts    # Admin testing command
```

---

## Quality Tiers

Items are generated in one of six quality tiers, each with different stat multipliers and features:

| Tier | Color | Level Range | Stat Mult | Value Mult | Features |
|------|-------|-------------|-----------|------------|----------|
| Common | White | 1-15 | 1.0x | 1.0x | Base stats only |
| Uncommon | {bold}{green}Green | 5-25 | 1.1x | 1.5x | +10% stats, minor stat bonuses |
| Rare | {bold}{blue}Blue | 10-35 | 1.2x | 2.5x | +20% stats, suffix, 0-1 ability |
| Epic | {bold}{purple}Purple | 20-45 | 1.35x | 5.0x | +35% stats, suffix, 1-2 abilities |
| Legendary | {bold}{orange}Orange | 30-50 | 1.5x | 10.0x | +50% stats, 1-3 powerful abilities |
| Unique | {bold}{yellow}Gold | 40-50 | 1.6x | 20.0x | Named items with unique powers |

### Quality Roll Weights

When rolling for quality, each tier has a base weight that affects drop rates:

| Tier | Base Weight | Approximate Rate |
|------|-------------|------------------|
| Common | 50 | ~50% |
| Uncommon | 30 | ~30% |
| Rare | 15 | ~15% |
| Epic | 4 | ~4% |
| Legendary | 0.9 | ~0.9% |
| Unique | 0.1 | Special drops only |

Weights are adjusted based on:
- **Item Level**: Higher levels improve chances for better tiers
- **Luck Bonus**: Player luck stat adds ~2% per point to higher tier weights
- **Max Quality Cap**: NPC configurations can cap maximum quality

---

## Item Types

### Weapons

22 weapon types across three handedness categories:

#### One-Handed Weapons
| Type | Damage Type | Multiplier | Speed | Size |
|------|-------------|------------|-------|------|
| Sword | Slashing | 1.0x | Normal | Medium |
| Longsword | Slashing | 1.1x | -10% | Medium |
| Axe | Slashing | 1.15x | -15% | Medium |
| Mace | Bludgeoning | 1.1x | -10% | Medium |
| Hammer | Bludgeoning | 1.2x | -20% | Medium |
| Flail | Bludgeoning | 1.1x | -15% | Medium |
| Scimitar | Slashing | 0.95x | +10% | Medium |

#### Light Weapons (Dual-Wield Capable)
| Type | Damage Type | Multiplier | Speed | Size |
|------|-------------|------------|-------|------|
| Shortsword | Slashing | 0.85x | +15% | Small |
| Dagger | Piercing | 0.7x | +25% | Small |
| Knife | Piercing | 0.6x | +30% | Small |
| Hatchet | Slashing | 0.8x | +10% | Small |
| Rapier | Piercing | 0.9x | +15% | Small |

#### Two-Handed Weapons
| Type | Damage Type | Multiplier | Speed | Size |
|------|-------------|------------|-------|------|
| Greatsword | Slashing | 1.5x | -25% | Large |
| Greataxe | Slashing | 1.6x | -30% | Large |
| Warhammer | Bludgeoning | 1.7x | -35% | Large |
| Staff | Bludgeoning | 1.0x | Normal | Large |
| Quarterstaff | Bludgeoning | 1.1x | +10% | Large |
| Spear | Piercing | 1.3x | -10% | Large |
| Halberd | Slashing | 1.55x | -30% | Large |
| Bow | Piercing | 1.2x | Normal | Medium |
| Crossbow | Piercing | 1.4x | -30% | Medium |

### Armor

25 armor types across seven equipment slots:

#### Head Slot
| Type | Armor Mult | Weight Class |
|------|------------|--------------|
| Helm | 1.0x | Heavy |
| Cap | 0.6x | Light |
| Hood | 0.4x | Light |
| Crown | 0.5x | Light |

#### Chest Slot
| Type | Armor Mult | Weight Class |
|------|------------|--------------|
| Plate | 1.0x | Heavy |
| Chainmail | 0.75x | Medium |
| Leather Armor | 0.5x | Light |
| Robe | 0.25x | Light |

#### Hands Slot
| Type | Armor Mult | Weight Class |
|------|------------|--------------|
| Gauntlets | 1.0x | Heavy |
| Gloves | 0.5x | Light |
| Bracers | 0.7x | Medium |

#### Legs Slot
| Type | Armor Mult | Weight Class |
|------|------------|--------------|
| Greaves | 1.0x | Heavy |
| Pants | 0.4x | Light |
| Legguards | 0.7x | Medium |

#### Feet Slot
| Type | Armor Mult | Weight Class |
|------|------------|--------------|
| Boots | 1.0x | Medium |
| Sandals | 0.3x | Light |
| Shoes | 0.5x | Light |

#### Cloak Slot
| Type | Armor Mult | Weight Class |
|------|------------|--------------|
| Cloak | 0.5x | Light |
| Cape | 0.3x | Light |
| Mantle | 0.6x | Light |

#### Shield Slot
| Type | Armor Mult | Weight Class | Special |
|------|------------|--------------|---------|
| Shield | 1.0x | Medium | +Block |
| Buckler | 0.6x | Light | +Block |
| Tower Shield | 1.4x | Heavy | +Block |

Light armor grants dodge bonuses; shields grant block bonuses.

### Baubles

11 bauble types that provide passive stat bonuses when carried:

#### Jewelry
| Type | Value Mult | Size |
|------|------------|------|
| Ring | 2.0x | Tiny |
| Amulet | 2.5x | Tiny |
| Necklace | 2.3x | Tiny |
| Pendant | 2.2x | Tiny |

#### Gems
| Type | Value Mult | Size |
|------|------------|------|
| Gem | 3.0x | Tiny |
| Gemstone | 3.5x | Tiny |
| Jewel | 4.0x | Tiny |

#### Trinkets
| Type | Value Mult | Size |
|------|------------|------|
| Trinket | 1.5x | Small |
| Charm | 1.8x | Tiny |
| Token | 1.3x | Tiny |
| Figurine | 2.0x | Small |

Baubles apply their stat bonuses when picked up and remove them when dropped.

---

## Name Generation

Item names are procedurally generated using materials, base types, and suffixes.

### Materials by Quality

| Quality | Materials |
|---------|-----------|
| Common | Iron, Bronze, Copper, Wooden, Bone |
| Uncommon | Steel, Hardened, Tempered, Refined, Reinforced |
| Rare | Mithril, Elven, Dwarven, Silver, Enchanted |
| Epic | Dragonbone, Adamantine, Orichalcum, Runesteel, Starmetal |
| Legendary | Celestial, Voidforged, Primordial, Divine, Ethereal |

### Name Format Examples

| Quality | Format | Example |
|---------|--------|---------|
| Common | [Material] [Type] | Iron Sword |
| Uncommon | [Material] [Type] | Steel Dagger |
| Rare | [Material] [Type] [Suffix] | Mithril Axe of Might |
| Epic | [Material] [Type] [Suffix] | Dragonbone Greatsword of the Assassin |
| Legendary | [Material] [Type] [Suffix] | Celestial Staff of Enlightenment |
| Unique | [Title], [Subtitle] | Shadowfang, Blade of the Void |

### Stat Suffixes

Suffixes provide stat bonuses and appear on rare+ items:

| Suffix | Tiers | Bonuses |
|--------|-------|---------|
| of Might | Rare+ | +3 Strength |
| of the Bear | Rare+ | +2 Strength, +1 Constitution |
| of the Giant | Epic+ | +5 Strength |
| of Agility | Rare+ | +3 Dexterity |
| of the Cat | Rare+ | +2 Dexterity, +1 Luck |
| of Intellect | Rare+ | +3 Intelligence |
| of the Sage | Rare+ | +2 Intelligence, +1 Wisdom |
| of Vitality | Rare+ | +3 Constitution |
| of Fortune | Rare+ | +3 Luck |
| of the Warrior | Epic+ | +2 Str, +2 Con, +1 Dex |
| of the Mage | Epic+ | +2 Int, +2 Wis, +1 Cha |
| of Balance | Legendary | +1 to all stats |

### Effect Suffixes

Combat-focused suffixes for rare+ items:

| Suffix | Tiers | Bonuses |
|--------|-------|---------|
| of Precision | Rare+ | +5 toHit |
| of Evasion | Rare+ | +5 toDodge |
| of Swiftness | Rare+ | +10% attack speed |
| of Warding | Rare+ | +3 armor |
| of Blocking | Rare+ | +5 toBlock |
| of Striking | Rare+ | +3 damage |
| of Devastation | Epic+ | +5% critical |
| of the Assassin | Epic+ | +8 toHit, +5% critical |
| of the Duelist | Epic+ | +8 toDodge, +10% speed |
| of the Guardian | Epic+ | +10 toBlock, +5 armor |

---

## Special Abilities

Rare+ items can have special abilities that trigger on-hit or provide passive bonuses.

### On-Hit Abilities

These abilities have a chance to trigger when attacking:

| Ability | Trigger | Effect | Tiers |
|---------|---------|--------|-------|
| Burning Strike | 15%+ | Burn for fire DoT over 5s | Rare+ |
| Venomous Strike | 12%+ | Poison for poison DoT over 8s | Rare+ |
| Chilling Strike | 10%+ | Slow enemy by magnitude% for 4s | Rare+ |
| Shocking Strike | 18%+ | Deal lightning damage | Rare+ |
| Holy Strike | 20%+ | Deal holy damage (bonus vs undead) | Rare+ |
| Shadowbite | 15%+ | Deal dark damage | Rare+ |
| Life Drain | 10%+ | Heal for % of damage dealt | Epic+ |
| Mana Siphon | 12%+ | Restore mana on hit | Epic+ |
| Stunning Blow | 5%+ | Stun enemy briefly | Epic+ |

Chance and magnitude scale with item level.

### On-Equip Abilities

These abilities provide passive bonuses while equipped:

| Ability | Effect | Item Types | Tiers |
|---------|--------|------------|-------|
| Swift | +attack speed% | Weapon, Armor | Rare+ |
| Savage | +critical% | Weapon, Armor | Rare+ |
| Precise | +accuracy | Weapon | Rare+ |
| Thorns | Reflect damage | Armor | Rare+ |
| Regeneration | +HP every 5s | Armor | Rare+ |
| Arcane Recovery | +MP every 5s | Armor, Bauble | Rare+ |
| Fortified | +armor | Armor | Rare+ |
| Evasive | +dodge% | Armor | Rare+ |
| Stalwart | +block% | Armor | Rare+ |
| Lucky | +luck | Bauble | Rare+ |
| Wise | +wisdom | Bauble | Rare+ |
| Scholarly | +intelligence | Bauble | Rare+ |

### Maximum Abilities by Quality

| Quality | Max Abilities |
|---------|---------------|
| Common | 0 |
| Uncommon | 0 |
| Rare | 1 |
| Epic | 2 |
| Legendary | 3 |
| Unique | 4 |

---

## NPC Integration

NPCs can register to drop random loot when killed.

### Configuration

```typescript
interface NPCRandomLootConfig {
  enabled: boolean;        // Enable random loot drops
  itemLevel: number;       // Base level for generated items
  maxQuality: QualityTier; // Highest quality that can drop
  dropChance: number;      // Chance for any loot (0-100)
  maxDrops: number;        // Maximum items that can drop
  allowedTypes?: ('weapon' | 'armor' | 'bauble')[];
  allowedWeaponTypes?: WeaponType[];
  allowedArmorSlots?: ArmorSlot[];
}
```

### Setting Up Random Loot on an NPC

```typescript
import { NPC } from '../../std/npc.js';

export class DragonBoss extends NPC {
  constructor() {
    super();
    this.setNPC({ name: 'Ancient Dragon', level: 40 });

    // Enable random loot drops
    this.setRandomLoot({
      enabled: true,
      itemLevel: 40,
      maxQuality: 'legendary',
      dropChance: 80,      // 80% chance for any loot
      maxDrops: 3,         // Up to 3 items
      allowedTypes: ['weapon', 'armor'],
    });
  }
}
```

### Examples by Monster Type

**Basic Monster (Levels 1-10):**
```typescript
this.setRandomLoot({
  enabled: true,
  itemLevel: 5,
  maxQuality: 'uncommon',
  dropChance: 20,
  maxDrops: 1,
});
```

**Mini-Boss (Levels 15-25):**
```typescript
this.setRandomLoot({
  enabled: true,
  itemLevel: 20,
  maxQuality: 'rare',
  dropChance: 50,
  maxDrops: 2,
});
```

**Raid Boss (Levels 40-50):**
```typescript
this.setRandomLoot({
  enabled: true,
  itemLevel: 45,
  maxQuality: 'legendary',
  dropChance: 100,
  maxDrops: 5,
  allowedTypes: ['weapon', 'armor'],
});
```

---

## Admin Commands

The `genloot` command allows administrators to generate test items:

### Usage

```
genloot <type> [level] [quality]
```

### Parameters

| Parameter | Values | Default |
|-----------|--------|---------|
| type | weapon, armor, bauble, random | required |
| level | 1-50 | 10 |
| quality | common, uncommon, rare, epic, legendary, unique | legendary |

### Examples

```
genloot weapon 20 rare     # Level 20 rare weapon
genloot armor 35 epic      # Level 35 epic armor
genloot bauble 10          # Level 10 bauble (random quality up to legendary)
genloot random 50 legendary # Random level 50 legendary item
```

### Output

```
Generated item:
  Name: {bold}{blue}Mithril Axe of Might{/}
  Level: 20
  Quality: rare
  Value: 450 gold
  Weight: 3 lbs
  Damage: 28-42
  Type: axe
  Stat Bonuses: +3 strength
  Abilities:
    Burning Strike: 15% chance to burn enemies for 11 fire damage over 5s
```

---

## Persistence

Generated items persist with player data and are recreated on login.

### How It Works

1. **Generation**: Each item stores its `GeneratedItemData` in the `_generatedItemData` property
2. **Player Save**: When a player saves, generated items in inventory are serialized
3. **Path Detection**: Generated items use special paths: `/generated/weapon`, `/generated/armor`, `/generated/bauble`
4. **Recreation**: On player load, the LootDaemon recreates items from saved data

### GeneratedItemData Structure

```typescript
interface GeneratedItemData {
  generatedType: 'weapon' | 'armor' | 'bauble';
  seed: string;           // Random seed for reproducibility
  baseName: string;       // Name without colors
  fullName: string;       // Display name with quality colors
  uniqueTitle?: string;   // For unique items
  quality: QualityTier;
  description: string;
  itemLevel: number;
  value: number;
  weight: number;

  // Weapon-specific
  weaponType?: WeaponType;
  minDamage?: number;
  maxDamage?: number;
  damageType?: DamageType;
  handedness?: 'one_handed' | 'light' | 'two_handed';
  toHit?: number;
  attackSpeed?: number;

  // Armor-specific
  armorType?: ArmorType;
  armorSlot?: ArmorSlot;
  armor?: number;
  toDodge?: number;
  toBlock?: number;

  // Bauble-specific
  baubleType?: BaubleType;

  // Bonuses (all types)
  statBonuses?: Partial<Record<StatName, number>>;
  combatBonuses?: Partial<Record<CombatStatName, number>>;
  abilities?: GeneratedAbility[];
}
```

---

## Builder Guide

### Creating NPCs with Random Loot

```typescript
import { NPC } from '../../std/npc.js';

export class GoblinChief extends NPC {
  constructor() {
    super();

    // Configure NPC basics
    this.setNPC({
      name: 'Goblin Chief',
      level: 15,
      hp: 150,
      mp: 0,
    });

    this.shortDesc = 'a burly goblin chief';
    this.longDesc = 'This goblin wears a crude crown and carries a wicked blade.';

    // Random loot configuration
    this.setRandomLoot({
      enabled: true,
      itemLevel: 15,
      maxQuality: 'rare',
      dropChance: 60,
      maxDrops: 2,
      allowedTypes: ['weapon', 'armor'],
      allowedWeaponTypes: ['sword', 'axe', 'mace', 'dagger'],
      allowedArmorSlots: ['head', 'chest', 'hands'],
    });
  }
}
```

### Generating Items Programmatically

```typescript
import { getLootDaemon } from '../daemons/loot.js';

// Get the daemon singleton
const lootDaemon = getLootDaemon();

// Generate specific item types
const weapon = await lootDaemon.generateWeapon(20, 'epic');
const armor = await lootDaemon.generateArmor(20, 'rare', 'chest');
const bauble = await lootDaemon.generateBauble(20, 'uncommon');

// Generate random item
const item = await lootDaemon.generateRandomItem(20, 'legendary');

// Move to player
await item.moveTo(player);
```

### Using the LootGenerator Directly

```typescript
import { LootGenerator } from '../std/loot/generator.js';

// Create generator with optional seed (for reproducibility)
const generator = new LootGenerator('my-seed-123');

// Generate item data (not instantiated)
const weaponData = generator.generateWeapon(25, 'epic', 'greatsword');
const armorData = generator.generateArmor(25, 'rare', undefined, 'chest');
const baubleData = generator.generateBauble(25, 'uncommon');

// Create actual item from data
const lootDaemon = getLootDaemon();
const weapon = await lootDaemon.createItem(weaponData);
```

---

## API Reference

### LootDaemon

The central daemon managing random loot generation.

```typescript
import { getLootDaemon, initLootDaemon } from '../daemons/loot.js';

const daemon = getLootDaemon();
```

#### NPC Registration

| Method | Description |
|--------|-------------|
| `registerNPC(path, config)` | Register NPC for random loot |
| `unregisterNPC(path)` | Remove NPC registration |
| `getNPCConfig(path)` | Get NPC's loot configuration |
| `hasRandomLoot(path)` | Check if NPC uses random loot |
| `getRegisteredNPCs()` | Get all registered NPC paths |

#### Item Generation

| Method | Description |
|--------|-------------|
| `generateWeapon(level, maxQuality?, type?, forced?)` | Generate a weapon |
| `generateArmor(level, maxQuality?, slot?, forced?)` | Generate armor |
| `generateBauble(level, maxQuality?, forced?)` | Generate a bauble |
| `generateRandomItem(level, maxQuality?, types?, forced?)` | Generate random item |
| `generateNPCLoot(npc, corpse?)` | Generate loot for NPC death |

#### Item Management

| Method | Description |
|--------|-------------|
| `createItem(data)` | Create item from GeneratedItemData |
| `recreateItem(data)` | Recreate item for persistence |
| `getStats()` | Get registration statistics |

### LootGenerator

Core class for item generation logic.

```typescript
import { LootGenerator, createLootGenerator } from '../std/loot/generator.js';

const generator = new LootGenerator(optionalSeed);
// or
const generator = createLootGenerator(optionalSeed);
```

| Method | Description |
|--------|-------------|
| `getSeed()` | Get the generator's random seed |
| `generateWeapon(level, maxQuality, type?, forced?)` | Generate weapon data |
| `generateArmor(level, maxQuality, type?, slot?, forced?)` | Generate armor data |
| `generateBauble(level, maxQuality, type?, forced?)` | Generate bauble data |
| `generateRandomItem(level, maxQuality, types?, forced?)` | Generate random data |

### Quality Functions

```typescript
import {
  rollQuality,
  getQualityConfig,
  formatItemName,
  forceQuality,
  getQualityColor,
  isQualityAtLeast,
  shouldHaveAbilities,
  getMaxAbilities,
} from '../std/loot/quality.js';
```

| Function | Description |
|----------|-------------|
| `rollQuality(level, max, luck, random)` | Roll for quality tier |
| `getQualityConfig(tier)` | Get tier configuration |
| `formatItemName(name, tier)` | Add quality color codes |
| `forceQuality(target, max)` | Force specific quality |
| `getQualityColor(tier)` | Get color code for tier |
| `isQualityAtLeast(quality, minimum)` | Compare quality tiers |
| `shouldHaveStatBonuses(tier)` | Check if tier has bonuses |
| `shouldHaveAbilities(tier)` | Check if tier has abilities |
| `getMaxAbilities(tier)` | Get max abilities for tier |

### Ability Functions

```typescript
import {
  getAvailableAbilities,
  selectAbilities,
  createAbility,
  getAbilityTemplate,
  formatAbilityDescription,
} from '../std/loot/abilities.js';
```

| Function | Description |
|----------|-------------|
| `getAvailableAbilities(itemType, quality)` | Get valid abilities |
| `selectAbilities(type, quality, level, max, random)` | Select random abilities |
| `createAbility(templateId, level, mag?, chance?)` | Create specific ability |
| `getAbilityTemplate(id)` | Get ability template |
| `formatAbilityDescription(ability)` | Format for display |

### Generated Item Classes

All generated items extend their base classes with additional functionality:

```typescript
import { GeneratedWeapon } from '../std/generated/weapon.js';
import { GeneratedArmor } from '../std/generated/armor.js';
import { GeneratedBauble } from '../std/generated/bauble.js';
```

| Method | Description |
|--------|-------------|
| `getGeneratedItemData()` | Get persistence data |
| `isGenerated()` | Returns true |

---

## Unique Items

The system includes hand-crafted unique items with special powers:

### Unique Weapons

| Name | Type | Level | Special |
|------|------|-------|---------|
| Shadowfang, Blade of the Void | Dagger | 45 | +5 Dex, +3 Luck, +10% crit, Shadow Strike |
| Doombringer, Sledgehammer of Darkness | Warhammer | 48 | +7 Str, +3 Con, +8 dmg, Doom debuff |
| Sunblade, Sword of the Dawn | Longsword | 46 | +4 Str, +4 Cha, Radiant Strike |
| Frostmourne, Blade of the Frozen Throne | Greatsword | 50 | +6 Str, +4 Int, Frozen Strike |

### Unique Armor

| Name | Type | Level | Special |
|------|------|-------|---------|
| Aegis of the Immortal | Tower Shield | 47 | +6 Con, +15 block, Immortal Guard |
| Nightshroud, Cloak of Shadows | Cloak | 44 | +5 Dex, +3 Luck, +12 dodge, Shadow Veil |
| Dragonheart Plate | Plate | 49 | +4 Str, +6 Con, +12 armor, Dragon Scales |

### Unique Baubles

| Name | Type | Level | Special |
|------|------|-------|---------|
| Heart of the Mountain | Gem | 45 | +8 Con, +4 Str |
| Serpent's Eye | Amulet | 43 | +4 Dex, +4 Luck, Venom Touch |
| Luck of the Fool | Ring | 40 | +10 Luck, +2 Cha, +8% crit |

Unique items have a ~1-2% chance to drop when rolling legendary quality.

---

## Best Practices

1. **Balance Item Levels** - Match NPC item levels to their combat level for appropriate drops
2. **Cap Quality Appropriately** - Don't allow legendary drops from low-level monsters
3. **Control Drop Rates** - Use lower dropChance and maxDrops for common monsters
4. **Restrict Types** - Limit allowedTypes for thematic consistency (goblins drop crude weapons, mages drop robes)
5. **Test Persistence** - Verify generated items save and load correctly with `save` and `quit`/`login`
6. **Use Admin Command** - Test item generation with `genloot` before configuring NPCs
