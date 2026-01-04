# Mudlib Builder's Guide

This guide explains how to create game content for MudForge.

## Getting Started

All game content lives in the `/mudlib/` directory. The standard library provides base classes you extend to create your content.

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

NPCs are non-player characters that populate your world.

```typescript
// /mudlib/areas/town/npcs/bartender.ts
import { NPC } from '../../../std/npc.js';

export class Bartender extends NPC {
  shortDesc = 'the bartender';

  get longDesc(): string {
    return 'A grizzled man stands behind the bar, polishing a glass.';
  }

  onCreate(): void {
    super.onCreate();
    this.name = 'bartender';

    // Set up chat responses
    this.setChatChance(0.1); // 10% chance to chat each heartbeat
    this.addChatMessage('The bartender whistles tunelessly.');
    this.addChatMessage('The bartender wipes down the bar.');
  }

  // Respond when player says something
  onHear(speaker: MudObject, message: string): void {
    if (message.toLowerCase().includes('ale')) {
      this.say('Best ale in town, only 5 copper!');
    }
  }
}
```

## Creating a Container

Containers can hold other items.

```typescript
// /mudlib/areas/town/items/chest.ts
import { Container } from '../../../std/container.js';

export class TreasureChest extends Container {
  shortDesc = 'a wooden chest';

  get longDesc(): string {
    const status = this.isOpen ? 'open' : 'closed';
    return `A sturdy wooden chest sits here. It is ${status}.`;
  }

  onCreate(): void {
    super.onCreate();
    this.weight = 10;
    this.maxCapacity = 100;
    this.isLocked = true;
    this.keyId = 'brass'; // Requires a key with 'brass' in its ID
  }
}
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
