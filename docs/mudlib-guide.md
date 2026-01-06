# Mudlib Builder's Guide

This guide explains how to create game content for MudForge.

## Getting Started

All game content lives in the `/mudlib/` directory. The standard library provides base classes you extend to create your content.

## Global Efuns

Efuns (external functions) are driver-provided APIs available to all mudlib code. They are globally available through the `efuns` object - you don't need to declare them in each file.

```typescript
// Efuns are globally available - just use them!
export class MyRoom extends Room {
  async onCreate(): Promise<void> {
    await super.onCreate();
    const sword = await efuns.cloneObject('/std/sword');
    await sword?.moveTo(this);
    efuns.send(efuns.thisPlayer()!, 'A sword materializes!');
  }
}
```

See the [Efuns Reference](efuns.md) for the complete API.

## Creating a Room

Rooms are locations in the game world.

```typescript
// /mudlib/areas/town/tavern.ts
import { Room } from '../../std/room.js';

export class Tavern extends Room {
  shortDesc = 'The Rusty Tankard';

  get longDesc(): string {
    return `You stand in a cozy tavern. A fire crackles in the hearth,
and the smell of roasting meat fills the air.

Obvious exits: south`;
  }

  onCreate(): void {
    super.onCreate();

    // Add exits
    this.addExit('south', '/areas/town/market');
    this.addExit('up', '/areas/town/tavern_rooms');

    // Add custom commands
    this.addAction('order', this.handleOrder.bind(this));
  }

  private handleOrder(args: string): boolean {
    const player = efuns.thisPlayer();
    if (!player) return false;

    efuns.send(player, 'The bartender slides a foamy ale across the bar.');
    return true;
  }
}
```

## Creating an Item

Items are objects players can pick up and use.

```typescript
// /mudlib/areas/town/items/sword.ts
import { Weapon } from '../../../std/weapon.js';

export class TownSword extends Weapon {
  shortDesc = 'a rusty sword';

  get longDesc(): string {
    return 'This old sword has seen better days, but it still has an edge.';
  }

  onCreate(): void {
    super.onCreate();
    this.weight = 3;
    this.value = 10;
    this.damage = 5;
    this.damageType = 'slashing';
  }

  // Called when player wields the weapon
  onWield(): void {
    const player = efuns.thisPlayer();
    if (player) {
      efuns.send(player, 'You grip the rusty sword tightly.');
    }
  }
}
```

## Creating an NPC

NPCs are non-player characters that populate your world. They can have periodic chat messages, respond to player speech, and perform autonomous behavior.

```typescript
// /mudlib/areas/town/npcs/bartender.ts
import { NPC } from '../../../std/npc.js';

export class Bartender extends NPC {
  constructor() {
    super();
    // Use setNPC() to configure all NPC properties at once
    this.setNPC({
      name: 'bartender',
      shortDesc: 'the bartender',
      longDesc: 'A grizzled man stands behind the bar, polishing a glass.',
      chatChance: 15, // 15% chance per heartbeat to chat
    });

    // Add periodic chat messages with action types
    this.addChat('The bartender whistles tunelessly.', 'emote');
    this.addChat('What can I get for ya?', 'say');
    this.addChat('polishes a glass methodically.', 'emote');

    // Add response triggers (regex patterns)
    this.addResponse(/hello|hi|hey/i, 'Welcome to my tavern!', 'say');
    this.addResponse(/ale|beer|drink/i, 'Best ale in town, only 5 copper!', 'say');
    this.addResponse(/food|eat|hungry/i, 'We have stew and fresh bread.', 'say');
  }
}
```

### NPC Chat System

NPCs can periodically say or emote things using the chat system:

```typescript
// Action types: 'say', 'emote', 'shout'
this.addChat('rings his brass bell loudly.', 'emote');  // "Crier rings his brass bell loudly."
this.addChat('Hear ye, hear ye!', 'say');               // "Crier says: Hear ye, hear ye!"
this.addChat('IMPORTANT NEWS!', 'shout');               // "Crier shouts: IMPORTANT NEWS!"
```

### NPC Response System

NPCs can respond to player speech with pattern matching:

```typescript
// Pattern matching with regex
this.addResponse(/quest|job|work/i, 'I might have something for you...', 'say');
this.addResponse(/bye|goodbye|farewell/i, 'waves goodbye.', 'emote');

// The NPC will automatically respond when a player says something matching the pattern
```

### NPC Appearance in Rooms

NPCs are displayed in room descriptions with red text (non-bold) and appear after players but before items:

```
Town Square
The central gathering place of town.

Acer is standing here.              <- Player (bold white)
The town crier is standing here.    <- NPC (red)
A rusty sword lies on the ground.   <- Item (normal)
```

## Creating a Container

