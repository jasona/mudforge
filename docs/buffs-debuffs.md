# Buffs & Debuffs System Documentation

The buffs and debuffs system provides temporary effects that modify player and NPC stats, combat abilities, and other attributes for a limited duration.

## Table of Contents

- [Overview](#overview)
- [Player Commands](#player-commands)
- [Effect Types](#effect-types)
- [Effect Properties](#effect-properties)
- [Effect Categories](#effect-categories)
- [Expiration Notifications](#expiration-notifications)
- [Sources of Effects](#sources-of-effects)
- [Builder Guide: Creating Effects](#builder-guide-creating-effects)
- [Developer Reference](#developer-reference)

---

## Overview

The effect system allows for:

- **Temporary Stat Modifications**: Boost or reduce strength, dexterity, intelligence, etc.
- **Combat Stat Modifiers**: Affect accuracy, evasion, critical chance, attack speed, armor
- **Damage Over Time (DoT)**: Poison, burn, bleed effects that deal periodic damage
- **Healing Over Time (HoT)**: Regeneration effects that restore HP periodically
- **Special Effects**: Stuns, invulnerability, damage shields, thorns
- **Stacking**: Some effects can stack multiple times for increased potency
- **Source Tracking**: Effects remember who/what applied them

---

## Player Commands

### Viewing Active Effects

Use the `buffs` command to see all active effects on your character:

```
> buffs              - Show all active buffs and debuffs
> effects            - Alias for buffs
> debuffs            - Alias for buffs
```

**Example Output:**
```
=== Active Effects ===

Buffs:
  Bless (+12 toHit) - 4:32 remaining
  Regeneration (+5 HP/tick) - 1:15 remaining

Debuffs:
  Poison (4 poison dmg/tick) - 0:08 remaining

3 active effects (2 buffs, 1 debuff)
Use 'buffs detail' for more information.
```

### Detailed View

Use `buffs detail` for extended information including sources and stack counts:

```
> buffs detail
> buffs d
```

**Example Output:**
```
=== Active Effects ===

Buffs:
  Bless
    Effect: +12 toHit
    Time remaining: 4:32
    Source: Aria the Cleric

Debuffs:
  Poison
    Effect: 4 poison dmg/tick
    Time remaining: 0:08
    Stacks: 2/5
    Source: Giant Spider

2 active effects (1 buff, 1 debuff)
```

---

## Effect Types

The system supports the following effect types:

| Type | Description | Example |
|------|-------------|---------|
| `stat_modifier` | Modifies a core stat (STR, DEX, INT, etc.) | +5 Strength |
| `combat_modifier` | Modifies a combat stat | +10 toHit |
| `damage_over_time` | Deals periodic damage | 5 poison dmg/tick |
| `heal_over_time` | Restores HP periodically | +10 HP/tick |
| `haste` | Increases attack speed | +30% speed |
| `slow` | Decreases attack speed | -20% speed |
| `stun` | Prevents attacking | Cannot attack |
| `invulnerable` | Immune to all damage | Immune to damage |
| `damage_shield` | Absorbs incoming damage | 50 absorption |
| `thorns` | Reflects damage to attackers | Reflect 5 damage |

### Core Stats (StatName)

Effects can modify these core stats:
- `strength` - Physical power, melee damage
- `dexterity` - Agility, accuracy, evasion
- `constitution` - Health, stamina
- `intelligence` - Magic power, mana pool
- `wisdom` - Magic resistance, perception
- `charisma` - Social interactions, prices
- `luck` - Critical chance, loot quality

### Combat Stats (CombatStatName)

Effects can modify these combat stats:
- `toHit` - Accuracy bonus (added to hit rolls)
- `toCritical` - Critical hit chance (percentage, 0-100)
- `toBlock` - Block chance (percentage, requires shield)
- `toDodge` - Dodge/evasion chance (percentage)
- `attackSpeed` - Attack speed modifier (1.0 = normal)
- `damageBonus` - Flat damage bonus to all attacks
- `armorBonus` - Armor class bonus (damage reduction)

---

## Effect Properties

Every effect has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the effect |
| `name` | string | Display name shown to players |
| `type` | EffectType | The effect type (see above) |
| `duration` | number | Remaining duration in milliseconds |
| `magnitude` | number | Effect strength/power |
| `category` | EffectCategory | 'buff', 'debuff', or 'neutral' |
| `description` | string | Short description for display |

### Optional Properties

| Property | Type | Description |
|----------|------|-------------|
| `source` | Living | Who/what applied the effect |
| `stat` | StatName | For stat_modifier: which stat to modify |
| `combatStat` | CombatStatName | For combat_modifier: which combat stat |
| `tickInterval` | number | For DoT/HoT: ms between ticks |
| `nextTick` | number | For DoT/HoT: ms until next tick |
| `damageType` | DamageType | For DoT: type of damage dealt |
| `stacks` | number | Current stack count |
| `maxStacks` | number | Maximum allowed stacks |
| `hidden` | boolean | If true, not shown in buffs command |

---

## Effect Categories

Effects are categorized for display purposes:

| Category | Color | Description |
|----------|-------|-------------|
| `buff` | Green | Beneficial effects (stat boosts, heals, speed) |
| `debuff` | Red | Harmful effects (stat reductions, DoTs, slows) |
| `neutral` | Yellow | Neither beneficial nor harmful |

Categories are determined automatically based on effect type and magnitude, but can be explicitly set.

---

## Expiration Notifications

When effects expire, players receive color-coded notifications:

- **Buffs expiring** (yellow): Warning that a beneficial effect ended
  ```
  {yellow}Bless has worn off.{/}
  ```

- **Debuffs expiring** (green): Good news that a harmful effect ended
  ```
  {green}Poison has worn off.{/}
  ```

Hidden effects (`hidden: true`) do not generate expiration notifications.

---

## Sources of Effects

Effects can come from many sources:

### Guild Skills & Spells

```
> bless              - Cleric buff spell (+toHit)
> haste              - Speed increase
> poison             - Thief DoT ability
```

### Combat

- Monster special attacks (poison bites, fire breath)
- Critical hit effects
- Weapon enchantments

### Items

- Potions (temporary stat boosts)
- Enchanted equipment (passive effects)
- Scrolls and wands

### Environment

- Area effects (magical zones)
- Traps (poison darts, fire traps)
- Blessings from shrines

---

## Builder Guide: Creating Effects

### Using Effect Factories

The `Effects` factory provides convenient methods for creating common effects:

```typescript
import { Effects, EffectDurations } from '../std/combat/effects.js';

// Damage over time effects
const poison = Effects.poison(30000, 5);           // 30s, 5 dmg/tick
const burn = Effects.burn(15000, 8);               // 15s, 8 fire dmg/tick
const bleed = Effects.bleed(20000, 4);             // 20s, 4 bleed dmg/tick

// Healing over time
const regen = Effects.regeneration(60000, 10);     // 60s, +10 HP/tick

// Stat modifiers
const strBuff = Effects.strengthBuff(30000, 5);    // 30s, +5 STR
const dexBuff = Effects.dexterityBuff(30000, 5);   // 30s, +5 DEX
const intBuff = Effects.intelligenceBuff(30000, 5); // 30s, +5 INT
const conBuff = Effects.constitutionBuff(30000, 5); // 30s, +5 CON

// Combat modifiers
const accuracy = Effects.accuracy(30000, 10);      // 30s, +10 toHit
const evasion = Effects.evasion(30000, 10);        // 30s, +10 toDodge
const critBuff = Effects.criticalChance(30000, 5); // 30s, +5% crit
const armorBuff = Effects.armorBonus(30000, 10);   // 30s, +10 armor
const dmgBuff = Effects.damageBonus(30000, 5);     // 30s, +5 damage

// Speed modifiers
const haste = Effects.haste(20000, 0.3);           // 20s, +30% speed
const slow = Effects.slow(10000, 0.2);             // 10s, -20% speed

// Special effects
const stun = Effects.stun(3000);                   // 3s stun
const invuln = Effects.invulnerable(5000);         // 5s invulnerability
const thorns = Effects.thorns(30000, 5);           // 30s, reflect 5 dmg
const shield = Effects.damageShield(100);          // 100 damage absorption

// Debuffs
const weakness = Effects.weakness(15000, 3);       // 15s, -3 STR
```

### Generic Factory Methods

For more control, use the generic methods:

```typescript
// Generic stat buff/debuff
const customStatBuff = Effects.statBuff('wisdom', 8, 60000, 'Divine Wisdom');
const customStatDebuff = Effects.statDebuff('strength', 5, 30000, 'Curse of Weakness');

// Generic combat stat buff/debuff
const customCombatBuff = Effects.combatBuff('toCritical', 10, 30000, 'Eagle Eye');
const customCombatDebuff = Effects.combatDebuff('toDodge', 15, 20000, 'Entangle');

// Fully custom effect
const custom = Effects.custom({
  name: 'Arcane Shield',
  type: 'damage_shield',
  duration: 60000,
  magnitude: 50,
  category: 'buff',
  description: '50 damage absorption',
});
```

### Common Durations

Use the `EffectDurations` constants for consistency:

```typescript
import { EffectDurations } from '../std/combat/effects.js';

EffectDurations.veryShort  // 5 seconds (5000ms)
EffectDurations.short      // 10 seconds (10000ms)
EffectDurations.medium     // 30 seconds (30000ms)
EffectDurations.long       // 1 minute (60000ms)
EffectDurations.veryLong   // 2 minutes (120000ms)
EffectDurations.extended   // 5 minutes (300000ms)
EffectDurations.permanent  // 10 minutes (600000ms)
```

### Applying Effects to Living Entities

```typescript
// Apply an effect
target.addEffect(Effects.poison(30000, 5));

// Check for specific effect
if (target.hasEffect('poison')) {
  // ...
}

// Remove an effect by ID
target.removeEffect('poison_12345');

// Get all effects
const effects = target.getEffects();

// Check for effect type
const isStunned = target.hasEffectType('stun');
const isPoisoned = target.hasEffectType('damage_over_time');
```

### Creating Buff Skills

When defining guild skills that apply buffs:

```typescript
// In your guild skill definitions
{
  id: 'cleric:bless',
  name: 'Bless',
  description: 'Bless a target, increasing their accuracy.',
  type: 'buff',              // Routes to executeBuffSkill()
  target: 'single',
  guild: 'cleric',
  guildLevelRequired: 3,
  manaCost: 15,
  cooldown: 30000,
  maxLevel: 50,
  learnCost: 200,
  advanceCostPerLevel: 40,
  effect: {
    baseMagnitude: 10,       // Base bonus
    magnitudePerLevel: 0.5,  // Scales with skill level
    combatStatModifier: 'toHit',  // Which stat to modify
    duration: 300000,        // 5 minutes
  },
  useVerb: 'bless',
  useMessage: 'You bless $T with divine favor!',
}
```

The system automatically:
- Creates the effect with proper category ('buff' or 'debuff')
- Generates a description based on magnitude and stat
- Tracks the source (caster)
- Handles expiration notifications

### Creating Debuff Skills

```typescript
{
  id: 'thief:poison_blade',
  name: 'Poison Blade',
  description: 'Coat your blade with poison, dealing damage over time.',
  type: 'debuff',            // Routes to executeDebuffSkill()
  target: 'single',
  guild: 'thief',
  guildLevelRequired: 5,
  manaCost: 20,
  cooldown: 15000,
  effect: {
    baseMagnitude: 3,
    magnitudePerLevel: 0.2,
    tickInterval: 2000,      // Damage every 2 seconds
    damageType: 'poison',
    duration: 20000,
  },
  useVerb: 'poison',
}
```

---

## Developer Reference

### Effect Interface

```typescript
interface Effect {
  /** Unique effect ID */
  id: string;
  /** Display name */
  name: string;
  /** Effect type */
  type: EffectType;
  /** Remaining duration in milliseconds */
  duration: number;
  /** Effect strength/magnitude */
  magnitude: number;

  /** Tick interval for DoT/HoT effects */
  tickInterval?: number;
  /** Time until next tick */
  nextTick?: number;
  /** Who applied this effect */
  source?: Living;
  /** Current stack count */
  stacks?: number;
  /** Maximum stacks */
  maxStacks?: number;

  /** Stat modification (for stat_modifier type) */
  stat?: StatName;
  /** Combat stat modification (for combat_modifier type) */
  combatStat?: CombatStatName;
  /** Damage type for DoT effects */
  damageType?: DamageType;

  /** Effect category for display (buff/debuff/neutral) */
  category?: EffectCategory;
  /** Short description for display */
  description?: string;
  /** If true, effect is hidden from the buffs command */
  hidden?: boolean;

  /** Custom tick callback */
  onTick?: (target: Living, effect: Effect) => void;
  /** Called when effect expires */
  onExpire?: (target: Living, effect: Effect) => void;
  /** Called when effect is removed early */
  onRemove?: (target: Living, effect: Effect) => void;
}
```

### Living Methods

```typescript
class Living {
  /** Add an effect to this entity */
  addEffect(effect: Effect): void;

  /** Remove an effect by ID */
  removeEffect(effectId: string): boolean;

  /** Check if entity has a specific effect */
  hasEffect(effectId: string): boolean;

  /** Check if entity has any effect of a given type */
  hasEffectType(type: EffectType): boolean;

  /** Get all active effects */
  getEffects(): Effect[];

  /** Get a specific effect by ID */
  getEffect(effectId: string): Effect | undefined;

  /** Process effect ticks (called by heartbeat) */
  tickEffects(deltaMs: number): void;
}
```

### Effect Processing

Effects are processed every heartbeat (2 seconds):

1. **Duration Countdown**: All effect durations are reduced
2. **Tick Processing**: DoT/HoT effects deal damage or heal when `nextTick` reaches 0
3. **Stack Handling**: Reapplying stackable effects increases stack count
4. **Expiration**: Effects with duration <= 0 are removed and trigger notifications
5. **Stat Recalculation**: Modified stats are recalculated after effect changes

### Files

| File | Purpose |
|------|---------|
| `mudlib/std/combat/types.ts` | Effect interface and type definitions |
| `mudlib/std/combat/effects.ts` | Effect factory functions |
| `mudlib/std/living.ts` | Effect management on Living entities |
| `mudlib/cmds/player/_buffs.ts` | Player buffs command |
| `mudlib/daemons/guild.ts` | Buff/debuff skill execution |

---

## Examples

### Monster with Poison Attack

```typescript
// In an NPC definition
specialAttack(target: Living): void {
  if (Math.random() < 0.3) { // 30% chance
    const poison = Effects.poison(20000, 4);
    poison.source = this;
    target.addEffect(poison);
    target.receive('{green}The spider bites you, injecting venom!{/}\n');
  }
}
```

### Healing Potion Item

```typescript
// In a potion item
use(player: Living): void {
  // Instant heal
  player.heal(30);

  // Plus regeneration buff
  player.addEffect(Effects.regeneration(30000, 5));
  player.receive('{cyan}You drink the potion and feel revitalized!{/}\n');

  this.destroy(); // Consume the potion
}
```

### Environmental Effect

```typescript
// In a room with magical properties
onEnter(who: Living): void {
  // Apply blessing when entering sacred ground
  const blessing = Effects.custom({
    name: 'Sacred Ground',
    type: 'heal_over_time',
    duration: 60000,
    magnitude: 2,
    tickInterval: 5000,
    category: 'buff',
    description: '+2 HP every 5s',
    hidden: false,
  });
  who.addEffect(blessing);
  who.receive('{yellow}You feel the blessing of this sacred place.{/}\n');
}
```

### Stacking DoT Effect

```typescript
// Poison that stacks up to 5 times
const poison = Effects.poison(15000, 3, 2000, 5);
// First application: 3 damage per tick
target.addEffect(poison);
// Second application: 6 damage per tick (2 stacks)
target.addEffect(Effects.poison(15000, 3, 2000, 5));
// Duration refreshes, stacks increase, damage increases
```
