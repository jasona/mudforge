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
MudObject
├── Room          - Locations
├── Item          - Carryable objects
│   ├── Weapon
│   ├── Armor
│   └── Container
└── Living        - Entities that can act
    ├── Player    - Human players
    └── NPC       - Non-player characters
```

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
│   │   ├── efun-bridge.ts
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
│   ├── master.ts
│   ├── simul_efun.ts
│   ├── std/
│   ├── daemons/
│   ├── areas/
│   └── data/
└── tests/
```

## Hot Reload

MudForge supports updating objects without restarting:

1. File change detected (or manual update request)
2. Compiler recompiles the file
3. New code applied to blueprint
4. Existing clones get new methods, keep current state

```typescript
// Trigger hot reload
await hotReload.update('/std/sword');
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
