# NPC Behavior System

The Behavior System enables NPCs to make intelligent combat decisions based on their assigned guild/class and behavior mode. NPCs can automatically use skills, heal allies, buff party members, and adapt their playstyle to their combat role.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Combat Roles](#combat-roles)
  - [Behavior Modes](#behavior-modes)
  - [Decision Flow](#decision-flow)
- [Configuration](#configuration)
  - [setBehavior()](#setbehavior)
  - [Configuration Options](#configuration-options)
- [Skills](#skills)
  - [Learning Skills](#learning-skills)
  - [Auto-Learning Skills](#auto-learning-skills)
- [Role-Specific Behavior](#role-specific-behavior)
  - [Healer (Cleric)](#healer-cleric)
  - [Tank (Fighter)](#tank-fighter)
  - [Ranged DPS (Mage)](#ranged-dps-mage)
  - [Melee DPS (Thief)](#melee-dps-thief)
  - [Generic](#generic)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Integration Points](#integration-points)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Behavior System consists of three main components:

1. **BehaviorConfig** - Configuration that defines how an NPC should behave
2. **BehaviorEvaluator** - Scores and evaluates potential actions each combat round
3. **BehaviorDaemon** - Executes the chosen actions through existing game systems

When an NPC with behavior configured enters combat, each heartbeat triggers the behavior system to:
1. Build context about the current situation (health, enemies, allies, available skills)
2. Evaluate all possible actions based on the NPC's role
3. Execute the highest-scored action

---

## Quick Start

Here's the minimal code to create an NPC with intelligent behavior:

```typescript
import { NPC } from '../std/npc.js';

export class MyHealer extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'healer',
      level: 10,
    });

    // Set mana (required for skills)
    this.maxMana = 200;
    this.mana = 200;

    // Configure behavior
    this.setBehavior({
      mode: 'defensive',
      role: 'healer',
      guild: 'cleric',
    });

    // Learn skills
    this.learnSkills([
      'cleric:heal',
      'cleric:bless',
      'cleric:group_heal',
    ], 10);
  }
}
```

---

## Core Concepts

### Combat Roles

Each role has distinct priorities and behavior patterns:

| Role | Guild | Primary Focus | Priorities |
|------|-------|---------------|------------|
| **tank** | Fighter | Protect allies, hold aggro | Taunt > Defensive buffs > Damage |
| **healer** | Cleric | Keep party alive | Self-heal > Critical ally > Heal > Buff > Damage |
| **dps_ranged** | Mage | Deal damage from safety | Self-buff > AoE damage > Single target |
| **dps_melee** | Thief | High burst damage | Stealth > Backstab > Debuff > Damage |
| **generic** | None | Basic combat | Use any available combat skill |

Guild-to-role mapping is automatic:
- `fighter` → `tank`
- `cleric` → `healer`
- `mage` → `dps_ranged`
- `thief` → `dps_melee`

### Behavior Modes

Modes control risk tolerance and self-preservation:

| Mode | Flee Threshold | Description |
|------|----------------|-------------|
| **aggressive** | Never (0%) | Focus on damage, ignore self-preservation |
| **defensive** | 10% HP | Balance damage and survival |
| **wimpy** | 20% HP | Prioritize survival, flee when hurt |

### Decision Flow

Each combat round, the NPC AI follows this process:

```
1. BUILD CONTEXT
   ├── Gather self status (HP%, MP%)
   ├── Identify enemies (from threat table)
   ├── Identify allies (same party)
   ├── Find allies needing healing
   ├── Check available skills (not on cooldown, can afford)
   └── Check missing buffs

2. CHECK FLEE
   └── If health below mode threshold → flee (score: 100)

3. EVALUATE ROLE-SPECIFIC ACTIONS
   ├── Each action gets a score (0-100)
   └── Higher score = better choice

4. EXECUTE BEST ACTION
   ├── Skills → GuildDaemon.useSkill()
   ├── Flee → CombatDaemon.attemptFlee()
   └── Attack → Basic combat round
```

---

## Configuration

### setBehavior()

Configure AI behavior for an NPC:

```typescript
setBehavior(options: {
  mode: BehaviorMode;           // Required: 'aggressive' | 'defensive' | 'wimpy'
  role?: CombatRole;            // Optional: inferred from guild if not set
  guild?: GuildId;              // Optional: 'fighter' | 'mage' | 'thief' | 'cleric'

  // Thresholds (percentages)
  wimpyThreshold?: number;      // Default: 20
  healSelfThreshold?: number;   // Default: 50
  healAllyThreshold?: number;   // Default: 40
  criticalAllyThreshold?: number; // Default: 25
  criticalSelfThreshold?: number; // Default: 25

  // Behavior flags
  willTaunt?: boolean;          // Default: true
  willHealAllies?: boolean;     // Default: true
  willBuffAllies?: boolean;     // Default: true
  willDebuffEnemies?: boolean;  // Default: true
}): void
```

### Configuration Options

#### Thresholds

| Option | Default | Description |
|--------|---------|-------------|
| `wimpyThreshold` | 20 | HP% to trigger flee in wimpy mode |
| `healSelfThreshold` | 50 | HP% to trigger self-healing |
| `healAllyThreshold` | 40 | HP% to trigger ally healing |
| `criticalAllyThreshold` | 25 | HP% considered critical (high priority heal) |
| `criticalSelfThreshold` | 25 | HP% considered critical for self |

#### Behavior Flags

| Flag | Default | Description |
|------|---------|-------------|
| `willTaunt` | true | Tank will taunt enemies off allies |
| `willHealAllies` | true | Healer will heal party members |
| `willBuffAllies` | true | Will cast buffs on allies |
| `willDebuffEnemies` | true | Will use debuffs on enemies |

---

## Skills

NPCs need to learn skills to use them. Unlike players, NPCs don't need to meet prerequisites or pay costs.

### Learning Skills

Use `learnSkills()` to grant specific skills:

```typescript
// Learn specific skills at level 10
this.learnSkills([
  'fighter:bash',
  'fighter:taunt',
  'fighter:defensive_stance',
  'fighter:power_attack',
], 10);

// Learn at different levels
this.learnSkills(['fighter:bash'], 5);
this.learnSkills(['fighter:whirlwind'], 50);
```

The method automatically:
- Adds guild membership if needed (at max guild level 20)
- Updates skill level if learning the same skill at a higher level
- Creates the `guildData` property structure

### Auto-Learning Skills

Use `learnDefaultGuildSkills()` to automatically learn skills based on NPC level:

```typescript
// Configure guild first
this.setBehavior({
  mode: 'aggressive',
  role: 'tank',
  guild: 'fighter',
});

// Learn all skills appropriate for this NPC's level
this.learnDefaultGuildSkills();
```

This maps NPC level to guild level (rough approximation):
- NPC Level 1 → Guild Level 1
- NPC Level 30 → Guild Level 10
- NPC Level 60+ → Guild Level 20

Skill level is set to `floor(npcLevel / 2)`, capped at 50.

---

## Role-Specific Behavior

### Healer (Cleric)

Priority order (highest to lowest score):

| Priority | Condition | Action | Score |
|----------|-----------|--------|-------|
| 1 | Self critical (<25% HP) | Heal self | 95 |
| 2 | Ally critical (<25% HP) | Heal ally | 90 |
| 3 | Self low (<50% HP) | Heal self | 80 |
| 4 | Ally low (<40% HP) | Heal ally | 70 |
| 5 | Multiple allies hurt | Group heal | 65 |
| 6 | Divine shield not active | Cast divine shield | 55 |
| 7 | Ally missing bless | Cast bless | 50 |
| 8 | Enemy alive | Damage skill | 40 |
| 9 | Fallback | Basic attack | 10 |

**Recommended skills:**
- `cleric:heal` - Single target heal
- `cleric:group_heal` - AoE heal
- `cleric:bless` - Accuracy buff
- `cleric:divine_shield` - Self armor buff
- `cleric:turn_undead` or `cleric:holy_smite` - Damage

### Tank (Fighter)

Priority order:

| Priority | Condition | Action | Score |
|----------|-----------|--------|-------|
| 1 | Ally being attacked | Taunt attacker | 95 |
| 2 | Defensive stance not active | Activate stance | 80 |
| 3 | Health <70% | Shield wall | 70 |
| 4 | Multiple enemies | Cleave | 60 |
| 5 | Single target | Power attack/Bash | 50 |
| 6 | Fallback | Basic attack | 10 |

**Recommended skills:**
- `fighter:taunt` - Force enemy to attack you
- `fighter:defensive_stance` - Threat generation buff
- `fighter:shield_wall` - Damage mitigation
- `fighter:cleave` - AoE damage
- `fighter:power_attack` - Single target damage
- `fighter:bash` - Stun + damage

### Ranged DPS (Mage)

Priority order:

| Priority | Condition | Action | Score |
|----------|-----------|--------|-------|
| 1 | Frost armor not active | Cast frost armor | 85 |
| 2 | Mana shield not active | Cast mana shield | 85 |
| 3 | Multiple enemies (2+) | Fireball/Meteor storm | 75 |
| 4 | Single target | Lightning bolt | 60 |
| 5 | Single target | Fire bolt | 55 |
| 6 | Single target | Magic missile | 50 |
| 7 | Fallback | Basic attack | 10 |

**Recommended skills:**
- `mage:frost_armor` - Self armor buff
- `mage:mana_shield` - Damage absorption
- `mage:fireball` or `mage:meteor_storm` - AoE damage
- `mage:lightning` - High single target
- `mage:fire_bolt` - Medium single target
- `mage:magic_missile` - Low cooldown filler

### Melee DPS (Thief)

Priority order:

| Priority | Condition | Action | Score |
|----------|-----------|--------|-------|
| 1 | Hidden + target | Assassinate/Backstab | 90 |
| 2 | Not hidden + have backstab | Hide | 80 |
| 3 | Poison blade not active | Apply poison | 70 |
| 4 | Not hidden + target | Backstab (reduced damage) | 50 |
| 5 | Fallback | Basic attack | 10 |

**Recommended skills:**
- `thief:hide` - Enter stealth
- `thief:backstab` - Stealth strike
- `thief:assassinate` - High damage stealth strike
- `thief:poison_blade` - Damage buff

### Generic

For NPCs without a guild, uses any available combat skill:

| Priority | Condition | Action | Score |
|----------|-----------|--------|-------|
| 1 | Any combat skill | Use skill | 50 |
| 2 | Fallback | Basic attack | 10 |

---

## Examples

### Temple Healer (Defensive Cleric)

```typescript
import { NPC } from '../std/npc.js';

export class TempleHealer extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'temple healer',
      shortDesc: 'a kind temple healer',
      level: 10,
    });

    this.maxMana = 200;
    this.mana = 200;

    this.setBehavior({
      mode: 'defensive',
      role: 'healer',
      guild: 'cleric',
      healSelfThreshold: 60,
      healAllyThreshold: 50,
      criticalAllyThreshold: 30,
    });

    this.learnSkills([
      'cleric:heal',
      'cleric:group_heal',
      'cleric:bless',
      'cleric:divine_shield',
      'cleric:turn_undead',
    ], 10);
  }
}
```

### Elite Guard (Aggressive Tank)

```typescript
import { NPC } from '../std/npc.js';

export class EliteGuard extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'elite guard',
      shortDesc: 'an armored elite guard',
      level: 15,
    });

    this.maxMana = 100;
    this.mana = 100;

    this.setBehavior({
      mode: 'aggressive',
      role: 'tank',
      guild: 'fighter',
      willTaunt: true,
    });

    this.learnSkills([
      'fighter:bash',
      'fighter:defensive_stance',
      'fighter:taunt',
      'fighter:shield_wall',
      'fighter:power_attack',
      'fighter:cleave',
    ], 15);
  }
}
```

### Cowardly Bandit (Wimpy Generic)

```typescript
import { NPC } from '../std/npc.js';

export class CowardlyBandit extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'cowardly bandit',
      level: 5,
    });

    this.setBehavior({
      mode: 'wimpy',
      role: 'generic',
      wimpyThreshold: 25, // Extra cowardly
    });

    // Enable wandering so they can flee
    this.enableWandering();
  }
}
```

### Auto-Learning NPC

```typescript
import { NPC } from '../std/npc.js';

export class GuildSoldier extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'guild soldier',
      level: 20,
    });

    this.maxMana = 100;
    this.mana = 100;

    this.setBehavior({
      mode: 'defensive',
      guild: 'fighter', // Role inferred as 'tank'
    });

    // Automatically learn all fighter skills for level 20
    this.learnDefaultGuildSkills();
  }
}
```

---

## API Reference

### NPC Methods

#### setBehavior(options)

Configure AI behavior for the NPC.

```typescript
setBehavior(options: Partial<BehaviorConfig> & { mode: BehaviorMode; role?: CombatRole }): void
```

#### getBehaviorConfig()

Get the current behavior configuration.

```typescript
getBehaviorConfig(): BehaviorConfig | null
```

#### clearBehavior()

Disable AI behavior.

```typescript
clearBehavior(): void
```

#### learnSkills(skillIds, level)

Learn specific skills.

```typescript
learnSkills(skillIds: string[], level?: number): void
```

#### learnDefaultGuildSkills()

Auto-learn skills based on NPC level and configured guild.

```typescript
learnDefaultGuildSkills(): void
```

### Types

#### BehaviorMode

```typescript
type BehaviorMode = 'aggressive' | 'defensive' | 'wimpy';
```

#### CombatRole

```typescript
type CombatRole = 'tank' | 'healer' | 'dps_melee' | 'dps_ranged' | 'generic';
```

#### BehaviorConfig

```typescript
interface BehaviorConfig {
  mode: BehaviorMode;
  role: CombatRole;
  guild?: GuildId;
  wimpyThreshold: number;
  healSelfThreshold: number;
  healAllyThreshold: number;
  criticalAllyThreshold: number;
  criticalSelfThreshold: number;
  willTaunt: boolean;
  willHealAllies: boolean;
  willBuffAllies: boolean;
  willDebuffEnemies: boolean;
}
```

---

## Integration Points

The Behavior System integrates with several existing systems:

### Guild System

- Uses `GuildDaemon.useSkill()` for skill execution
- Checks `GuildDaemon.isOnCooldown()` for skill availability
- Reads `guildData` property for learned skills

### Combat System

- Uses `CombatDaemon.attemptFlee()` for flee behavior
- Uses `CombatDaemon.initiateCombat()` for targeting
- Reads `combatTarget` and `inCombat` state

### Threat System

- Reads threat table to identify enemies
- Uses `getHighestThreatTarget()` for target selection
- Enemies are defined as livings on the NPC's threat table

### Party System

- Reads `partyId` property to identify allies
- Allies are party members in the same room

### NPC Heartbeat

The behavior system is called from the NPC heartbeat:

```typescript
// In NPC.heartbeat()
if (this.inCombat && this._behaviorConfig) {
  const behaviorDaemon = getBehaviorDaemon();
  await behaviorDaemon.executeAction(this);
}
```

---

## Troubleshooting

### NPC not using skills

1. **Check mana**: Ensure `maxMana` and `mana` are set
   ```typescript
   this.maxMana = 200;
   this.mana = 200;
   ```

2. **Check skills learned**: Verify skills were learned
   ```typescript
   this.learnSkills(['cleric:heal'], 10);
   ```

3. **Check behavior configured**: Ensure `setBehavior()` was called

4. **Check guild data**: The NPC needs the `guildData` property

### NPC not healing allies

1. **Check `willHealAllies`**: Ensure it's not set to `false`
2. **Check party membership**: Allies must be in the same party
3. **Check thresholds**: Ally health must be below `healAllyThreshold`

### NPC not fleeing

1. **Check behavior mode**: Only `defensive` and `wimpy` modes flee
2. **Check `wimpyThreshold`**: Health must be below this percentage
3. **Check wandering**: Enable wandering for flee to work
   ```typescript
   this.enableWandering();
   ```

### NPC not taunting

1. **Check `willTaunt`**: Ensure it's not set to `false`
2. **Check role**: Only `tank` role taunts by default
3. **Check taunt skill**: Must have `fighter:taunt` learned

### Skills on cooldown

Skills have cooldowns defined in their definitions. The NPC will only use skills that:
- Are not on cooldown
- Have enough mana to cast

Check `GuildDaemon.isOnCooldown()` and skill `manaCost` values.

---

## File Locations

| File | Description |
|------|-------------|
| `mudlib/std/behavior/types.ts` | Type definitions |
| `mudlib/std/behavior/evaluator.ts` | Action evaluation logic |
| `mudlib/std/behavior/index.ts` | Barrel export |
| `mudlib/daemons/behavior.ts` | Daemon that executes actions |
| `mudlib/std/npc.ts` | NPC class with behavior methods |
| `mudlib/areas/examples/behavior/` | Example NPCs |

---

## See Also

- [Guild System](./guilds.md) - Guild and skill system documentation
- [Combat System](./combat.md) - Combat mechanics documentation
- [NPC Guide](./npcs.md) - General NPC creation guide
- [Daemons](./daemons.md) - Background service documentation
