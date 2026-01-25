# Trainers

Trainers are specialized NPCs that help players improve their characters by training levels and stats in exchange for experience points.

## Overview

Trainers can offer:
- **Level Training**: Increase player level, gaining max health and mana
- **Stat Training**: Increase individual attributes (strength, intelligence, etc.)

## Using Trainers

### Finding a Trainer

Trainers are NPCs located in specific rooms. Use the `train` command when in the same room as a trainer.

### Training Commands

```
train                    # Show training options
train level              # Level up (costs XP)
train <stat>             # Train a specific stat
train str                # Short form (str, int, wis, etc.)
```

### Stat Abbreviations

| Full Name | Abbreviation |
|-----------|--------------|
| strength | str |
| intelligence | int |
| wisdom | wis |
| charisma | cha |
| dexterity | dex |
| constitution | con |
| luck | luk |

## Training Costs

### Level Up Cost

```
Cost = nextLevel² × 100 × costMultiplier
```

| Level | XP Cost |
|-------|---------|
| 1 → 2 | 400 |
| 10 → 11 | 12,100 |
| 25 → 26 | 67,600 |
| 50 → 51 | 260,100 |

**Level-up benefits:**
- +10 Max Health
- +5 Max Mana

### Stat Training Cost

```
Cost = currentStat × 50 × (1.02 ^ currentStat) × costMultiplier
```

| Current Stat | XP Cost |
|--------------|---------|
| 10 → 11 | ~610 |
| 30 → 31 | ~2,730 |
| 50 → 51 | ~6,725 |
| 70 → 71 | ~16,565 |
| 90 → 91 | ~40,805 |

Stat costs grow exponentially, making high stats progressively more expensive.

## Training Restrictions

### Stat Level Cap

Regular players cannot train stats higher than their current level:
- Level 10 player: Max stat = 10
- Level 30 player: Max stat = 30
- Level 50 player: Max stat = 50

**Exceptions:**
- Builders and above can train stats up to 100 regardless of level

### Maximum Stat

The hard cap for all stats is 100.

## Trainable Stats

All seven core stats can be trained:

| Stat | Effects |
|------|---------|
| **Strength** | Physical damage, carry capacity |
| **Dexterity** | Accuracy, dodge, stealth |
| **Constitution** | Health pool, resistance |
| **Intelligence** | Magic power, mana pool |
| **Wisdom** | Perception, magic resistance, mana regen |
| **Charisma** | Prices, social influence |
| **Luck** | Critical hits, rare drops |

Individual trainers may only offer a subset of stats.

## Training Menu

When you use the `train` command, you'll see a menu like:

```
=== Training with Master Vorn ===
Your XP: 15,000

Level Up (Level 11 → 12): 14,400 XP [AVAILABLE]
Train Strength (12 → 13): 720 XP [AVAILABLE]
Train Dexterity (10 → 11): 610 XP [AVAILABLE]
Train Constitution (8 → 9): 475 XP [AVAILABLE]

Type: train level, train str, train dex, train con
```

Color coding:
- **Green**: Can afford
- **Dim**: Cannot afford or unavailable
- **Yellow**: At level cap warning
- **Magenta**: Already at maximum (100)

## Creating Trainer NPCs (Builders)

### Basic Trainer

```typescript
import { Trainer } from '../../../std/trainer.js';

export class CombatTrainer extends Trainer {
  constructor() {
    super();

    this.shortDesc = 'a combat trainer';
    this.longDesc = 'A grizzled warrior stands ready to train...';
    this.name = 'Master Vorn';
    this.gender = 'male';

    this.setLevel(25, 'normal');

    this.setTrainerConfig({
      canTrainLevel: true,
      trainableStats: ['strength', 'dexterity', 'constitution'],
      costMultiplier: 1.0,
      greeting: 'Ready to grow stronger, adventurer?'
    });
  }
}
```

### Trainer Configuration

```typescript
interface TrainerConfig {
  canTrainLevel?: boolean;       // Can train levels (default: true)
  trainableStats?: StatName[];   // Which stats (default: all)
  costMultiplier?: number;       // Cost scaling (default: 1.0)
  greeting?: string;             // Custom greeting
}
```

### Specialized Trainers

**Combat Trainer** (physical stats):
```typescript
this.setTrainerConfig({
  trainableStats: ['strength', 'dexterity', 'constitution'],
  greeting: 'Let us hone your combat skills!'
});
```

**Magic Trainer** (mental stats):
```typescript
this.setTrainerConfig({
  trainableStats: ['intelligence', 'wisdom'],
  greeting: 'The arcane arts await your study.'
});
```

**Level-Only Trainer**:
```typescript
this.setTrainerConfig({
  canTrainLevel: true,
  trainableStats: [],  // No stats, only levels
  greeting: 'I can help you advance in experience.'
});
```

**Expensive Trainer**:
```typescript
this.setTrainerConfig({
  costMultiplier: 1.5,  // 50% more expensive
  greeting: 'My training is elite, and priced accordingly.'
});
```

**Cheap Trainer**:
```typescript
this.setTrainerConfig({
  costMultiplier: 0.5,  // Half price
  greeting: 'I offer affordable training for new adventurers.'
});
```

## Trainer Methods

### Configuration Methods

```typescript
setTrainerConfig(config: TrainerConfig): void
```

### Capability Checks

```typescript
trainer.canTrainLevel              // Can this trainer train levels?
trainer.trainableStats             // Array of trainable stats
trainer.costMultiplier             // Cost multiplier (1.0 = normal)
trainer.canTrainStat('strength')   // Can trainer teach this stat?
```

### Player Eligibility

```typescript
trainer.canPlayerTrainStat(player, 'strength')
// Returns: { canTrain: boolean, reason?: string }

trainer.getMaxTrainableStat(player)
// Returns: Maximum stat value player can train to
```

### Cost Calculation

```typescript
trainer.calculateLevelCost(currentLevel)
// Returns: XP cost to level up

trainer.calculateStatCost(currentStat)
// Returns: XP cost to raise stat by 1
```

### Training Actions

```typescript
trainer.trainLevel(player)         // Attempt level up
trainer.trainStat(player, 'str')   // Attempt stat training
trainer.showTrainingOptions(player) // Display menu
```

## Tips

1. **Save XP for levels**: Level-ups are generally more cost-effective early on
2. **Focus stats**: Specialize rather than spreading stats thin
3. **Check level cap**: You can't train stats above your level (except builders)
4. **Find cheap trainers**: Some trainers have lower cost multipliers
5. **Bank your gold**: Trainers cost XP, not gold - save gold for equipment
