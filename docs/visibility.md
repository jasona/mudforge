# Visibility System Documentation

The visibility system provides a layered approach to detecting entities based on visibility levels, perception abilities, and light conditions. It handles everything from sneaking thieves to invisible mages to staff vanishing.

## Table of Contents

- [Overview](#overview)
- [Visibility Levels](#visibility-levels)
- [Perception System](#perception-system)
- [Light and Darkness](#light-and-darkness)
- [Staff Vanish Hierarchy](#staff-vanish-hierarchy)
- [Command Behavior](#command-behavior)
- [Player Commands](#player-commands)
- [Builder Guide: Creating Content](#builder-guide-creating-content)
- [Developer Reference](#developer-reference)

---

## Overview

The visibility system provides:

- **Visibility Levels**: Entities can be NORMAL, OBSCURED, SNEAKING, HIDDEN, INVISIBLE, or STAFF_VANISHED
- **Perception-Based Detection**: Observers use wisdom and modifiers to detect hidden entities
- **Light Mechanics**: Rooms have light levels affecting what players can see and do
- **Carried Light Sources**: Torches and magical items provide light in dark areas
- **Staff Hierarchy**: Vanished staff are only visible to higher-ranked staff
- **Detection Indicators**: Partially visible entities show `{bold}{green}[i]{/}` prefix
- **Command Integration**: All relevant commands respect visibility rules

---

## Visibility Levels

Entities have a visibility level that determines how difficult they are to detect:

| Level | Value | Description | How to Counter |
|-------|-------|-------------|----------------|
| `NORMAL` | 0 | Fully visible to everyone | - |
| `OBSCURED` | 10 | Partially concealed | Alert observer |
| `SNEAKING` | 30 | Moving stealthily (thief skill) | High perception |
| `HIDDEN` | 50 | Stationary and concealed (thief skill) | Detect Hidden buff |
| `INVISIBLE` | 70 | Magically invisible (mage spell) | See Invisible buff |
| `STAFF_VANISHED` | 100 | Builder+ staff invisibility | Higher rank staff only |

### How Visibility Works

An observer can detect a target if:

```
effectivePerception > targetVisibilityLevel
```

Special cases:
- **See Invisible** buff bypasses the INVISIBLE level entirely
- **Staff Vanished** uses a separate hierarchy check (see below)
- **Partial Detection**: If perception is within 20 points of the threshold, the target is "partially visible" and shows with an `[i]` indicator

---

## Perception System

### Base Perception Formula

```
effectivePerception = (wisdom × 2) + modifiers + lightBonus
```

| Component | Source | Example |
|-----------|--------|---------|
| **Wisdom** | Character stat × 2 | WIS 15 = 30 base |
| **Modifiers** | Effects and buffs | Detect Hidden +30, Alertness +20 |
| **Light Bonus** | Light sources | -10 (dark) to +10 (bright) |

### Perception Modifiers

These buffs affect perception:

| Effect | Modifier | Duration | Source |
|--------|----------|----------|--------|
| Detect Hidden | +30 | 5 min | Thief skill, potions |
| Alertness | +20 | 3 min | Warrior skill |
| See Invisible | Bypasses INVISIBLE | 5 min | Mage spell, potions |

### Light Bonus

Carried and room light affects perception:

| Light Level | Perception Bonus |
|-------------|------------------|
| Pitch Black (0) | -10 |
| Very Dark (20) | -5 |
| Dim (40) | 0 |
| Normal (60) | +5 |
| Bright (80) | +10 |
| Blinding (100) | +10 |

---

## Light and Darkness

### Room Light Levels

Rooms have a base light level that affects visibility:

| Level | Value | Description |
|-------|-------|-------------|
| `PITCH_BLACK` | 0 | No natural light, torches required |
| `VERY_DARK` | 20 | Minimal light, hard to see |
| `DIM` | 40 | Low light, minimum for sight |
| `NORMAL` | 60 | Standard lighting (default) |
| `BRIGHT` | 80 | Well-lit, good visibility |
| `BLINDING` | 100 | Extremely bright |

### Minimum Light to See

Players need at least **DIM (40)** effective light to see in a room. Effective light is calculated as:

```
effectiveLight = roomLight + carriedLight + droppedLightSources
```

### Darkness Effects

When a player cannot see (effective light < 40):

| Action | Behavior |
|--------|----------|
| `look` | Shows "You can't see anything in this darkness. Perhaps you need some light?" |
| `glance` | Shows "Darkness [You can't see the exits]" |
| `kill` | Blocked: "It's too dark! You can't see who to attack." |
| `get` (room) | Blocked: "It's too dark! You can't see what to pick up." |
| `get` (inventory container) | **Allowed** - can access by feel |
| `look <inventory item>` | **Allowed** - can examine by feel |
| `look <room item>` | Blocked: "It's too dark to see anything in the room." |
| Movement | **Allowed** - can move blind, but no exits shown |

### Light Sources

Items can be configured as light sources that illuminate dark areas:

| Property | Description |
|----------|-------------|
| `isLightSource` | Whether the item provides light |
| `lightRadius` | Amount of light provided (0-50) |
| `fuelRemaining` | Fuel in milliseconds (-1 = infinite) |
| `activeWhenDropped` | Whether it lights room when dropped |

**Example light sources:**
- Torch: lightRadius 30, provides enough to see in VERY_DARK rooms
- Lantern: lightRadius 40, can illuminate even PITCH_BLACK areas
- Glowing gem: lightRadius 20, dim magical light

---

## Staff Vanish Hierarchy

Staff members (Builder and above) can use the `vanish` command to become invisible. Unlike regular invisibility, staff vanish follows a strict hierarchy.

### Permission Levels

| Level | Value | Role |
|-------|-------|------|
| Player | 0 | Regular players |
| Builder | 1 | Content creators |
| Senior Builder | 2 | Senior staff |
| Administrator | 3 | Full admin access |

### Visibility Rules

A vanished staff member is only visible to staff of **strictly higher** rank:

| Vanished Staff | Visible To |
|----------------|------------|
| Administrator (3) | Nobody (highest rank) |
| Senior Builder (2) | Administrators only |
| Builder (1) | Senior Builders and Administrators |

**Key points:**
- Staff of **equal rank** cannot see each other when vanished
- Players never see vanished staff
- The `vanish` command toggles visibility on/off

### Vanish Command

```
> vanish       - Toggle staff invisibility
> vis          - Alias for vanish
```

**When vanishing:**
```
You fade from view.
```

**When appearing:**
```
You fade into view.
[Room sees: Acer fades into view.]
```

---

## Command Behavior

### Communication Commands

Commands respect visibility for both sender and recipient:

| Command | Behavior |
|---------|----------|
| `say` | If listener can't see speaker: "Someone says: ..." |
| `say` | If listener CAN see invisible speaker: "Name says: ..." (normal) |
| `tell` | Cannot tell invisible players (treated as offline) |
| `remote` | Cannot remote to players who can't see you |
| Channel messages | Per-recipient: invisible senders show as "Someone" |

### Information Commands

| Command | Behavior |
|---------|----------|
| `who` | Only shows players you can see; invisible indicator `[i]` for partial visibility |
| `finger` | Invisible players shown as "offline" |
| `look` (room) | Only shows entities you can detect |
| `score` | Shows your current visibility status |
| `buffs` | Shows visibility-related effects with duration |

### Combat Commands

| Command | Behavior |
|---------|----------|
| `kill` | Cannot attack targets you can't see |
| `kill` | Blocked entirely in darkness |

---

## Player Commands

### Checking Visibility Status

The `score` command shows your current visibility level:

```
> score
...
Visibility: Normal
```

Possible statuses:
- **Normal** - Fully visible
- **Obscured** - Partially concealed
- **Sneaking** - Moving stealthily
- **Hidden** - Concealed and stationary
- **Invisible** - Magically invisible
- **Vanished** - Staff invisibility (staff only)

### Viewing Visibility Effects

The `buffs` command shows active visibility-related effects:

```
> buffs

=== Active Effects ===

Buffs:
  Invisibility (Invisible) - 4:32 remaining
  See Invisible (Can see invisible) - 2:15 remaining

2 active effects (2 buffs, 0 debuffs)
```

### Detection Indicator

When you can partially see someone (e.g., high perception detecting a sneaking thief), their name appears with an indicator:

```
You see:
  {bold}{green}[i]{/} a shadowy figure
  a goblin warrior
```

The `[i]` indicates you've detected someone who is trying to hide.

---

## Builder Guide: Creating Content

### Creating Light Source Items

```typescript
import { Item } from '../../std/item.js';

export class Torch extends Item {
  constructor() {
    super();
    this.setItem({
      shortDesc: 'a burning torch',
      longDesc: 'A wooden torch wrapped with oil-soaked rags.',
      size: 'small',
      value: 5,
    });

    this.addId('torch');

    // Configure as light source
    this.setLightSource({
      lightRadius: 30,          // Light intensity (0-50)
      fuelRemaining: 3600000,   // 1 hour in milliseconds (-1 = infinite)
      activeWhenDropped: true,  // Lights room when on ground
    });
  }
}
```

### Creating Dark Rooms

```typescript
import { Room } from '../../std/room.js';
import { LightLevel } from '../../std/visibility/types.js';

export class DarkCave extends Room {
  constructor() {
    super();
    this.setRoom({
      shortDesc: 'A Dark Cave',
      longDesc: 'The cave stretches into impenetrable darkness...',
    });

    // Set room light level
    this.lightLevel = LightLevel.PITCH_BLACK; // Requires torch to see
  }
}
```

### Light Level Recommendations

| Room Type | Recommended Light |
|-----------|-------------------|
| Outdoor day | NORMAL or BRIGHT |
| Indoor with windows | NORMAL |
| Torchlit dungeon | DIM |
| Deep cave | VERY_DARK |
| Sealed tomb | PITCH_BLACK |
| Magical darkness | PITCH_BLACK |

### Creating Visibility Effects

Use the `Effects` factory to create visibility-related effects:

```typescript
import { Effects } from '../../std/combat/effects.js';

// Thief hide effect (stationary concealment)
const hideEffect = Effects.hide(300000, 50); // 5 min, skill level 50

// Thief sneak effect (moving concealment)
const sneakEffect = Effects.sneak(60000, 40); // 1 min, skill level 40

// Mage invisibility spell
const invisEffect = Effects.invisibility(300000, 70); // 5 min, power 70

// See Invisible buff (potion or spell)
const seeInvisEffect = Effects.seeInvisible(300000); // 5 min

// Detect Hidden buff (perception boost)
const detectEffect = Effects.detectHidden(300000, 30); // 5 min, +30 perception
```

### Creating a See Invisibility Potion

```typescript
import { Item } from '../../std/item.js';
import { Effects } from '../../std/combat/effects.js';
import type { Living } from '../../std/living.js';

export class PotionSeeInvisibility extends Item {
  constructor() {
    super();
    this.setItem({
      shortDesc: 'a shimmering potion',
      longDesc: 'An iridescent liquid that shifts between blue and violet.',
      size: 'tiny',
      value: 150,
    });

    this.addId('potion');
    this.addId('see invisibility potion');
  }

  drink(drinker: Living): boolean {
    drinker.addEffect(Effects.seeInvisible(300000)); // 5 minutes
    drinker.receive('{cyan}Your vision sharpens. Hidden things reveal themselves.{/}\n');

    // Destroy potion after use
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.destruct(this);
    }
    return true;
  }
}
```

### Guild Skills with Visibility

When defining guild skills that affect visibility:

```typescript
// Thief hide skill
{
  id: 'thief:hide',
  name: 'Hide',
  description: 'Conceal yourself in shadows.',
  type: 'stealth',
  guild: 'thief',
  guildLevelRequired: 5,
  manaCost: 10,
  cooldown: 30000,
  effect: {
    baseMagnitude: 30,         // Base visibility level
    magnitudePerLevel: 0.4,    // +0.4 per skill level
    duration: 300000,          // 5 minutes
    effectType: 'hide',        // Creates hide effect
  },
}

// Mage invisibility spell
{
  id: 'mage:invisibility',
  name: 'Invisibility',
  description: 'Become invisible to the naked eye.',
  type: 'stealth',
  guild: 'mage',
  guildLevelRequired: 15,
  manaCost: 40,
  cooldown: 120000,
  effect: {
    baseMagnitude: 70,
    magnitudePerLevel: 0.3,
    duration: 300000,
    effectType: 'invisibility',
  },
}
```

---

## Developer Reference

### Visibility Types

```typescript
// Visibility levels (higher = harder to detect)
enum VisibilityLevel {
  NORMAL = 0,
  OBSCURED = 10,
  SNEAKING = 30,
  HIDDEN = 50,
  INVISIBLE = 70,
  STAFF_VANISHED = 100,
}

// Light levels
enum LightLevel {
  PITCH_BLACK = 0,
  VERY_DARK = 20,
  DIM = 40,
  NORMAL = 60,
  BRIGHT = 80,
  BLINDING = 100,
}

// Permission levels for staff hierarchy
enum PermissionLevel {
  PLAYER = 0,
  BUILDER = 1,
  SENIOR_BUILDER = 2,
  ADMINISTRATOR = 3,
}
```

### Core Interfaces

```typescript
interface VisibilityState {
  level: VisibilityLevel;
  isStaffVanished: boolean;
  staffRank: PermissionLevel;
}

interface PerceptionState {
  base: number;           // wisdom × 2
  modifiers: number;      // from effects
  canSeeInvisible: boolean;
  lightBonus: number;
  total: number;
}

interface VisibilityCheckResult {
  canSee: boolean;
  isPartiallyVisible: boolean;
  reason: string;
}

interface LightSourceConfig {
  lightRadius: number;
  fuelRemaining: number;
  activeWhenDropped: boolean;
}
```

### Core Functions

```typescript
// Main visibility check
function canSee(
  viewer: Living,
  target: Living,
  room?: Room
): VisibilityCheckResult;

// Check if viewer can see in a room (darkness check)
function canSeeInRoom(
  viewer: Living,
  room?: Room
): { canSee: boolean; effectiveLight: number; reason: string };

// Get darkness message
function getDarknessMessage(): string;

// Get target's visibility state
function getVisibilityState(target: Living): VisibilityState;

// Calculate viewer's perception
function getPerceptionState(viewer: Living, room?: Room): PerceptionState;

// Calculate light from carried items
function calculateCarriedLight(living: Living): number;

// Calculate room's effective light
function calculateRoomLight(room: Room): number;

// Check staff vanish hierarchy
function checkStaffVisibility(
  viewer: Living,
  target: Living
): VisibilityCheckResult;

// Format name with [i] indicator
function formatVisibleName(
  name: string,
  isPartiallyVisible: boolean
): string;
```

### Living Methods

```typescript
class Living {
  /** Check if this living can see another */
  canSee(target: Living): VisibilityCheckResult;

  /** Get all visible beings in the room */
  getVisibleBeings(): Living[];

  /** Get current visibility level from effects */
  getVisibilityLevel(): VisibilityLevel;
}
```

### Player Methods

```typescript
class Player extends Living {
  /** Whether player is staff vanished */
  isStaffVanished: boolean;

  /** Toggle staff vanish (builder+ only) */
  vanish(): boolean;
}
```

### Item Light Source Methods

```typescript
class Item {
  /** Whether this item is a light source */
  isLightSource: boolean;

  /** Light intensity (0-50) */
  lightRadius: number;

  /** Remaining fuel in ms (-1 = infinite) */
  fuelRemaining: number;

  /** Whether it provides light when dropped */
  activeWhenDropped: boolean;

  /** Configure as light source */
  setLightSource(config: LightSourceConfig): void;
}
```

### Room Light Properties

```typescript
class Room {
  /** Base light level of the room */
  lightLevel: LightLevel;  // Default: LightLevel.NORMAL (60)
}
```

### Effect Types

The following effect types are used for visibility:

| Effect Type | Description |
|-------------|-------------|
| `stealth` | Generic stealth effect (hide/sneak) |
| `invisibility` | Magical invisibility |
| `see_invisible` | Ability to see invisible entities |
| `detect_hidden` | Perception boost for detecting hidden |

### Files

| File | Purpose |
|------|---------|
| `mudlib/std/visibility/types.ts` | Enums, interfaces, constants |
| `mudlib/std/visibility/index.ts` | Core visibility functions |
| `mudlib/std/living.ts` | canSee(), getVisibleBeings(), getVisibilityLevel() |
| `mudlib/std/player.ts` | vanish(), isStaffVanished |
| `mudlib/std/item.ts` | Light source properties |
| `mudlib/std/room.ts` | lightLevel, darkness in getFullDescription() |
| `mudlib/std/combat/effects.ts` | Visibility effect factories |
| `mudlib/cmds/builder/_vanish.ts` | Staff vanish command |
| `mudlib/cmds/player/_look.ts` | Darkness and visibility checks |
| `mudlib/cmds/player/_glance.ts` | Darkness display |
| `mudlib/cmds/player/_who.ts` | Visibility filtering |
| `mudlib/cmds/player/_score.ts` | Visibility status display |
| `mudlib/cmds/player/_buffs.ts` | Visibility effect display |
| `mudlib/daemons/channels.ts` | Per-recipient visibility |

---

## Examples

### Dark Dungeon with Light Sources

```typescript
import { Room } from '../../std/room.js';
import { LightLevel } from '../../std/visibility/types.js';

export class DungeonDepths extends Room {
  constructor() {
    super();
    this.setRoom({
      shortDesc: 'The Depths',
      longDesc: `The passage descends into absolute darkness. The air is cold
and damp, and strange sounds echo from unseen corners. Without
a light source, navigation here would be nearly impossible.`,
    });

    this.lightLevel = LightLevel.PITCH_BLACK;

    this.setExits({
      up: '/areas/dungeon/upper_level',
      north: '/areas/dungeon/hidden_chamber',
    });
  }
}
```

### NPC That Detects Sneaking Players

```typescript
import { NPC, Living, Room } from '../../lib/std.js';
import { canSee } from '../../std/visibility/index.js';

export class AlertGuard extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'an alert guard',
      shortDesc: 'an alert guard',
      wisdom: 18,  // High wisdom for perception
    });
  }

  override async onEnter(who: Living, from?: Room): Promise<void> {
    const room = this.environment as Room;
    const visCheck = canSee(this, who, room);

    if (visCheck.canSee) {
      if (visCheck.isPartiallyVisible) {
        // Detected a sneaking intruder
        this.say('Halt! I can see you lurking in the shadows!');
      } else {
        this.say('State your business, traveler.');
      }
    }
    // If can't see, guard doesn't notice the player
  }
}
```

### Room That Grants See Invisible

```typescript
import { Room, Living } from '../../lib/std.js';
import { Effects } from '../../std/combat/effects.js';

export class OraclesChamber extends Room {
  constructor() {
    super();
    this.setRoom({
      shortDesc: "The Oracle's Chamber",
      longDesc: 'Mystical energies swirl through this sacred space.',
    });
  }

  override async onEnter(who: Living, from?: Room): Promise<void> {
    // Grant temporary see invisible
    who.addEffect(Effects.seeInvisible(60000)); // 1 minute
    who.receive('{cyan}The mystical energies sharpen your vision.{/}\n');
    who.receive('{cyan}You can now perceive the invisible.{/}\n');
  }
}
```

### Checking Visibility Before Action

```typescript
import { canSee } from '../../std/visibility/index.js';
import type { Living } from '../../std/living.js';
import type { Room } from '../../std/room.js';

function attemptPickpocket(thief: Living, target: Living): boolean {
  const room = thief.environment as Room;

  // Check if target can see the thief
  const visCheck = canSee(target, thief, room);

  if (!visCheck.canSee) {
    // Target can't see thief - automatic success chance bonus
    return performPickpocket(thief, target, 0.3); // +30% success
  } else if (visCheck.isPartiallyVisible) {
    // Target partially sees thief - normal difficulty
    return performPickpocket(thief, target, 0);
  } else {
    // Target fully sees thief - action is obvious
    target.receive(`${thief.name} tries to reach for your belongings!\n`);
    return false;
  }
}
```

### Merchant Only Visible to See Invisible

```typescript
import { Merchant } from '../../std/merchant.js';
import { Effects } from '../../std/combat/effects.js';

export class GhostMerchant extends Merchant {
  constructor() {
    super();
    this.setMerchant({
      name: 'a spectral merchant',
      shopName: 'Ethereal Wares',
    });

    // This merchant is permanently invisible
    this.addEffect(Effects.invisibility(Infinity, 70));
  }

  // Players need See Invisible to interact with this merchant
}
```
