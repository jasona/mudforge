# Object Shadow System

The shadow system allows objects to temporarily "overlay" other objects, intercepting property access and method calls without permanently modifying the target. This enables powerful transformation effects like shapeshifting, possession, disguises, curses, and polymorph spells.

## Table of Contents

- [Overview](#overview)
- [Use Cases](#use-cases)
- [Architecture](#architecture)
- [Creating Shadows](#creating-shadows)
- [Shadowable Properties](#shadowable-properties)
- [Shadowable Methods](#shadowable-methods)
- [Shadow Lifecycle](#shadow-lifecycle)
- [Priority and Stacking](#priority-and-stacking)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Overview

The shadow system is implemented at the **driver level**, making it completely transparent to mudlib code. When a shadow is attached to an object:

1. Shadow-aware property getters are installed on the target object
2. Shadow-aware method wrappers are installed for shadowable methods
3. Any code accessing these properties/methods automatically gets shadowed values
4. No mudlib code changes are needed - existing code works seamlessly

When the last shadow is removed, the original property descriptors are restored.

---

## Use Cases

| Effect | Description |
|--------|-------------|
| **Shapeshifting** | Werewolf, vampire, or animal transformations that change appearance and abilities |
| **Possession** | Another entity temporarily controls a body, changing name and behavior |
| **Disguises** | Appear as someone or something else |
| **Curses** | Alter stats, appearance, or behavior as a debuff |
| **Polymorph** | Transform into different creatures with different attacks |
| **Buffs** | Temporary enhancements that modify display or combat |
| **Illusions** | Make objects or characters appear differently to observers |

---

## Architecture

### Driver-Level Interception

The shadow system uses two mechanisms for transparent interception:

1. **Property Descriptors**: When a shadow is attached, `Object.defineProperty` installs shadow-aware getters directly on the target object instance. These getters check shadows first, then fall back to the original prototype getter.

2. **Method Wrappers**: For shadowable methods, wrapper functions are installed on the target that check shadows before calling the original method. Methods can be added even if they don't exist on the original object.

### Why This Approach?

- **Zero mudlib changes required** - existing code works without modification
- **Transparent interception** - any code accessing `player.name` automatically gets shadowed value
- **Works for internal access** - `this.name` inside methods also gets shadowed values
- **Clean separation** - shadow logic lives in driver, not scattered across mudlib

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Shadow Attachment                        │
├─────────────────────────────────────────────────────────────┤
│  1. efuns.addShadow(target, shadow)                         │
│  2. ShadowRegistry stores shadow, sorted by priority        │
│  3. installShadowDescriptors() called on target             │
│  4. Property getters & method wrappers installed            │
│  5. shadow.onAttach(target) lifecycle hook called           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Property/Method Access                    │
├─────────────────────────────────────────────────────────────┤
│  1. Code accesses target.name or target.getNaturalAttack()  │
│  2. Shadow-aware getter/wrapper intercepts                  │
│  3. Checks each shadow in priority order (highest first)    │
│  4. Returns first defined shadow value, or original         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Shadow Removal                           │
├─────────────────────────────────────────────────────────────┤
│  1. efuns.removeShadow(target, shadow)                      │
│  2. shadow.onDetach(target) lifecycle hook called           │
│  3. Shadow removed from registry                            │
│  4. If last shadow: restoreShadowDescriptors() called       │
│  5. Original property behavior restored                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Creating Shadows

### Basic Structure

Shadows extend the `Shadow` base class from `mudlib/std/shadow.ts`:

```typescript
import { Shadow } from '../std/shadow.js';
import type { MudObject } from '../std/object.js';

export class MyShadow extends Shadow {
  constructor() {
    super('my_shadow_type'); // Unique type identifier
    this.priority = 50;      // Higher = checked first (default: 0)
  }

  // Override properties with getters
  get name(): string {
    return 'Shadowed Name';
  }

  get shortDesc(): string {
    return 'a shadowed entity';
  }

  // Override methods
  getDisplayName(): string {
    return 'The Shadowed One';
  }

  // Lifecycle hooks
  async onAttach(target: MudObject): Promise<void> {
    // Called when shadow is attached
  }

  async onDetach(target: MudObject): Promise<void> {
    // Called when shadow is removed
  }
}
```

### Attaching and Removing Shadows

```typescript
// Create and attach a shadow
const shadow = new MyShadow();
const result = await efuns.addShadow(player, shadow);

if (result.success) {
  player.receive('You have been transformed!');
} else {
  player.receive(`Transformation failed: ${result.error}`);
}

// Remove the shadow
await efuns.removeShadow(player, shadow);
// Or by shadow ID:
await efuns.removeShadow(player, shadow.shadowId);

// Clear all shadows
await efuns.clearShadows(player);
```

### Accessing Original Values

Inside a shadow, use `getOriginal()` to access the target's original values:

```typescript
get name(): string {
  const originalName = this.getOriginal<string>('_name') || 'someone';
  return `${originalName} the Transformed`;
}

get longDesc(): string {
  const originalName = this.getOriginal<string>('_name') || 'someone';
  return `This was once ${originalName}, but now appears completely different.`;
}
```

---

## Shadowable Properties

The following properties can be shadowed. Define them as getters in your shadow class:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | The living's name (used in messages, combat, etc.) |
| `title` | `string` | The living's title (displayed after name) |
| `shortDesc` | `string` | Short description (shown in room, inventory) |
| `longDesc` | `string` | Long description (shown when examined) |
| `enterMessage` | `string` | Message template when entering a room |
| `exitMessage` | `string` | Message template when leaving a room |

### Movement Message Tokens

The `enterMessage` and `exitMessage` properties support these tokens:

| Token | Description |
|-------|-------------|
| `$N` | Capitalized name |
| `$n` | Lowercase name |
| `$D` | Direction (e.g., "north", "the east") |

**Example:**
```typescript
get exitMessage(): string {
  return '$N prowls $D, claws clicking on the ground.';
}

get enterMessage(): string {
  return 'A fearsome werewolf prowls in from $D.';
}
```

---

## Shadowable Methods

The following methods can be shadowed. Define them as regular methods in your shadow class:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getDisplayName` | `() => string` | Returns the display name (used in various UI contexts) |
| `getNaturalAttack` | `() => NaturalAttack` | Returns natural attack for unarmed combat |

### Natural Attack Structure

```typescript
interface NaturalAttack {
  name: string;        // Weapon name (e.g., "fangs", "claws")
  damageType: DamageType; // 'slashing', 'piercing', 'bludgeoning', etc.
  hitVerb: string;     // Verb when attack hits (e.g., "bites", "claws")
  missVerb: string;    // Verb when attack misses (e.g., "snaps at")
  damageBonus?: number; // Optional bonus damage
  weight?: number;     // Weight for random selection (default: 1)
}
```

**Example:**
```typescript
getNaturalAttack(): NaturalAttack {
  const attacks = [
    { name: 'claws', damageType: 'slashing', hitVerb: 'slashes', missVerb: 'swipes at', weight: 2 },
    { name: 'fangs', damageType: 'piercing', hitVerb: 'bites', missVerb: 'snaps at', weight: 1 },
  ];

  // Weighted random selection
  const totalWeight = attacks.reduce((sum, a) => sum + (a.weight || 1), 0);
  let random = Math.random() * totalWeight;

  for (const attack of attacks) {
    random -= attack.weight || 1;
    if (random <= 0) return attack;
  }

  return attacks[0];
}
```

---

## Shadow Lifecycle

### Lifecycle Hooks

| Hook | When Called | Use Case |
|------|-------------|----------|
| `onAttach(target)` | After shadow is attached | Apply stat modifiers, send messages, start timers |
| `onDetach(target)` | Before shadow is removed | Remove stat modifiers, send messages, cleanup |

### Auto-Expiration

Shadows can automatically expire after a duration:

```typescript
export class TimedShadow extends Shadow {
  private _calloutId: number | null = null;

  constructor(durationMs: number) {
    super('timed_effect');
    this._durationMs = durationMs;
  }

  async onAttach(target: MudObject): Promise<void> {
    // Set up auto-expiration
    if (this._durationMs > 0) {
      this._calloutId = efuns.callOut(() => this.remove(), this._durationMs);
    }
  }

  async onDetach(target: MudObject): Promise<void> {
    // Cancel timer if still pending
    if (this._calloutId !== null) {
      efuns.removeCallOut(this._calloutId);
      this._calloutId = null;
    }
  }
}
```

### Shadow Base Class Helpers

The `Shadow` base class provides these helper methods:

| Method | Description |
|--------|-------------|
| `getOriginal<T>(property)` | Get original value from target (use `'_name'` for private fields) |
| `remove()` | Remove this shadow from its target |
| `disable()` | Temporarily disable this shadow (keeps it attached but inactive) |
| `enable()` | Re-enable a disabled shadow |

---

## Priority and Stacking

### Priority System

Multiple shadows can be attached to the same object. Priority determines which shadow's value is used:

- **Higher priority = checked first**
- Default priority is `0`
- First shadow with a defined value wins
- If no shadow defines a value, the original is used

```typescript
// High priority shadow (checked first)
class UrgentShadow extends Shadow {
  constructor() {
    super('urgent');
    this.priority = 100; // High priority
  }
}

// Low priority shadow (fallback)
class SubtleShadow extends Shadow {
  constructor() {
    super('subtle');
    this.priority = 10; // Low priority
  }
}
```

### Stacking Example

```
Target: Player "Alice"
├── WerewolfShadow (priority: 100)
│   └── name: "Alice the Werewolf"
│   └── shortDesc: "a fearsome werewolf"
├── DisguiseShadow (priority: 50)
│   └── name: "Bob"  (ignored - lower priority)
│   └── title: "the Mysterious"  (used - werewolf doesn't define title)
└── Original Object
    └── name: "Alice"  (ignored - shadows override)
    └── title: "the Brave"  (ignored - disguise overrides)

Result:
- name: "Alice the Werewolf" (from WerewolfShadow)
- title: "the Mysterious" (from DisguiseShadow)
- shortDesc: "a fearsome werewolf" (from WerewolfShadow)
```

---

## API Reference

### Efuns

```typescript
// Attach a shadow to an object
efuns.addShadow(target: MudObject, shadow: Shadow): Promise<AddShadowResult>
// Returns: { success: true } or { success: false, error: string }

// Remove a shadow from an object
efuns.removeShadow(target: MudObject, shadowOrId: Shadow | string): Promise<boolean>

// Get all shadows on an object
efuns.getShadows(objectId: string): Shadow[]

// Find a specific shadow by type
efuns.findShadow(target: MudObject, shadowType: string): Shadow | undefined

// Check if an object has any shadows
efuns.hasShadows(target: MudObject): boolean

// Remove all shadows from an object
efuns.clearShadows(target: MudObject): Promise<void>

// Get the original unwrapped object from a proxy
efuns.getOriginalObject(objectOrProxy: MudObject): MudObject

// Get shadow system statistics
efuns.getShadowStats(): {
  totalShadowedObjects: number;
  totalShadows: number;
  cachedProxies: number;
  shadowsByType: Record<string, number>;
}
```

### Shadow Base Class

```typescript
class Shadow {
  shadowId: string;        // Unique ID (auto-generated)
  shadowType: string;      // Type identifier (set in constructor)
  priority: number;        // Priority for stacking (default: 0)
  isActive: boolean;       // Whether shadow is active (default: true)
  target: MudObject | null; // Reference to shadowed object

  constructor(shadowType: string);

  // Get original value from target
  protected getOriginal<T>(property: string): T | undefined;

  // Remove this shadow from its target
  remove(): Promise<void>;

  // Temporarily disable/enable
  disable(): void;
  enable(): void;

  // Lifecycle hooks (override in subclass)
  onAttach?(target: MudObject): void | Promise<void>;
  onDetach?(target: MudObject): void | Promise<void>;
}
```

### AddShadowResult

```typescript
interface AddShadowResult {
  success: boolean;
  error?: string;  // Present if success is false
}
```

---

## Examples

### Werewolf Transformation

A complete example of a werewolf transformation shadow:

```typescript
import { Shadow } from '../../shadow.js';
import type { MudObject } from '../../object.js';
import type { Living } from '../../living.js';
import type { NaturalAttack } from '../../combat/types.js';

export class WerewolfShadow extends Shadow {
  private _durationMs: number;
  private _calloutId: number | null = null;

  constructor(durationMs: number = 60000) {
    super('werewolf_form');
    this.priority = 100;
    this._durationMs = durationMs;
  }

  // ===== Shadowed Properties =====

  get name(): string {
    const original = this.getOriginal<string>('_name') || 'someone';
    return `${original} the Werewolf`;
  }

  get shortDesc(): string {
    return 'a fearsome werewolf';
  }

  get longDesc(): string {
    const originalName = this.getOriginal<string>('_name') || 'someone';
    return `This creature was once ${originalName}, but now stands transformed ` +
      `into a fearsome werewolf. Thick fur bristles across powerful muscles, ` +
      `and sharp fangs gleam in the light.`;
  }

  get exitMessage(): string {
    return '$N prowls $D, claws clicking on the ground.';
  }

  get enterMessage(): string {
    return 'A fearsome werewolf prowls in from $D.';
  }

  // ===== Shadowed Methods =====

  getDisplayName(): string {
    const originalName = this.getOriginal<string>('_name') || 'someone';
    return `${originalName} the Werewolf`;
  }

  getNaturalAttack(): NaturalAttack {
    const attacks: NaturalAttack[] = [
      {
        name: 'razor-sharp claws',
        damageType: 'slashing',
        hitVerb: 'rakes with vicious claws',
        missVerb: 'swipes with deadly claws at',
        damageBonus: 3,
        weight: 2,
      },
      {
        name: 'powerful fangs',
        damageType: 'piercing',
        hitVerb: 'savagely bites',
        missVerb: 'snaps powerful jaws at',
        damageBonus: 4,
        weight: 1,
      },
    ];

    // Weighted random selection
    const totalWeight = attacks.reduce((sum, a) => sum + (a.weight || 1), 0);
    let random = Math.random() * totalWeight;
    for (const attack of attacks) {
      random -= attack.weight || 1;
      if (random <= 0) return attack;
    }
    return attacks[0];
  }

  // ===== Lifecycle =====

  async onAttach(target: MudObject): Promise<void> {
    const living = target as Living;

    // Apply stat modifiers
    if (typeof living.addStatModifier === 'function') {
      living.addStatModifier('strength', 5);
      living.addStatModifier('dexterity', 3);
    }

    // Notify the target
    if (typeof living.receive === 'function') {
      living.receive(
        '\n{red}{bold}The beast within awakens!{/}\n' +
        '{yellow}Your body twists and contorts as thick fur sprouts.{/}\n\n'
      );
    }

    // Auto-expiration
    if (this._durationMs > 0) {
      this._calloutId = efuns.callOut(() => this.remove(), this._durationMs);
    }
  }

  async onDetach(target: MudObject): Promise<void> {
    if (this._calloutId !== null) {
      efuns.removeCallOut(this._calloutId);
      this._calloutId = null;
    }

    const living = target as Living;

    // Remove stat modifiers
    if (typeof living.addStatModifier === 'function') {
      living.addStatModifier('strength', -5);
      living.addStatModifier('dexterity', -3);
    }

    // Notify the target
    if (typeof living.receive === 'function') {
      living.receive(
        '\n{yellow}The beast within recedes.{/}\n' +
        '{yellow}You return to your normal form.{/}\n\n'
      );
    }
  }
}
```

### Simple Disguise Shadow

```typescript
import { Shadow } from '../../shadow.js';

export class DisguiseShadow extends Shadow {
  private _fakeName: string;
  private _fakeDesc: string;

  constructor(fakeName: string, fakeDesc: string) {
    super('disguise');
    this.priority = 50;
    this._fakeName = fakeName;
    this._fakeDesc = fakeDesc;
  }

  get name(): string {
    return this._fakeName;
  }

  get shortDesc(): string {
    return this._fakeDesc;
  }

  get longDesc(): string {
    return `You see ${this._fakeDesc}. Nothing seems unusual about them.`;
  }
}

// Usage:
const disguise = new DisguiseShadow('Marcus', 'a tired merchant');
await efuns.addShadow(player, disguise);
```

### Curse Shadow

```typescript
import { Shadow } from '../../shadow.js';
import type { MudObject } from '../../object.js';
import type { Living } from '../../living.js';

export class FrogCurseShadow extends Shadow {
  constructor() {
    super('frog_curse');
    this.priority = 200; // Very high - curses override most things
  }

  get name(): string {
    return 'a frog';
  }

  get shortDesc(): string {
    return 'a small green frog';
  }

  get longDesc(): string {
    const originalName = this.getOriginal<string>('_name') || 'someone';
    return `This frog was once ${originalName}. Its eyes hold a glimmer ` +
      `of human intelligence, and it croaks mournfully.`;
  }

  get exitMessage(): string {
    return 'A small frog hops $D.';
  }

  get enterMessage(): string {
    return 'A small frog hops in from $D.';
  }

  async onAttach(target: MudObject): Promise<void> {
    const living = target as Living;

    // Severely reduce stats
    living.addStatModifier?.('strength', -10);
    living.addStatModifier?.('dexterity', -5);

    living.receive?.('{green}*RIBBIT* You have been turned into a frog!{/}\n');
  }

  async onDetach(target: MudObject): Promise<void> {
    const living = target as Living;

    // Restore stats
    living.addStatModifier?.('strength', 10);
    living.addStatModifier?.('dexterity', 5);

    living.receive?.('{yellow}The curse is lifted! You return to normal.{/}\n');
  }
}
```

---

## Best Practices

### 1. Always Call super() with a Type

```typescript
constructor() {
  super('my_unique_type'); // Required - identifies the shadow type
}
```

### 2. Use getOriginal() for Composite Values

When you need to include original values in shadowed properties:

```typescript
get name(): string {
  const original = this.getOriginal<string>('_name') || 'unknown';
  return `${original} the Enchanted`;
}
```

### 3. Clean Up in onDetach()

Always reverse any changes made in onAttach():

```typescript
async onAttach(target: MudObject): Promise<void> {
  (target as Living).addStatModifier('strength', 5);
}

async onDetach(target: MudObject): Promise<void> {
  (target as Living).addStatModifier('strength', -5); // Reverse the change
}
```

### 4. Use Appropriate Priority

| Priority Range | Use Case |
|----------------|----------|
| 0-25 | Subtle effects, defaults |
| 25-50 | Standard buffs/debuffs |
| 50-100 | Transformations, disguises |
| 100-150 | Powerful effects |
| 150-200 | Curses, overriding effects |
| 200+ | Absolute overrides |

### 5. Handle Timer Cleanup

If using callOut for auto-expiration, always clean up:

```typescript
async onDetach(target: MudObject): Promise<void> {
  if (this._calloutId !== null) {
    efuns.removeCallOut(this._calloutId);
    this._calloutId = null;
  }
}
```

### 6. Check for Method Existence

When calling methods on the target in lifecycle hooks:

```typescript
async onAttach(target: MudObject): Promise<void> {
  const living = target as Living;

  // Safe method calls
  if (typeof living.addStatModifier === 'function') {
    living.addStatModifier('strength', 5);
  }

  if (typeof living.receive === 'function') {
    living.receive('You feel stronger!\n');
  }
}
```

### 7. Shadows Don't Persist

Shadows are cleared on:
- Player death (automatic via `player.onDeath()`)
- Player logout
- Server restart

For persistent effects, store the shadow type in player properties and recreate on login.

---

## Unshadowable Properties

These properties cannot be shadowed (for safety and integrity):

| Category | Properties |
|----------|------------|
| **Identity** | `objectPath`, `objectId`, `isClone`, `blueprint` |
| **Structure** | `environment`, `inventory`, `moveTo` |
| **Lifecycle** | `onCreate`, `onDestroy`, `onClone`, `onReset` |
| **Internal** | `id`, `addAction`, `removeAction`, `getActions` |

---

## Debugging

### Check Shadow Status

```typescript
// In-game command or debug code
if (efuns.hasShadows(player)) {
  const shadows = efuns.getShadows(player.objectId);
  for (const shadow of shadows) {
    console.log(`Shadow: ${shadow.shadowType} (priority: ${shadow.priority}, active: ${shadow.isActive})`);
  }
}
```

### Get System Stats

```typescript
const stats = efuns.getShadowStats();
console.log(`Shadowed objects: ${stats.totalShadowedObjects}`);
console.log(`Total shadows: ${stats.totalShadows}`);
console.log(`By type:`, stats.shadowsByType);
```

---

## File Locations

| Purpose | File |
|---------|------|
| Shadow types & constants | `src/driver/shadow-types.ts` |
| Shadow registry & proxy | `src/driver/shadow-registry.ts` |
| Shadow efuns | `src/driver/efun-bridge.ts` |
| Shadow base class | `mudlib/std/shadow.ts` |
| Werewolf example | `mudlib/std/guild/shadows/werewolf-shadow.ts` |
| Transform command | `mudlib/cmds/builder/_transform.ts` |
