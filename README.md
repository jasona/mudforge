# MudForge

A modern MUD (Multi-User Dungeon) driver inspired by LDMud, built with Node.js and TypeScript.

## Overview

MudForge brings the architectural elegance of classic LPMud drivers into the modern era. It replaces the traditional LPC scripting language with TypeScript, enables real-time in-game scripting without server restarts, and provides browser-based connectivity via WebSocket.

### Key Features

- **TypeScript Scripting** - Write game content in TypeScript with full IDE support, type safety, and modern syntax
- **Runtime Hot-Reload** - Create and modify objects while the game is running without server restarts
- **Modern Web Client** - Clean, Linear.app-inspired browser interface with dark theme
- **V8 Isolate Sandboxing** - Scripts run in isolated V8 contexts via `isolated-vm` for security and stability
- **LDMud-Inspired Architecture** - Everything is an object with consistent inheritance hierarchy
- **Tiered Permission System** - Player, Builder, Senior Builder, and Administrator roles
- **Custom Display Names** - Players can create colorful, personalized display names
- **Session Reconnection** - Seamlessly reconnect to existing game sessions after disconnection
- **Communication Channels** - OOC, shout, and extensible channel system
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
|  |           Modern Web Client (Linear.app-inspired)         |  |
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

## Getting Started

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/jasona/mudforge.git
cd mudforge

# Install dependencies
npm install

# Copy environment configuration (optional - defaults work fine)
cp .env.example .env
```

### Starting the Server

```bash
# Development mode (with hot-reload and auto-restart)
npm run dev

# Or for production
npm run build
npm start
```

You should see output like:
```
[INFO] MudForge Driver starting...
[INFO] Loading mudlib from ./mudlib
[INFO] WebSocket server listening on http://localhost:3000
```

### Connecting to the Game

1. **Open your web browser** and go to:
   ```
   http://localhost:3000
   ```

2. **The web client loads automatically** - you'll see a modern dark-themed terminal interface

3. **Create a new character** or log in:
   - Enter a character name when prompted
   - If the name is new, you'll be guided through character creation
   - If returning, enter your password

That's it! You're now connected to the MUD.

### Default Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Port | `3000` | HTTP/WebSocket server port |
| Host | `0.0.0.0` | Bind address (all interfaces) |
| Mudlib Path | `./mudlib` | Game content directory |

To change these, edit `.env` or set environment variables:
```bash
PORT=8080 npm run dev
```

### Development Commands

```bash
npm run dev        # Start with hot-reload (recommended for development)
npm run build      # Compile TypeScript to JavaScript
npm start          # Run compiled production build
npm test           # Run test suite (599 tests)
npm run lint       # Check code style
npm run typecheck  # TypeScript type checking
```

## Project Structure

```
src/
+-- driver/           # Core driver implementation
|   +-- driver.ts            # Main orchestrator
|   +-- object-registry.ts   # Object management
|   +-- scheduler.ts         # Heartbeat and call_out
|   +-- efun-bridge.ts       # Efuns exposed to mudlib
|   +-- command-manager.ts   # Command routing
|   +-- permissions.ts       # Permission system
|   +-- persistence/         # Save/load system
+-- isolation/        # V8 isolate sandboxing
+-- network/          # WebSocket server
+-- client/           # Web client UI (Linear.app-inspired)

mudlib/
+-- master.ts         # Master object
+-- simul_efun.ts     # Simulated efuns
+-- std/              # Standard library
|   +-- object.ts, room.ts, living.ts, player.ts, item.ts, ...
+-- daemons/          # Background services
|   +-- login.ts, channels.ts, help.ts, admin.ts
+-- cmds/             # Player commands
|   +-- player/       # Commands for all players
|   +-- builder/      # Builder-only commands
|   +-- admin/        # Admin-only commands
+-- areas/            # Game world
+-- data/             # Persistent state

docs/                 # Documentation
tests/                # Test suite
```

## Player Features

### Custom Display Names

Players can create colorful, personalized display names:

```
displayname Sir {blue}$N{/} the {green}Bold{/}
```

- Use `$N` as a placeholder for your actual name
- Use color codes like `{red}`, `{blue}`, `{green}`, `{bold}`, `{/}` (reset)
- Display names appear in room descriptions and the who list

### Who Command

View all connected players with a stylish ASCII art display:

```
who
```

Shows player names, display names, levels, and roles (Builder, Admin, etc.)

### Communication

- `say <message>` - Talk to players in the same room
- `shout <message>` - Broadcast to all players
- `ooc <message>` - Out-of-character chat channel

### Session Reconnection

If you disconnect unexpectedly, simply reconnect and log back in - you'll resume your existing session without losing your place in the game world.

## User Roles

| Role | Capabilities |
|------|-------------|
| **Player** | Connect, play the game, customize display name |
| **Builder** | Create/modify objects in assigned domains, use `goto` |
| **Senior Builder** | Cross-domain building, advanced APIs |
| **Administrator** | Full access, permission management, reload objects |

## Example: Creating a Room

```typescript
// /mudlib/areas/town/tavern.ts
import { Room } from '../../std/room.js';

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

  private handleOrder(args: string): boolean {
    const player = efuns.thisPlayer();
    if (!player) return false;
    efuns.send(player, 'The bartender pours you a frothy ale.');
    return true;
  }
}
```

## Documentation

Detailed documentation is available in the `/docs` directory:

- [Architecture](docs/architecture.md) - System design and components
- [Mudlib Guide](docs/mudlib-guide.md) - Creating game content
- [Efuns Reference](docs/efuns.md) - Driver API functions
- [Commands](docs/commands.md) - Command reference
- [Player Features](docs/player-features.md) - Display names, channels, who list
- [Daemons](docs/daemons.md) - Background services
- [Permissions](docs/permissions.md) - Permission system
- [Web Client](docs/client.md) - Browser client documentation
- [Deployment](docs/deployment.md) - Production deployment

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
