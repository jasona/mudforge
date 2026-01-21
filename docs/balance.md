# Game Balance Framework

This document outlines the game balance systems, recommended ranges, and scaling guidelines for MudForge.

## Current System Summary

| System | Current Value | Notes |
|--------|---------------|-------|
| **Stat Range** | 1-50 | Default start: varies by race |
| **Stat Training Cost** | `stat * 50 XP` | Exponentially expensive |
| **Player Level XP** | `level² × 100` | Quadratic scaling |
| **Guild Max Level** | 10 | Per guild, max 3 guilds |
| **Combat Round** | 3 seconds base | 1-5 second range |
| **Racial Bonuses** | -2 to +3 | Net zero or slight negative |
| **Hit Chance** | 5%-95% | Clamped |
| **Crit Chance** | 0%-50% | Base 5% |
| **Dodge Chance** | 0%-50% | DEX-based |

---

## Player Levels: 1-50

| Level Range | Tier | Content Focus |
|-------------|------|---------------|
| 1-10 | Novice | Tutorial, starter areas, learning mechanics |
| 11-20 | Journeyman | Main storylines, guild advancement |
| 21-35 | Veteran | Challenging content, rare equipment |
| 36-50 | Master | End-game, legendary quests, raids |

### XP Requirements

The current formula (`level² × 100`) provides good quadratic scaling:

| Level | XP Required | Cumulative |
|-------|-------------|------------|
| 2 | 400 | 400 |
| 5 | 2,500 | 5,500 |
| 10 | 10,000 | 38,500 |
| 20 | 40,000 | 285,000 |
| 30 | 90,000 | 895,000 |
| 40 | 160,000 | 2,185,000 |
| 50 | 250,000 | 4,292,500 |

### Level-Up Bonuses

Per level gained:
- Max Health: +10
- Current Health: +10
- Max Mana: +5
- Current Mana: +5
- Stats: Must be trained manually with XP

---

## NPC Levels: 1-60

NPCs can exceed player max by 10 levels to provide aspirational challenge content.

| NPC Level | Relation to Players | Purpose |
|-----------|---------------------|---------|
| 1-10 | At or below novice players | Starter mobs, training |
| 11-25 | Matches journeyman players | Standard content |
| 26-40 | Challenging for veterans | Dungeon bosses, elite mobs |
| 41-55 | Group content required | Raid bosses, world bosses |
| 56-60 | Legendary/Event only | Special encounters |

### NPC XP Rewards

Base XP is modified by level difference:
- NPC higher level: `baseXP * (1 + levelDiff * 0.10)` (bonus)
- NPC lower level: `baseXP * max(0.1, 1 + levelDiff * 0.15)` (reduced)

Example: Level 5 NPC (50 base XP) killed by level 3 player = `50 * 1.2 = 60 XP`

---

## Stats: Recommended Ranges

### Stat Tiers

| Stat Level | Value Range | Who Has This |
|------------|-------------|--------------|
| Weak | 1-7 | Penalized racial stats, untrained |
| Average | 8-12 | Starting characters, common NPCs |
| Trained | 13-18 | Mid-level players, skilled NPCs |
| Expert | 19-25 | High-level players, elite NPCs |
| Legendary | 26-35 | End-game players with gear, bosses |
| Godlike | 36-50 | Theoretical max with all buffs |

### Stat Effects

| Stat | Combat Effect | Other Effects |
|------|---------------|---------------|
| STR | `+(STR-10)/2` physical damage | Carry capacity: `50 + STR*5` lbs |
| INT | `+(INT-10)/2` magic damage | Mana pool scaling |
| WIS | Magic resistance | Mana regeneration |
| DEX | `+(DEX-10)*2` hit/dodge chance | Attack speed, stealth |
| CON | - | Health pool scaling |
| CHA | - | Shop prices, NPC reactions |
| LUK | `+LUK/5` crit chance | Rare drops, random events |

