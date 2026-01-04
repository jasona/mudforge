# MudForge

A modern MUD (Multi-User Dungeon) driver inspired by LDMud, built with Node.js and TypeScript.

## Overview

MudForge brings the architectural elegance of classic LPMud drivers into the modern era. It replaces the traditional LPC scripting language with TypeScript, enables real-time in-game scripting without server restarts, and provides browser-based connectivity via WebSocket.

### Key Features

- **TypeScript Scripting** - Write game content in TypeScript with full IDE support, type safety, and modern syntax
- **Runtime Hot-Reload** - Create and modify objects while the game is running without server restarts
- **Web-Based Client** - Players connect through modern web browsers (no telnet required)
- **V8 Isolate Sandboxing** - Scripts run in isolated V8 contexts via `isolated-vm` for security and stability
- **LDMud-Inspired Architecture** - Everything is an object with consistent inheritance hierarchy
- **Tiered Permission System** - Player, Builder, Senior Builder, and Administrator roles
- **File-Based Persistence** - Human-readable TypeScript/JSON files that work with version control

## Design Philosophy

Following LDMud's proven architecture, MudForge embraces the principle that **everything is an object**:

- **Consistency** - All objects respond to the same base protocols
- **Flexibility** - Any object can be extended, cloned, or replaced at runtime
- **Discoverability** - Builders learn one object model that applies everywhere
- **Hot-reloading** - Objects can be updated without restarting the driver

## Architecture

```
+-----------------------------------------------------------------+
|                        Web Browser                              |
|  +-----------------------------------------------------------+  |
|  |                 Web Client (Terminal UI)                  |  |
|  +-----------------------------------------------------------+  |
+-----------------------------------------------------------------+
                              | WebSocket
                              v
+-----------------------------------------------------------------+
|                     MUD Driver (Node.js)                        |
|  +-------------+  +-------------+  +-------------+              |
|  | Connection  |  |   Object    |  |  Scheduler  |              |
|  |  Manager    |  |  Registry   |  | (heartbeat) |              |
|  +-------------+  +-------------+  +-------------+              |
|  +-----------------------------------------------------------+  |
|  |           V8 Isolate Pool (isolated-vm)                   |  |
|  |  +-----------------------------------------------------+  |  |
|  |  |              Mudlib Execution Context               |  |  |
|  |  |  +---------+  +-------------+  +---------------+   |  |  |
|  |  |  | Master  |  | Sim Efuns   |  | Object Pool   |   |  |  |
|  |  |  +---------+  +-------------+  +---------------+   |  |  |
|  |  +-----------------------------------------------------+  |  |
|  +-----------------------------------------------------------+  |
+-----------------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------------+
|                      File System (Mudlib)                       |
|  /mudlib/                                                       |
|  +-- master.ts              # Master object                     |
|  +-- std/                   # Standard library                  |
|  |   +-- room.ts, living.ts, player.ts, item.ts, ...           |
|  +-- areas/                 # Game world content                |
|  +-- data/                  # Persistent state (JSON)           |
+-----------------------------------------------------------------+
```

## Object Hierarchy

```
MudObject                          # Root of all objects
+-- Master                         # World bootstrap, global hooks
+-- Room                           # Locations
+-- Item                           # Carryable objects
|   +-- Weapon, Armor, Container
+-- Living                         # Entities that can act
|   +-- Player                     # Human players
|   +-- NPC                        # Non-player characters
+-- Daemon                         # Background services
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 22+ LTS |
| Language | TypeScript 5.x |
| Script Isolation | isolated-vm (V8 isolates) |
| WebSocket | ws |
| Web Server | Fastify |
| Compilation | esbuild |
| Testing | Vitest |

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
+-- driver/           # Core driver implementation
|   +-- object-registry.ts
|   +-- scheduler.ts
|   +-- efun-bridge.ts
|   +-- ...
+-- isolation/        # V8 isolate sandboxing
+-- network/          # WebSocket server
+-- client/           # Web client UI

mudlib/
+-- master.ts         # Master object
+-- std/              # Standard library
+-- daemons/          # Background services
+-- areas/            # Game world
+-- data/             # Persistent state

tests/
```

## User Roles

| Role | Capabilities |
|------|-------------|
| **Player** | Connect, play the game |
| **Builder** | Create/modify objects in assigned domains |
| **Senior Builder** | Cross-domain building, advanced APIs |
| **Administrator** | Full access, permission management |

## Example: Creating a Room

```typescript
// /mudlib/areas/town/tavern.ts
import { Room } from '../../std/room';
import { efun } from '../../driver/efuns';

export class Tavern extends Room {
  override shortDesc = 'The Rusty Tankard';

  override get longDesc(): string {
    return `You stand in a cozy tavern. A fire crackles in the hearth,
and the smell of roasting meat fills the air.`;
  }

  override onCreate(): void {
    super.onCreate();
    this.addExit('south', '/areas/town/market');
    this.addAction('order', this.handleOrder.bind(this));
  }

  private handleOrder(player: Player, args: string): boolean {
    player.receive('The bartender pours you a frothy ale.');
    return true;
  }
}
```

## Deployment

### Docker

```bash
docker build -t mudforge .
docker run -p 3000:3000 mudforge
```

### PM2

```bash
pm2 start ecosystem.config.js
```

## Status

This project is under active development. See [tasks/tasks-modern-mud-driver.md](tasks/tasks-modern-mud-driver.md) for the implementation roadmap.

## Inspiration

MudForge draws inspiration from:
- [LDMud](https://github.com/ldmud/ldmud) - The classic LPMud driver

## License

MIT
