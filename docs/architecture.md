# MudForge Architecture

## Overview

MudForge follows a classic MUD driver architecture, separating the **driver** (game engine) from the **mudlib** (game content). This separation allows game developers to focus on creating content while the driver handles infrastructure concerns.

## Core Components

### Driver

The driver is the game engine that provides:

- **Object Registry** - Manages all game objects (blueprints and clones)
- **Scheduler** - Handles heartbeats and delayed function calls
- **Compiler** - Compiles TypeScript mudlib code to JavaScript
- **Efun Bridge** - Exposes driver APIs to mudlib code
- **Network Server** - HTTP/WebSocket server for player connections
- **Permission System** - Controls who can read/write game files

### Mudlib

The mudlib is the game content written in TypeScript:

- **Standard Library** (`/std/`) - Base classes for objects, rooms, items, etc.
- **Master Object** (`/master.ts`) - Driver hooks and global configuration
- **Daemons** (`/daemons/`) - Background services (login, channels, help, admin). See [Daemons](daemons.md) for details.
- **Commands** (`/cmds/`) - Player, builder, and admin commands. See [Commands](commands.md) for details.
- **Areas** (`/areas/`) - Game world content

## Object Model

Everything in MudForge is an object. All objects inherit from `MudObject`:

```
MudObject                          # Root of all objects
├── Master                         # World bootstrap, global hooks
├── Room                           # Locations
├── Item                           # Carryable objects
│   ├── Weapon                     # Melee/ranged weapons with handedness
│   ├── Armor                      # Body slot armor and shields
│   └── Container                  # Chests, bags (openable, lockable)
├── Living                         # Entities that can act
│   ├── Player                     # Human players with equipment
│   └── NPC                        # Computer-controlled characters
└── Daemon                         # Background services
```

### NPC System

NPCs extend Living with autonomous behavior:
- **Chat system**: Periodic messages with configurable chance
- **Response system**: Pattern-matched responses to player speech
- **Action types**: say, emote, shout

### Equipment System

Living objects track equipped items across slots:
- **Armor slots**: head, chest, hands, legs, feet, cloak
- **Weapon slots**: main_hand, off_hand
- **Handedness**: one_handed, light (dual-wield), two_handed
- **Shields**: Use off_hand slot, conflict with dual-wield

### Container System

Containers extend Item with inventory management:
- **Open/Close**: Must be open to access contents
- **Lock/Unlock**: Optional locking with key matching
- **Capacity**: Weight limits for contents

### Blueprints vs Clones

- **Blueprint**: A loaded object file (e.g., `/std/sword`)
- **Clone**: An instance created from a blueprint (e.g., `/std/sword#47`)

```typescript
// Load the sword blueprint
const sword = efuns.loadObject('/std/sword');

// Create clones
const sword1 = await efuns.cloneObject('/std/sword'); // /std/sword#1
const sword2 = await efuns.cloneObject('/std/sword'); // /std/sword#2
```

## Execution Model

### V8 Isolates

Mudlib code runs in isolated V8 contexts using `isolated-vm`:

```
┌─────────────────────────────────────────┐
│                Driver                    │
│  ┌───────────────────────────────────┐  │
│  │         Efun Bridge                │  │
│  │  (cloneObject, send, etc.)         │  │
│  └───────────────────────────────────┘  │
│                    │                     │
│                    ▼                     │
│  ┌───────────────────────────────────┐  │
│  │         V8 Isolate                 │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │      Mudlib Context         │  │  │
│  │  │  - Object instances         │  │  │
│  │  │  - Event handlers           │  │  │
│  │  │  - Heartbeat callbacks      │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

Benefits:
- Memory limits per context
- CPU timeout enforcement
- Script errors don't crash the driver
- Secure sandboxing

### Scheduler

The scheduler manages:

1. **Heartbeat** - Regular tick for objects (default: every 2 seconds)
2. **CallOut** - Delayed function execution

```typescript
// Enable heartbeat on an object
efuns.setHeartbeat(this, true);

// Schedule a delayed call
const id = efuns.callOut(() => {
  console.log('Executed after 5 seconds');
}, 5000);

// Cancel a scheduled call
efuns.removeCallOut(id);
```

## Data Flow

### Player Connection

```
Browser → WebSocket → Server → ConnectionManager → Master.onPlayerConnect()
                                                            │
                                                            ▼
                                                     Login Daemon
                                                            │
                                                            ▼
                                                     Player Object
```

### Command Processing

```
Player Input → Connection → Living.command() → Action Handler → Response
                                  │
                                  ▼
                           Command Parser
                                  │
                                  ▼
                           Object Actions (addAction)