### Recommended MAX_STAT: 50

**Rationale**:
- Current formula `(STR-10)/2` means STR 100 = +45 damage bonus, which trivializes content
- With max 50: STR 50 = +20 damage bonus, more balanced
- Makes racial bonuses (+3 max) meaningful (~10% boost at start, ~6% at end)

### Stat Training Costs

Formula: `currentStatValue * 50 XP`

| From | To | Cost |
|------|-----|------|
| 10 | 11 | 500 XP |
| 15 | 16 | 750 XP |
| 20 | 21 | 1,000 XP |
| 30 | 31 | 1,500 XP |
| 40 | 41 | 2,000 XP |
| 49 | 50 | 2,450 XP |

---

## Racial Bonuses

All playable races have stat modifiers that sum to zero or slightly negative.

| Race | STR | DEX | CON | INT | WIS | CHA | LUK | Net |
|------|-----|-----|-----|-----|-----|-----|-----|-----|
| Human | - | - | - | - | - | - | - | 0 |
| Elf | - | +2 | -1 | +1 | - | - | - | +2 |
| Dwarf | +1 | - | +2 | - | - | -1 | - | +2 |
| Orc | +3 | - | +1 | -2 | - | -1 | - | +1 |
| Halfling | -2 | +2 | - | - | - | - | +2 | +2 |
| Gnome | -2 | - | - | +2 | +1 | - | - | +1 |
| Tiefling | - | - | - | +1 | -1 | +2 | - | +2 |
| Dragonborn | +2 | -1 | - | - | - | +1 | - | +2 |

### Latent Racial Abilities

| Ability | Effect |
|---------|--------|
| Night Vision | See in darkness as dim light |
| Infravision | See heat signatures in complete darkness |
| Poison Resistance | 50% less poison damage |
| Magic Resistance | 25% less magical damage |
| Fire Resistance | 50% less fire damage |
| Natural Armor | +2 armor class |
| Fast Healing | 25% faster regeneration |
| Natural Stealth | +5 stealth bonus |
| Keen Senses | +10 perception bonus |

---

## Skills and Spells: 5-Level System

### Skill Level Requirements

| Skill Level | Mastery | Guild Level Required |
|-------------|---------|---------------------|
| 1 | Novice | Guild level 1 |
| 2 | Apprentice | Guild level 3 |
| 3 | Journeyman | Guild level 5 |
| 4 | Expert | Guild level 7 |
| 5 | Master | Guild level 10 |

### Guild System

- Maximum guilds per player: 3
- Maximum guild level: 10
- Guild XP scales quadratically per level

### Example Spell Scaling: Fireball

| Level | Damage | Mana Cost | Cooldown |
|-------|--------|-----------|----------|
| 1 | 10-15 | 15 | 6 sec |
| 2 | 15-22 | 20 | 5 sec |
| 3 | 22-32 | 28 | 4 sec |
| 4 | 32-45 | 38 | 3 sec |
| 5 | 45-60 | 50 | 2 sec |

### Example Skill Scaling: Backstab (Thief)

| Level | Damage Multiplier | Stealth Requirement |
|-------|-------------------|---------------------|
| 1 | 1.5x | Must be hidden |
| 2 | 2.0x | Must be hidden |
| 3 | 2.5x | Must be hidden |
| 4 | 3.0x | Hidden or flanking |
| 5 | 4.0x | Hidden or flanking |

---

## Buffs and Debuffs

### Magnitude Guidelines

| Effect Type | Weak | Moderate | Strong | Legendary |
|-------------|------|----------|--------|-----------|
| Stat Modifier | ±1-2 | ±3-5 | ±6-8 | ±10-15 |
| Combat Modifier | ±5% | ±10-15% | ±20-25% | ±30-40% |
| DoT/HoT (per tick) | 2-5 | 6-12 | 15-25 | 30-50 |
| Damage Shield | 20-50 | 60-100 | 120-200 | 250-400 |
| Resistance | 10% | 25% | 50% | 75% (cap) |