Containers can hold other items. Players can open, close, lock, unlock, and store items in them.

```typescript
// /mudlib/areas/town/items/chest.ts
import { Container } from '../../../std/container.js';

export class TreasureChest extends Container {
  constructor() {
    super();
    this.setContainer({
      name: 'chest',
      shortDesc: 'a wooden treasure chest',
      longDesc: 'An ornate wooden chest bound with iron bands.',
      maxCapacity: 100,      // Maximum weight it can hold
      isOpen: false,         // Starts closed
      isLocked: true,        // Starts locked
      keyId: 'brass_key',    // Requires a key with this ID to unlock
    });
  }

  async onCreate(): Promise<void> {
    await super.onCreate();
    // Add treasure inside
    const gold = await efuns.cloneObject('/std/gold');
    if (gold) {
      gold.setProperty('amount', 50);
      await gold.moveTo(this);
    }
  }
}
```

### Container Commands

Players can interact with containers using these commands:

```
open chest             # Open a container
close chest            # Close a container
look in chest          # See what's inside (if open)
get sword from chest   # Take an item from the container
drop sword in chest    # Put an item in the container (or use 'put')
```

### Lockable Containers

Containers can be locked and require keys:

```typescript
export class LockedChest extends Container {
  constructor() {
    super();
    this.setContainer({
      name: 'chest',
      shortDesc: 'a locked iron chest',
      longDesc: 'A heavy iron chest with a brass lock.',
      isLocked: true,
      keyId: 'iron_chest_key',  // The key item needs this as its keyId
    });
  }
}
```

To create the matching key:

```typescript
export class IronChestKey extends Item {
  constructor() {
    super();
    this.shortDesc = 'an iron key';
    this.longDesc = 'A heavy iron key with intricate teeth.';
    this.keyId = 'iron_chest_key';  // Matches the container's keyId
  }
}
```

## Creating a Weapon

Weapons can be wielded by players for combat. They support handedness for dual-wielding.

```typescript
// /mudlib/areas/town/items/longsword.ts
import { Weapon } from '../../../std/weapon.js';

export class Longsword extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      name: 'longsword',
      shortDesc: 'a gleaming longsword',
      longDesc: 'A well-balanced steel longsword with a leather-wrapped hilt.',
      damage: 10,
      damageType: 'slashing',
      handedness: 'one_handed',  // 'one_handed', 'light', or 'two_handed'
    });
  }

  // Called when player wields the weapon
  onWield(): void {
    const player = efuns.thisPlayer();
    if (player) {
      efuns.send(player, 'You grip the longsword confidently.');
    }
  }
}
```

### Weapon Handedness

Weapons have three handedness types:

| Type | Description | Dual-Wield |
|------|-------------|------------|
| `one_handed` | Standard weapon in main hand | Can hold shield in off-hand |
| `light` | Light weapon (daggers, shortswords) | Can go in main or off-hand |
| `two_handed` | Large weapons (greatswords, bows) | Uses both hands, no shield |

```typescript
// Light weapon - can dual-wield
export class Dagger extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      name: 'dagger',
      shortDesc: 'a steel dagger',
      damage: 4,
      damageType: 'piercing',
      handedness: 'light',  // Can be wielded in off-hand
    });
  }
}

// Two-handed weapon - uses both hands
export class Greatsword extends Weapon {
  constructor() {
    super();
    this.setWeapon({
      name: 'greatsword',
      shortDesc: 'a massive greatsword',
      damage: 18,
      damageType: 'slashing',
      handedness: 'two_handed',  // Cannot use shield
    });
  }
}
```

### Wielding Commands

```
wield sword              # Wield in main hand
wield dagger in left     # Wield in off-hand (dual-wield)
unwield                  # Unwield all weapons
unwield sword            # Unwield specific weapon
```

## Creating Armor

Armor can be worn on different body slots:

```typescript
// /mudlib/areas/town/items/chainmail.ts
import { Armor } from '../../../std/armor.js';

export class Chainmail extends Armor {
  constructor() {
    super();
    this.setArmor({
      name: 'chainmail',
      shortDesc: 'a suit of chainmail',
      longDesc: 'Interlocking steel rings form a protective shirt.',
      armorClass: 5,
      armorSlot: 'chest',  // head, chest, hands, legs, feet, cloak
    });
  }

  onWear(): void {
    const player = efuns.thisPlayer();
    if (player) {
      efuns.send(player, 'The chainmail settles comfortably on your shoulders.');
    }
  }
}
```

### Armor Slots

| Slot | Example Items |
|------|---------------|
| `head` | Helmets, hats, crowns |
| `chest` | Armor, robes, shirts |
| `hands` | Gloves, gauntlets |
| `legs` | Pants, greaves, leggings |
| `feet` | Boots, shoes |
| `cloak` | Cloaks, capes |

