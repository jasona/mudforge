# Getting Started

This guide walks you through setting up MudForge and building your first game content.

## Prerequisites

- **Node.js 22+** (required for V8 isolate support)
- **npm** (comes with Node.js)
- **Git**

## Installation

```bash
# Clone the repository
git clone https://github.com/jasona/mudforge.git
cd mudforge

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env
```

## Running the Server

```bash
# Development mode (with hot-reload on driver changes)
npm run dev

# Or without file watching
npm run dev:no-watch
```

Open your browser to `http://localhost:3000` to see the web client. Create a character and log in.

## Project Structure

```
mudforge/
  src/              # Driver engine (Node.js, runs outside sandbox)
    driver/         # Core orchestration, object registry, efun bridge
    network/        # HTTP server and WebSocket handling
    isolation/      # V8 isolate pool and sandbox execution
    client/         # Browser-based terminal client
  mudlib/           # Game content (runs inside V8 sandboxes)
    std/            # Base classes: Room, Item, NPC, Player, Weapon, Armor, etc.
    daemons/        # Background services (login, combat, guilds, quests, etc.)
    cmds/           # Commands by permission level (player/, builder/, admin/)
    areas/          # Game world content (rooms, NPCs, items)
    config/         # Game configuration (game.json, races, guilds, etc.)
    data/           # Persisted player data and world state
  tests/            # Test suite (vitest)
  docs/             # Documentation
```

The key concept: **the driver (`src/`) is the engine, the mudlib (`mudlib/`) is your game.** You build content by writing TypeScript files in the mudlib that extend the standard library classes.

## Building Your First Area

### 1. Create an Area Directory

```bash
mkdir -p mudlib/areas/mytown
```

### 2. Create a Room

```typescript
// mudlib/areas/mytown/square.ts
import { Room } from '../../std/room.js';

export class TownSquare extends Room {
  shortDesc = 'Town Square';

  get longDesc(): string {
    return `A bustling town square with a fountain at its center.
Cobblestone streets branch off in every direction.

Obvious exits: north, east`;
  }

  onCreate(): void {
    super.onCreate();
    this.addExit('north', '/areas/mytown/tavern');
    this.addExit('east', '/areas/mytown/market');
  }
}
```

### 3. Create an NPC

```typescript
// mudlib/areas/mytown/guard.ts
import { NPC } from '../../std/npc.js';

export class TownGuard extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'guard',
      shortDesc: 'the town guard',
      longDesc: 'A stern-looking guard in chainmail watches the square.',
      chatChance: 10,
    });

    this.addChat('Move along, citizen.', 'say');
    this.addChat('surveys the crowd with a watchful eye.', 'emote');
    this.addResponse(/trouble|help/i, 'Keep the peace and we will have no problems.', 'say');
  }
}
```

### 4. Create an Item

```typescript
// mudlib/areas/mytown/items/torch.ts
import { Item } from '../../../std/item.js';

export class Torch extends Item {
  shortDesc = 'a wooden torch';

  get longDesc(): string {
    return 'A simple wooden torch wrapped in oil-soaked rags.';
  }

  onCreate(): void {
    super.onCreate();
    this.weight = 1;
    this.value = 5;
  }
}
```

### 5. Spawn NPCs and Items in Your Room

```typescript
// In your room's onCreate():
onCreate(): void {
  super.onCreate();
  this.addExit('north', '/areas/mytown/tavern');

  // Spawn an NPC
  this.addSpawn('/areas/mytown/guard');

  // Clone an item into the room
  efuns.cloneObject('/areas/mytown/items/torch').then(torch => {
    torch?.moveTo(this);
  });
}
```

Once the server is running, you can visit your room in-game or hot-reload it with the `update` command.

## Key Concepts

### Efuns (External Functions)

All mudlib code has access to a global `efuns` object providing driver APIs:

```typescript
efuns.cloneObject('/std/weapon');     // Create an object instance
efuns.loadObject('/areas/town/pub');  // Load a singleton object
efuns.send(player, 'Hello!');        // Send text to a player
efuns.moveTo(item, room);            // Move an object
efuns.destruct(object);              // Destroy an object
efuns.thisPlayer();                  // Get the current acting player
efuns.environment(object);           // Get containing object
```

See [efuns.md](efuns.md) for the complete API reference.

### Object Hierarchy

```
MudObject
  Room           - Locations with exits and spawns
  Item           - Pickupable objects
    Weapon       - Wieldable weapons (one-handed, light, two-handed)
    Armor        - Wearable armor (head, chest, hands, legs, feet, cloak, shield)
    Container    - Openable/lockable storage (chests, bags)
    Consumable   - Usable items (potions, food)
  Living         - Anything with HP, stats, and combat
    Player       - Player characters
    NPC          - Non-player characters
      Merchant   - NPCs with a shop interface
      Trainer    - NPCs that teach skills
```

### Hot-Reload

You can modify mudlib files while the server is running. Use the in-game `update /path/to/file` command to reload objects without restarting.

### Permission Levels

Commands are organized by access level:

| Level | Directory | Role |
|-------|-----------|------|
| 0 | `cmds/player/` | Player |
| 1 | `cmds/builder/` | Builder |
| 2 | `cmds/senior/` | Senior Builder |
| 3 | `cmds/admin/` | Administrator |

## Configuration

Edit `.env` to configure the server. Key settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MUDLIB_PATH` | ./mudlib | Path to mudlib directory |
| `ISOLATE_MEMORY_MB` | 128 | V8 isolate memory limit |
| `SCRIPT_TIMEOUT_MS` | 5000 | Script execution timeout |
| `DEV_MODE` | true | Enable development features |
| `CLAUDE_API_KEY` | | Enable AI-powered NPC dialogue |

See `.env.example` for the full list of options.

## Testing

```bash
npm test                              # Run all tests
npm run test:watch                    # Watch mode
npx vitest tests/mudlib/room.test.ts  # Single file
npx vitest -t "should spawn"         # By pattern
```

## Next Steps

- [Mudlib Builder's Guide](mudlib-guide.md) - Complete guide to creating game content
- [Efuns Reference](efuns.md) - Full API available to mudlib code
- [Commands](commands.md) - All player, builder, and admin commands
- [Architecture](architecture.md) - How the driver and sandbox system work
- [Daemons](daemons.md) - Background services (combat, guilds, quests, etc.)
- [Deployment](deployment.md) - Production deployment with Docker