### Duration Guidelines

| Duration | Use Case |
|----------|----------|
| 10-30 sec | Combat abilities, short buffs |
| 1-5 min | Standard buffs, potions |
| 10-30 min | Long-duration buffs, food |
| Permanent | Racial abilities, equipment |

### Stacking Rules

- Maximum stacks: 3-5 for stackable effects
- Same-source buffs: Refresh duration, don't stack
- Different-source buffs: Stack up to cap
- Debuff immunity: Brief window after expiration (optional)

### Effect Types

| Type | Description |
|------|-------------|
| stat_modifier | Modifies core stats (STR, DEX, etc.) |
| combat_modifier | Modifies toHit, toCritical, toDodge, etc. |
| damage_over_time | Periodic damage (poison, burn) |
| heal_over_time | Periodic healing |
| damage_shield | Absorbs incoming damage |
| thorns | Reflects damage to attackers |
| stun | Cannot attack this round |
| slow | Reduced attack speed |
| haste | Increased attack speed |
| invulnerable | Cannot take damage |
| stealth | Visibility reduction |
| invisibility | True invisibility |

---

## Weapon Tiers

| Tier | Level Range | Damage Range | Example |
|------|-------------|--------------|---------|
| Starter | 1-5 | 2-6 | Rusty Sword |
| Common | 5-15 | 5-12 | Iron Sword |
| Uncommon | 10-25 | 8-18 | Steel Sword |
| Rare | 20-35 | 12-25 | Mithril Blade |
| Epic | 30-45 | 18-35 | Flamebrand |
| Legendary | 40-50 | 25-50 | Dragonslayer |

### Weapon Properties

| Property | Effect |
|----------|--------|
| Two-Handed | +50% damage, -20% attack speed |
| Light | Can be dual-wielded |
| Heavy | Slower attack speed, higher damage |
| Fast | Faster attack speed, lower damage |

### Damage Types

- **Slashing**: Swords, axes - reduced by armor
- **Piercing**: Daggers, spears - partial armor bypass
- **Bludgeoning**: Hammers, maces - effective vs. armored
- **Magic**: Spells - ignores physical armor, blocked by magic resistance

---

## Armor Tiers

| Tier | Level Range | Armor Value | Typical Reduction |
|------|-------------|-------------|-------------------|
| Cloth | 1-50 | 0-3 | ~5-10% |
| Leather | 5-50 | 2-8 | ~10-20% |
| Chain | 15-50 | 5-15 | ~20-35% |
| Plate | 25-50 | 10-25 | ~35-50% |

### Armor Slots

| Slot | Typical Armor Contribution |
|------|---------------------------|
| Head | 10-15% of total |
| Chest | 35-40% of total |
| Hands | 5-10% of total |
| Legs | 20-25% of total |
| Feet | 10-15% of total |
| Shield | 15-20% of total |

### Total Armor Cap

Recommended cap: **40-50 armor**

This prevents damage immunity while allowing heavy armor builds to feel tanky.

### Damage Reduction Formula

```
finalDamage = max(1, baseDamage - totalArmor)
```

Minimum damage is always 1 to prevent complete immunity.

---

## Combat Math Examples

### Level 10 Player vs Level 10 NPC (Fair Fight)

**Player Stats**:
- STR: 12
- Weapon: Steel Sword (6-12 damage)
- No buffs

**Damage Calculation**:
- Base: 6-12
- STR bonus: `(12-10)/2 = +1`
- Total: 7-13 damage

**NPC Stats**:
- HP: 50
- Armor: 3

**Effective Damage**: 4-10 per hit
**Hits to Kill**: 5-12 hits
**Result**: Fair, engaging fight

---

### Level 30 Player vs Level 35 Elite (Challenging)