```

## File Structure

```
mudforge/
├── src/
│   ├── driver/
│   │   ├── index.ts          # Entry point
│   │   ├── driver.ts         # Main orchestrator
│   │   ├── object-registry.ts
│   │   ├── scheduler.ts
│   │   ├── efun-bridge.ts    # Efuns exposed to mudlib
│   │   ├── command-manager.ts # Command routing with hot-reload
│   │   ├── compiler.ts
│   │   ├── hot-reload.ts
│   │   ├── permissions.ts
│   │   └── persistence/
│   ├── isolation/
│   │   ├── isolate-pool.ts
│   │   └── script-runner.ts
│   ├── network/
│   │   ├── server.ts
│   │   ├── connection.ts
│   │   └── connection-manager.ts
│   └── client/              # Web client (Linear.app-inspired). See [Client](client.md).
│       ├── client.ts
│       ├── terminal.ts
│       ├── editor.ts
│       └── websocket-client.ts
├── mudlib/
│   ├── master.ts            # Master object
│   ├── simul_efun.ts        # Simulated efuns
│   ├── efuns.d.ts           # Global efun type declarations
│   ├── tsconfig.json        # Mudlib TypeScript config
│   ├── std/
│   │   ├── object.ts, room.ts, living.ts, player.ts
│   │   ├── item.ts, weapon.ts, armor.ts, container.ts
│   │   ├── npc.ts, equipment.ts
│   │   └── ...
│   ├── daemons/
│   │   ├── login.ts, channels.ts, help.ts, admin.ts
│   │   └── ...
│   ├── cmds/
│   │   ├── player/          # Commands for all players
│   │   ├── builder/         # Builder-only commands
│   │   └── admin/           # Admin-only commands
│   ├── areas/               # Game world
│   └── data/                # Persistent state
└── tests/
```

## Global Efuns

Efuns (external functions) are driver APIs exposed to mudlib code. They are globally available through the `efuns` object:

```typescript
// No import needed - efuns is globally available
const sword = await efuns.cloneObject('/std/sword');
efuns.send(player, 'You got a sword!');
```

Type declarations are provided in `/mudlib/efuns.d.ts` using TypeScript's `declare global` pattern. This allows all mudlib code to use efuns without local declarations.

Key efun categories:
- **Object management**: cloneObject, destruct, loadObject, findObject
- **Hierarchy**: allInventory, environment, move
- **Context**: thisObject, thisPlayer, allPlayers
- **Communication**: send, page
- **File operations**: readFile, writeFile, fileExists
- **Hot reload**: reloadObject, reloadCommand
- **Permissions**: isAdmin, isBuilder, checkReadPermission

## Hot Reload

MudForge supports updating objects and commands without restarting the server.

### Object Hot Reload

For mudlib objects (rooms, items, NPCs):

1. File change detected (or manual `update` command)
2. TypeScript file recompiled from disk
3. Blueprint updated in registry
4. Existing clones keep old behavior (traditional LPMud style)
5. New clones use updated code

```typescript
// Via efun
await efuns.reloadObject('/std/sword');
```

### Command Hot Reload

For commands, updates take effect immediately:

1. Command file recompiled from disk
2. Command module replaced in command manager
3. All future command invocations use new code

```typescript
// Via efun
await efuns.reloadCommand('/cmds/player/_look');
```

### In-Game Update Command

Builders can use the `update` command:

```
update /std/room          # Reload an object
update _look              # Reload a command (auto-finds path)
update here               # Reload current room
```

## Persistence

### Player Data

Players are saved to JSON files in `/mudlib/data/players/`:

```json
{
  "name": "Hero",
  "location": "/areas/town/square",
  "state": {
    "level": 5,
    "hp": 100
  },
  "savedAt": 1704067200000
}
```

### World State

World state snapshots include all persistent objects:

```json
{
  "version": 1,
  "objects": [
    {
      "objectPath": "/areas/town/square",
      "isClone": false,
      "properties": { ... }
    }
  ],
  "timestamp": 1704067200000
}
```

## Security

### Permission Levels

| Level | Capabilities |
|-------|-------------|
| Player | Play the game |
| Builder | Edit files in assigned domains |
| SeniorBuilder | Edit /lib/, expanded access |
| Administrator | Full access, manage permissions |

### Protected Paths

These paths are protected (admin-only write):
- `/std/` - Standard library
- `/core/` - Core driver hooks
- `/daemon/` - System daemons

### Sandboxing

- File access restricted to mudlib directory
- No access to Node.js built-ins
- Memory limits enforced
- CPU timeouts prevent infinite loops