### Shields

Shields use the off-hand equipment slot:

```typescript
import { Armor } from '../../../std/armor.js';

export class WoodenShield extends Armor {
  constructor() {
    super();
    this.setArmor({
      name: 'shield',
      shortDesc: 'a wooden shield',
      longDesc: 'A round wooden shield with an iron boss.',
      armorClass: 2,
      armorSlot: 'shield',  // Uses off-hand, blocks dual-wielding
    });
  }
}
```

### Wearing Commands

```
wear armor               # Wear an armor piece
remove armor             # Remove worn armor
equipment                # View all equipped items (or 'eq')
```

## Object Lifecycle

Every object goes through these lifecycle events:

```typescript
class MyObject extends MudObject {
  // Called when the object is first created
  onCreate(): void {
    super.onCreate();
    // Initialize properties
  }

  // Called when the object is about to be destroyed
  onDestroy(): void {
    // Clean up resources
    super.onDestroy();
  }

  // Called when a clone is made (on the clone)
  onClone(): void {
    super.onClone();
    // Customize the clone
  }

  // Called periodically if heartbeat is enabled
  heartbeat(): void {
    // Regular updates
  }
}
```

## Actions and Commands

Add custom commands to objects:

```typescript
class MagicWand extends Weapon {
  onCreate(): void {
    super.onCreate();
    this.addAction('wave', this.handleWave.bind(this));
    this.addAction('zap', this.handleZap.bind(this));
  }

  private handleWave(args: string): boolean {
    const player = efuns.thisPlayer();
    if (!player) return false;

    this.broadcast(`${player.name} waves the wand mysteriously.`);
    return true;
  }

  private handleZap(args: string): boolean {
    const player = efuns.thisPlayer();
    if (!player) return false;

    if (args) {
      efuns.send(player, `You zap ${args} with the wand!`);
    } else {
      efuns.send(player, 'Zap what?');
    }
    return true;
  }
}
```

## Room Exits

Exits connect rooms:

```typescript
class CrossRoads extends Room {
  onCreate(): void {
    super.onCreate();

    // Simple exit to another room
    this.addExit('north', '/areas/forest/entrance');

    // Exit to a room that needs to be cloned
    this.addExit('east', '/areas/dungeon/entrance', { clone: true });
  }
}
```

## Broadcasting Messages

Send messages to everyone in a room:

```typescript
class ExplosiveBarrel extends Item {
  explode(): void {
    const room = efuns.environment(this);
    if (!room) return;

    // Broadcast to everyone
    room.broadcast('BOOM! The barrel explodes!');

    // Broadcast excluding the thrower
    const thrower = efuns.thisPlayer();
    room.broadcast('You throw the barrel!', { exclude: [thrower] });
  }
}
```

## Using Heartbeat

Enable heartbeat for regular updates:

```typescript
class PoisonedPlayer extends Living {
  private poisonTicks = 10;

  startPoison(): void {
    efuns.setHeartbeat(this, true);
  }

  heartbeat(): void {
    super.heartbeat();

    if (this.poisonTicks > 0) {
      this.hp -= 5;
      this.receive('The poison courses through your veins...');
      this.poisonTicks--;
    } else {
      efuns.setHeartbeat(this, false);
    }
  }
}
```

## Delayed Actions

Schedule actions to happen later:

```typescript
class TimeBomb extends Item {
  arm(): void {
    const player = efuns.thisPlayer();
    efuns.send(player, 'The bomb starts ticking...');

    // Explode in 10 seconds
    efuns.callOut(() => this.explode(), 10000);
  }

  private explode(): void {
    const room = efuns.environment(this);
    if (room) {
      room.broadcast('KABOOM! The bomb explodes!');
    }
    efuns.destruct(this);
  }
}
```

## Best Practices

1. **Always call super()** - Ensure parent class methods are called
2. **Use descriptive names** - `shortDesc` should be brief, `longDesc` detailed
3. **Handle null checks** - `thisPlayer()` and `environment()` can return null
4. **Clean up heartbeats** - Disable when no longer needed
5. **Validate input** - Check command arguments before using
6. **Test your code** - Use the in-game editor's error feedback

## Directory Structure

Organize your content logically:

```
/mudlib/areas/
├── town/
│   ├── index.ts        # Town entrance
│   ├── market.ts       # Market square
│   ├── tavern.ts       # The tavern
│   ├── items/
│   │   ├── bread.ts
│   │   └── sword.ts
│   └── npcs/
│       ├── merchant.ts
│       └── guard.ts
├── forest/
│   ├── entrance.ts
│   └── ...
└── dungeon/
    ├── entrance.ts
    └── ...
```