**Player Stats**:
- STR: 22
- Weapon: Mithril Blade (12-25 damage)
- Buff: +5 damage

**Damage Calculation**:
- Base: 12-25
- STR bonus: `(22-10)/2 = +6`
- Buff: +5
- Total: 23-36 damage

**Elite NPC Stats**:
- HP: 400
- Armor: 15

**Effective Damage**: 8-21 per hit
**Hits to Kill**: 19-50 hits
**Result**: Challenging fight requiring skill

---

### Level 50 Player vs Level 55 Boss (Group Content)

**Player Stats**:
- STR: 35
- Weapon: Legendary (25-50 damage)
- Party buffs: +15 damage

**Damage Calculation**:
- Base: 25-50
- STR bonus: `(35-10)/2 = +12`
- Buffs: +15
- Total: 52-77 damage

**Boss Stats**:
- HP: 2000
- Armor: 30
- Heals periodically

**Effective Damage**: 22-47 per hit
**Hits to Kill**: 42-90 hits (before healing)
**Result**: Requires group coordination, multiple players

---

## Encumbrance System

### Weight Thresholds

| Level | % of Max Carry | Penalties |
|-------|----------------|-----------|
| None | 0-74% | No penalties |
| Light | 75-99% | -10% attack speed |
| Medium | 100-124% | -25% attack speed, -10% dodge |
| Heavy | 125%+ | -50% attack speed, -25% dodge, cannot pick up |

### Carry Capacity Formula

```
maxCarry = 50 + (STR * 5) pounds
```

| STR | Max Carry |
|-----|-----------|
| 10 | 100 lbs |
| 15 | 125 lbs |
| 20 | 150 lbs |
| 30 | 200 lbs |
| 50 | 300 lbs |

---

## Combat Timing

### Round Duration

- Base round time: 3000ms (3 seconds)
- Minimum: 1000ms (1 second)
- Maximum: 5000ms (5 seconds)

### Speed Formula

```
roundTime = BASE_ROUND_TIME / max(0.5, 1 + attackSpeed + weaponSpeed)
          - ((DEX - 10) / 5) * 100ms
          + encumbrancePenalty
```

### Hit Chance Formula

```
hitChance = 75 + toHit + (ATK_DEX - 10) * 2 + (ATK_LUCK / 10)
          - toDodge - (DEF_DEX - 10) * 2
```

Clamped to 5%-95%

### Critical Chance Formula

```
critChance = 5 + toCritical + (LUCK / 5)
```

Clamped to 0%-50%

---

## Recommended Code Constants

```typescript
// Player limits
const MAX_PLAYER_LEVEL = 50;
const MAX_STAT = 50;
const MAX_GUILDS = 3;
const MAX_GUILD_LEVEL = 10;
const MAX_SKILL_LEVEL = 5;

// Combat limits
const MIN_HIT_CHANCE = 5;
const MAX_HIT_CHANCE = 95;
const MIN_CRIT_CHANCE = 0;
const MAX_CRIT_CHANCE = 50;
const MIN_DODGE_CHANCE = 0;
const MAX_DODGE_CHANCE = 50;
const MAX_ARMOR = 50;

// Buff limits
const MAX_BUFF_STACKS = 5;
const MAX_RESISTANCE = 75;

// Combat timing
const BASE_ROUND_TIME = 3000;
const MIN_ROUND_TIME = 1000;
const MAX_ROUND_TIME = 5000;
```

---

## Balance Testing Checklist

When adding new content, verify:

- [ ] Weapon damage falls within tier guidelines
- [ ] Armor values fall within tier guidelines
- [ ] NPC HP/level matches intended difficulty
- [ ] Skill effects scale appropriately with level
- [ ] Buff magnitudes don't exceed guidelines
- [ ] XP rewards feel appropriate for effort
- [ ] Gold drops match economy expectations
- [ ] Content is achievable at intended level range

---

## Auto-Balance Formulas

The game provides auto-balance methods for quickly setting up NPCs and equipment with appropriate stats based on level.

### NPC Auto-Balance (`setLevel`)

Use `npc.setLevel(level, type)` to automatically configure an NPC's stats based on level.

| Property | Formula | Example (Level 20) |
|----------|---------|-------------------|
| HP | `50 + level × 15` | 350 HP |
| Stats | `8 + floor(level / 5)` | 12 all stats |
| Base XP | `level × 10` | 200 XP |
| Gold Min | `level × 2` | 40 gold |
| Gold Max | `level × 5` | 100 gold |
| Damage Min | `floor(level / 2)` | 10 |
| Damage Max | `level` | 20 |

**NPC Type Multipliers:**

| Type | HP | Damage | XP | Gold |
|------|-----|--------|-----|------|
| Normal | 1.0× | 1.0× | 1.0× | 1.0× |
| Miniboss | 1.5× | 1.15× | 1.5× | 1.5× |
| Elite | 2.0× | 1.25× | 2.0× | 2.0× |
| Boss | 3.0× | 1.5× | 5.0× | 5.0× |

**Usage Example:**

```typescript
const goblin = new NPC();
goblin.setLevel(10);           // Normal level 10 goblin
goblin.setLevel(10, 'elite');  // Elite level 10 goblin (2x HP, etc.)
goblin.setLevel(30, 'boss');   // Boss level 30 (3x HP, etc.)
```

### Weapon Auto-Balance (`setItemLevel`)

Use `weapon.setItemLevel(level)` to automatically configure a weapon's damage and value.

| Property | Formula | Adjustment |
|----------|---------|------------|
| Min Damage | `2 + level × 0.5` | Two-handed: ×1.5, Light: ×0.75 |
| Max Damage | `4 + level` | Two-handed: ×1.5, Light: ×0.75 |
| Value | `level × 15` | - |

**Usage Example:**

```typescript
const sword = new Weapon();
sword.handedness = 'one_handed';
sword.setItemLevel(15);  // 9-19 damage, 225 gold value

const dagger = new Weapon();
dagger.handedness = 'light';
dagger.setItemLevel(15);  // 7-14 damage, 225 gold value

const greatsword = new Weapon();
greatsword.handedness = 'two_handed';
greatsword.setItemLevel(15);  // 14-28 damage, 225 gold value
```

### Armor Auto-Balance (`setItemLevel`)

Use `armor.setItemLevel(level)` to automatically configure armor value and gold value based on slot.

| Property | Formula |
|----------|---------|
| Base Armor | `1 + floor(level / 3)` |
| Final Armor | `baseArmor × slotMultiplier` |
| Value | `level × 10 × valueMultiplier` |

**Slot Multipliers:**

| Slot | Armor | Value |
|------|-------|-------|
| Chest | 100% | 150% |
| Head | 60% | 100% |
| Legs | 75% | 100% |
| Hands | 40% | 50% |
| Feet | 50% | 50% |
| Shield | 60% | 100% |
| Cloak | 30% | 100% |

**Usage Example:**

```typescript
const chestplate = new Armor();
chestplate.slot = 'chest';
chestplate.setItemLevel(15);  // 6 armor, 225 gold value

const helmet = new Armor();
helmet.slot = 'head';
helmet.setItemLevel(15);  // 4 armor, 150 gold value

const gloves = new Armor();
gloves.slot = 'hands';
gloves.setItemLevel(15);  // 2 armor, 75 gold value
```

### Effect Magnitude Caps

All effects are clamped to prevent balance-breaking values:

| Effect Type | Maximum Magnitude |
|-------------|-------------------|
| Stat Modifier | ±15 per effect |
| Combat Modifier | ±40% per effect |
| Damage/Heal over Time | 50 per tick |
| Buff Stacks | 5 maximum |
| Resistance | 75% maximum |
