# PRD: Modern MUD Driver with Runtime Scripting

**Version:** 2.0
**Created:** 2026-01-03
**Updated:** 2026-01-04
**Status:** Draft
**Research Reference:** N/A (New initiative)

---

## Changelog from v1

- **Resolved OQ-1**: Deno selected as runtime environment
- **Resolved OQ-2**: Deno's built-in permissions and Web Workers for script isolation
- **Resolved OQ-3**: In-game editor confirmed as the primary editing experience
- **Resolved OQ-5**: Yes, mudlib separation - driver vs game logic
- **Added**: Comprehensive object hierarchy design (Master → inheritance tree)
- **Added**: LDMud architectural patterns adapted for modern implementation
- **Updated**: Technical considerations to reflect Deno-specific approaches

---

## 1. Introduction/Overview

This document defines the requirements for a modern Multi-User Dungeon (MUD) driver inspired by LDMud, but built for contemporary web technologies using **Deno** as the runtime. The core innovation is replacing the traditional LPC scripting language with a modern, TypeScript-based scripting system that allows real-time, in-game creation and modification of game objects without requiring server recompilation.

### Design Philosophy

Following LDMud's proven architecture, this driver embraces the principle that **everything is an object**. From the Master object that bootstraps the world, to rooms, items, NPCs, and even player connections—all entities share a common inheritance hierarchy. This provides:

- **Consistency**: All objects respond to the same base protocols
- **Flexibility**: Any object can be extended, cloned, or replaced at runtime
- **Discoverability**: Builders learn one object model that applies everywhere
- **Hot-reloading**: Objects can be updated without restarting the driver

### Problem Statement

MUD developers and builders face several challenges with traditional MUD drivers:
- **Compilation overhead**: Changes to game content often require server restarts or complex hot-reload mechanisms
- **Outdated scripting languages**: LPC and similar languages lack modern IDE support, type safety, and familiar syntax
- **Limited accessibility**: Telnet-based clients exclude modern users who expect browser-based experiences
- **Steep learning curve**: New builders must learn obscure languages to contribute content

This driver solves these problems by providing a modern, TypeScript-based scripting environment accessible through a web browser, with real-time object creation and modification capabilities while maintaining the architectural elegance of LDMud.

---

## 2. Goals

| ID | Goal | Success Indicator |
|----|------|-------------------|
| G-1 | Enable real-time in-game scripting without server recompilation | Builders can create/modify objects while the game is running |
| G-2 | Provide a modern, familiar scripting language (TypeScript on Deno) | Full TypeScript support with Deno's built-in tooling |
| G-3 | Support web-based player connectivity | Players connect via modern web browsers |
| G-4 | Implement tiered permission system for builders | Different trust levels have appropriate capabilities |
| G-5 | Ensure script isolation for stability | Faulty scripts cannot crash the server or affect other objects |
| G-6 | Maintain LDMud-style flexibility and object model | Everything is an object with consistent inheritance hierarchy |
| G-7 | Separate driver from mudlib | Core engine is game-agnostic; game logic lives in mudlib |

---

## 3. User Stories

### Players
- **US-1**: As a player, I want to connect to the MUD through my web browser so that I don't need to install special software.
- **US-2**: As a player, I want the game to remain stable even if a builder makes a scripting mistake, so my experience isn't interrupted.
- **US-3**: As a player, I want to interact with a rich, dynamic world where objects behave intelligently.

### Builders (Content Creators)
- **US-4**: As a builder, I want to create new rooms, items, and NPCs while logged into the game, so I can see my changes immediately.
- **US-5**: As a builder, I want to use TypeScript with good error messages, so I can debug my creations efficiently.
- **US-6**: As a builder, I want to clone existing objects and modify them, so I can quickly create variations without starting from scratch.
- **US-7**: As a builder, I want to define custom behaviors and commands for my objects using familiar programming patterns.
- **US-8**: As a builder, I want to understand a single object model that applies to everything in the game.

### Mudlib Developers
- **US-9**: As a mudlib developer, I want to define the base object hierarchy (rooms, items, NPCs) that builders extend.
- **US-10**: As a mudlib developer, I want to implement game systems (combat, magic, crafting) without modifying the driver.
- **US-11**: As a mudlib developer, I want the driver to provide hooks and events I can use to customize behavior.

### Administrators
- **US-12**: As an administrator, I want to grant different permission levels to builders, so I can control who can modify core systems.
- **US-13**: As an administrator, I want to deploy the MUD either on my own server or in the cloud, depending on my needs.
- **US-14**: As an administrator, I want the game world to persist to files, so I can version control and backup my world easily.

---

## 4. Functional Requirements

### 4.1 Object Model and Hierarchy

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-1 | The system MUST implement a root `MudObject` class from which ALL game objects inherit | Must Have | G-6, US-8 |
| FR-2 | The system MUST implement a `Master` object that bootstraps the world and handles global events | Must Have | G-6 |
| FR-3 | The system MUST support single inheritance with mixin composition for objects | Must Have | G-6 |
| FR-4 | Every object MUST have a unique object ID (path-based, like `/std/room` or `/areas/town/tavern`) | Must Have | G-6 |
| FR-5 | The system MUST support object cloning - creating instances from blueprint objects | Must Have | G-6, US-6 |
| FR-6 | Cloned objects MUST maintain a reference to their blueprint for inheritance resolution | Must Have | G-6 |
| FR-7 | The system MUST support dynamic property access on objects (get/set with inheritance) | Must Have | G-6 |
| FR-8 | Objects MUST support lifecycle hooks: `onCreate`, `onDestroy`, `onClone`, `onReset` | Must Have | G-6 |
| FR-9 | The system MUST implement a heartbeat mechanism for objects that register for periodic updates | Must Have | G-6 |
| FR-10 | The system MUST provide standard base objects in the mudlib: `Room`, `Item`, `Living`, `Player`, `NPC`, `Container` | Must Have | G-6, US-9 |

### 4.2 Core Engine (Driver)

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-20 | The driver MUST be implemented in Deno with TypeScript | Must Have | G-2 |
| FR-21 | The driver MUST provide a runtime scripting engine that executes TypeScript without requiring restart | Must Have | G-1 |
| FR-22 | The driver MUST be game-agnostic; all game logic MUST reside in the mudlib layer | Must Have | G-7 |
| FR-23 | The driver MUST provide APIs for: object management, player connections, file I/O, events, and scheduling | Must Have | G-7 |
| FR-24 | The driver MUST call hooks on the Master object for global events (player connect, player disconnect, error, shutdown) | Must Have | G-7, US-11 |
| FR-25 | The driver MUST support hot-reloading of object definitions while preserving instance state | Must Have | G-1 |
| FR-26 | The driver MUST execute object scripts in isolated Deno Workers with restricted permissions | Must Have | G-5 |
| FR-27 | The driver MUST capture and log script errors without terminating the object or server | Must Have | G-5, US-2 |
| FR-28 | The driver MUST enforce memory and CPU limits per object/script execution | Must Have | G-5 |
| FR-29 | The driver MUST provide an `efun` (external function) API callable from mudlib code | Must Have | G-7 |

### 4.3 Scripting Environment

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-30 | The scripting language MUST be TypeScript executed by Deno | Must Have | G-2 |
| FR-31 | Scripts MUST have access to a sandboxed subset of Deno APIs (no raw file system, no network except via driver APIs) | Must Have | G-5 |
| FR-32 | The system MUST provide a standard library of MUD-specific functions (efuns) for movement, communication, combat hooks, etc. | Must Have | US-7 |
| FR-33 | The system MUST support event-driven programming with typed events | Must Have | US-7 |
| FR-34 | The system MUST provide an in-game code editor accessible to authorized builders | Must Have | US-4 |
| FR-35 | The in-game editor MUST support syntax highlighting for TypeScript | Must Have | G-2, US-5 |
| FR-36 | The in-game editor MUST display TypeScript compilation errors inline | Must Have | US-5 |
| FR-37 | The in-game editor SHOULD support basic autocomplete for mudlib APIs | Should Have | US-5 |
| FR-38 | Scripts MUST be stored as `.ts` files in the mudlib directory structure | Must Have | US-14 |

### 4.4 Permission System

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-40 | The system MUST implement a tiered permission system with at least 4 levels: Player, Builder, Senior Builder, Administrator | Must Have | G-4, US-12 |
| FR-41 | Players MUST NOT have any scripting or building capabilities | Must Have | G-4 |
| FR-42 | Builders MUST be restricted to creating/modifying objects within their assigned domains (directory paths) | Must Have | G-4 |
| FR-43 | Builders MUST NOT be able to modify `/std/` (standard library) or other builders' protected objects | Must Have | G-4 |
| FR-44 | Senior Builders SHOULD have access to more powerful scripting APIs and cross-domain building | Should Have | G-4 |
| FR-45 | Administrators MUST have full access to all systems including permission management and driver commands | Must Have | G-4, US-12 |
| FR-46 | The system MUST log all builder actions (create, modify, delete, clone) for audit purposes | Must Have | G-4 |
| FR-47 | Permission checks MUST be enforced by the driver, not the mudlib (defense in depth) | Must Have | G-4, G-5 |

### 4.5 Web Client Connectivity

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-50 | The system MUST serve a web-based client accessible via modern browsers (Chrome, Firefox, Safari, Edge) | Must Have | G-3, US-1 |
| FR-51 | The system MUST use WebSocket connections for real-time bidirectional communication | Must Have | G-3 |
| FR-52 | The web client MUST render styled text output (colors, bold, etc.) | Must Have | G-3 |
| FR-53 | The web client MUST provide a command input interface with history recall (up/down arrows) | Must Have | G-3 |
| FR-54 | The web client MUST support command aliases configurable by the player | Should Have | G-3 |
| FR-55 | The system SHOULD support multiple simultaneous connections from the same account (configurable) | Should Have | G-3 |
| FR-56 | The web client SHOULD support responsive design for mobile browsers | Should Have | G-3 |
| FR-57 | The driver MUST abstract connection handling so the mudlib receives `Player` objects, not raw sockets | Must Have | G-7 |

### 4.6 Persistence

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-60 | The system MUST persist the game world to the file system in human-readable TypeScript/JSON files | Must Have | US-14 |
| FR-61 | Object blueprints MUST be stored as `.ts` files that can be version controlled | Must Have | US-14 |
| FR-62 | Object instance state (clones) MUST be serializable to JSON for persistence | Must Have | US-14 |
| FR-63 | The system MUST persist player accounts and character data | Must Have | US-14 |
| FR-64 | The system MUST support periodic auto-save of world state | Must Have | US-14 |
| FR-65 | The system MUST support manual save commands for administrators | Must Have | US-14 |
| FR-66 | The system SHOULD support importing/exporting areas as portable packages (zip of directory) | Should Have | US-14 |

### 4.7 Deployment

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-70 | The system MUST run on Windows, Linux, and macOS via Deno | Must Have | US-13 |
| FR-71 | The system MUST be deployable as a standalone Deno application | Must Have | US-13 |
| FR-72 | The system MUST be deployable as a Docker container | Must Have | US-13 |
| FR-73 | The system MUST provide configuration via environment variables and/or config files | Must Have | US-13 |
| FR-74 | The system SHOULD include health check endpoints for container orchestration | Should Have | US-13 |
| FR-75 | The system SHOULD support Deno Deploy for serverless edge deployment | Nice to Have | US-13 |

---

## 5. Non-Goals (Out of Scope)

| ID | Non-Goal | Rationale |
|----|----------|-----------|
| NG-1 | Telnet/traditional MUD client support | Focus on modern web-based experience; can be added later via gateway |
| NG-2 | Built-in combat/magic/crafting systems | The driver provides primitives; game mechanics are mudlib responsibility |
| NG-3 | Graphical/visual game client | This is a text-based MUD driver; graphical clients are a separate project |
| NG-4 | Database persistence (SQL, MongoDB) | File-based persistence is sufficient for v1; database can be added |
| NG-5 | Multi-server clustering | Single-server architecture for v1 |
| NG-6 | LPC compatibility/transpilation | This is a new system with its own idioms |
| NG-7 | Rich web UI (maps, inventory panels) | Terminal-style interface only for v1 |

---

## 6. Object Hierarchy Design

Following LDMud's architectural patterns, the system implements a strict object hierarchy where everything is an object.

### 6.1 Core Hierarchy

```
MudObject                          # Root of all objects
├── Master                         # Singleton: world bootstrap, global hooks
├── SimulatedEfun                  # Singleton: mudlib-provided efun extensions
│
├── Room                           # Base for all locations
│   ├── OutdoorRoom                # Rooms with weather, time-of-day
│   ├── IndoorRoom                 # Enclosed spaces
│   └── [Builder-defined rooms]
│
├── Item                           # Base for all carryable objects
│   ├── Weapon                     # Items that can be wielded for combat
│   │   ├── Sword
│   │   ├── Axe
│   │   └── [Builder-defined weapons]
│   ├── Armor                      # Items that can be worn for protection
│   ├── Container                  # Items that hold other items
│   │   ├── Bag
│   │   └── Chest
│   ├── Consumable                 # Items that are used up (food, potions)
│   └── [Builder-defined items]
│
├── Living                         # Base for all entities that can act
│   ├── Player                     # Connected human players
│   │   └── PlayerBody             # The in-game body of a player
│   └── NPC                        # Non-player characters
│       ├── Monster                # Hostile NPCs
│       ├── Merchant               # NPCs that buy/sell
│       └── [Builder-defined NPCs]
│
└── Daemon                         # Background service objects
    ├── LoginDaemon                # Handles new connections
    ├── CombatDaemon               # Manages combat resolution (if applicable)
    └── [Mudlib-defined daemons]
```

### 6.2 Object Identification

Every object has a unique identifier following LDMud conventions:

| Type | Example Path | Description |
|------|--------------|-------------|
| Blueprint | `/std/room` | The base Room class definition |
| Blueprint | `/std/weapon/sword` | The base Sword class |
| Blueprint | `/areas/town/tavern` | A specific room definition |
| Clone | `/areas/town/tavern#1` | First instance of the tavern |
| Clone | `/std/weapon/sword#47` | The 47th sword cloned from blueprint |

### 6.3 Key Object Protocols

All objects inheriting from `MudObject` respond to these standard methods:

```typescript
interface MudObject {
  // Identity
  readonly objectPath: string;      // e.g., "/std/room"
  readonly objectId: string;        // e.g., "/std/room#5"
  readonly isClone: boolean;
  readonly blueprint: MudObject | null;

  // Lifecycle
  onCreate(): void;                 // Called when object is first created
  onClone(original: MudObject): void; // Called on the clone after cloning
  onDestroy(): void;                // Called before object is destroyed
  onReset(): void;                  // Called periodically to reset state

  // Hierarchy
  environment: MudObject | null;    // What contains this object
  inventory: MudObject[];           // What this object contains
  moveTo(destination: MudObject): boolean;

  // Interaction
  id(name: string): boolean;        // Does this object match the name?
  shortDesc: string;                // Brief description
  longDesc: string;                 // Full description

  // Commands
  addAction(verb: string, handler: ActionHandler): void;
  removeAction(verb: string): void;
}
```

### 6.4 The Master Object

The Master object (inspired by LDMud's `master.c`) is a singleton that the driver consults for global decisions:

```typescript
interface Master {
  // Startup
  onDriverStart(): void;            // Called when driver boots
  onPreload(): string[];            // Return list of objects to preload

  // Connections
  onPlayerConnect(connection: Connection): string;  // Return path to login object
  onPlayerDisconnect(player: Player, reason: string): void;

  // Security
  validRead(path: string, player: Player): boolean;
  validWrite(path: string, player: Player): boolean;
  validExec(objectPath: string, player: Player): boolean;

  // Error handling
  onRuntimeError(error: Error, object: MudObject, context: string): void;
  onCompileError(path: string, errors: CompileError[]): void;

  // Object management
  onObjectCreate(object: MudObject): void;
  onObjectDestroy(object: MudObject): void;

  // Periodic
  onHeartbeat(): void;              // Called every heartbeat cycle
  onReset(): void;                  // Called periodically for world reset
}
```

### 6.5 Living Objects

Objects that can take actions (players, NPCs) extend `Living`:

```typescript
interface Living extends MudObject {
  // Stats (game-specific, defined in mudlib)
  stats: Stats;

  // Location
  room: Room;

  // Actions
  command(input: string): boolean;  // Parse and execute a command

  // Communication
  receive(message: string, type?: MessageType): void;
  say(message: string): void;
  emote(action: string): void;

  // Combat (if mudlib implements it)
  attack(target: Living): void;
  receiveDamage(amount: number, type: DamageType, source: Living): number;

  // Inventory
  give(item: Item, target: Living): boolean;
  drop(item: Item): boolean;
  take(item: Item): boolean;
}
```

---

## 7. Technical Considerations

### 7.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Deno 2.x | Built-in TypeScript, security-first, modern APIs |
| Script Isolation | Deno Workers + permissions | Native sandboxing without external dependencies |
| WebSocket | Deno.serve + WebSocket API | Native Deno, no external packages needed |
| Web Client | Vanilla TypeScript | Minimal dependencies, bundled by Deno |
| File Format | TypeScript (code) + JSON (state) | Human-readable, version control friendly |
| Build Tool | Deno native | No npm, no node_modules |

### 7.2 Script Isolation Strategy

Deno's permission system and Worker API provide script isolation:

```typescript
// Driver spawns isolated worker for mudlib code
const worker = new Worker(
  new URL("./mudlib-runner.ts", import.meta.url).href,
  {
    type: "module",
    deno: {
      permissions: {
        read: ["/path/to/mudlib"],  // Only read mudlib files
        write: false,                // No direct file writes
        net: false,                  // No network access
        env: false,                  // No environment variables
        run: false,                  // Cannot spawn processes
      },
    },
  }
);
```

For per-object isolation within the mudlib:
- Objects run in isolated contexts with controlled API access
- CPU time limits via `AbortController` timeouts
- Memory limits via Worker resource constraints
- Errors in one object don't propagate to others

### 7.3 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Browser                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Web Client (Terminal UI)                   │  │
│  │    - Command input with history                           │  │
│  │    - Styled text output                                   │  │
│  │    - In-game code editor (for builders)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │ WSS (WebSocket Secure)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MUD Driver (Deno)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Connection  │  │   Object    │  │  Scheduler  │              │
│  │  Manager    │  │  Registry   │  │ (heartbeat) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Permission  │  │    Efun     │  │   Compile   │              │
│  │  Enforcer   │  │   Bridge    │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                          │                                       │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Isolated Mudlib Worker                        │  │
│  │  ┌─────────┐  ┌─────────────┐  ┌─────────────────────┐    │  │
│  │  │ Master  │  │ Sim Efuns   │  │ Object Instances    │    │  │
│  │  └─────────┘  └─────────────┘  │ (rooms, items, etc) │    │  │
│  │                                └─────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      File System (Mudlib)                        │
│  /mudlib/                                                        │
│  ├── master.ts              # Master object                      │
│  ├── simul_efun.ts          # Simulated efuns                    │
│  ├── std/                   # Standard library                   │
│  │   ├── object.ts          # MudObject base                     │
│  │   ├── room.ts            # Room base                          │
│  │   ├── living.ts          # Living base                        │
│  │   ├── player.ts          # Player object                      │
│  │   └── item.ts            # Item base                          │
│  ├── daemons/               # Background services                │
│  ├── areas/                 # Game world content                 │
│  │   └── town/                                                   │
│  │       ├── tavern.ts                                           │
│  │       └── market.ts                                           │
│  └── data/                  # Persistent state (JSON)            │
│      ├── players/                                                │
│      └── world-state.json                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Driver ↔ Mudlib API (Efuns)

The driver exposes "external functions" (efuns) that mudlib code can call:

```typescript
// Object management
efun.cloneObject(path: string): MudObject;
efun.destruct(obj: MudObject): void;
efun.loadObject(path: string): MudObject;
efun.findObject(path: string): MudObject | null;
efun.allInventory(obj: MudObject): MudObject[];
efun.environment(obj: MudObject): MudObject | null;
efun.move(obj: MudObject, dest: MudObject): boolean;

// Player/connection
efun.thisPlayer(): Player | null;
efun.thisObject(): MudObject;
efun.allPlayers(): Player[];
efun.send(player: Player, message: string): void;
efun.input(player: Player, prompt: string, handler: InputHandler): void;

// File I/O (sandboxed to mudlib directory)
efun.readFile(path: string): string;
efun.writeFile(path: string, content: string): boolean;
efun.fileExists(path: string): boolean;
efun.readDir(path: string): string[];

// Scheduling
efun.callOut(callback: () => void, delay: number): number;
efun.removeCallOut(id: number): boolean;
efun.setHeartbeat(obj: MudObject, enable: boolean): void;

// Utility
efun.time(): number;
efun.random(max: number): number;
efun.capitalize(str: string): string;
efun.explode(str: string, delimiter: string): string[];
efun.implode(arr: string[], delimiter: string): string;

// Compilation
efun.compileObject(path: string): MudObject;
efun.updateObject(path: string): boolean;  // Hot-reload
```

### 7.5 LDMud Patterns: Modernized

| LDMud Pattern | Modern Implementation |
|---------------|----------------------|
| `.c` LPC files | `.ts` TypeScript files |
| `inherit` keyword | `extends` class inheritance + mixins |
| `#include` preprocessor | `import` ES modules |
| `create()` | `onCreate()` method |
| `reset()` | `onReset()` method |
| `init()` for adding commands | `addAction()` in `onEnter()` |
| `query_*` / `set_*` | TypeScript getters/setters |
| Shadow objects | Decorator pattern or Proxy objects |
| `this_player()` | `efun.thisPlayer()` or context injection |
| `call_other(obj, "method", args)` | Direct method call: `obj.method(args)` |
| Closures/lambdas | Arrow functions |
| Mappings | `Map<K,V>` or plain objects |
| Arrays | Typed arrays with full Array methods |

### 7.6 Security Considerations

Per security standards (SEC-1 through SEC-7):

| Standard | Implementation |
|----------|----------------|
| SEC-1 | Configuration via `deno.json` and environment variables; no hardcoded secrets |
| SEC-2 | Player data sanitized in logs; no PII in error messages sent to builders |
| SEC-3 | All command input parsed and validated; scripts run in sandboxed workers |
| SEC-4 | WebSocket connections require authentication after initial handshake |
| SEC-5 | Tiered permissions enforced by driver; workers have minimal Deno permissions |
| SEC-6 | Production deployments use WSS (TLS); HTTP Strict Transport Security headers |
| SEC-7 | Deno's lockfile (`deno.lock`) ensures dependency integrity; minimal external deps |

---

## 8. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Script execution latency | < 10ms for typical object interactions | Performance profiling |
| Concurrent connections | Support 100+ simultaneous players | Load testing |
| Script isolation effectiveness | 0 server crashes from script errors | Error logs, uptime monitoring |
| Builder productivity | Create a basic room with items in < 5 minutes | User testing with new builders |
| Hot-reload success rate | 99%+ of code changes apply without restart | Deployment logs |
| World save reliability | 0 data loss events | Backup verification, checksums |
| TypeScript compilation time | < 500ms for single file updates | Profiling |

---

## 9. Open Questions

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-1 | What is the heartbeat interval? LDMud uses 2 seconds by default | Performance tuning | TBD |
| OQ-2 | Should we support "shadows" (LDMud's way to intercept object methods)? | Flexibility vs complexity | TBD |
| OQ-3 | How should builder domains map to directory structure? One directory per builder? | Permission system | TBD |
| OQ-4 | Should the web client support multiple panes (e.g., chat separate from game output)? | UX scope | TBD |

---

## 10. Assumptions

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| A-1 | TypeScript/JavaScript developers are more available than LPC developers | May need to reconsider language choice |
| A-2 | File-based persistence is sufficient for typical MUD scale (< 10,000 objects) | May need database migration path |
| A-3 | Web browser latency is acceptable for text-based MUD gameplay | May need protocol optimization |
| A-4 | Deno Worker isolation provides sufficient sandboxing | May need additional security measures |
| A-5 | Builders will appreciate TypeScript over LPC | May need tutorials and migration guides |
| A-6 | Deno's stability is sufficient for long-running server processes | May need Node.js fallback |

---

## 11. Future Considerations

- **Telnet gateway**: Allow traditional MUD clients via a telnet-to-WebSocket bridge
- **Database persistence**: Optional PostgreSQL/SQLite backend for larger worlds
- **Multi-server architecture**: Distribute world across servers with shared state
- **Visual world editor**: Web-based drag-and-drop room/area builder
- **Plugin system**: Third-party driver extensions
- **Shadow objects**: Full LDMud-style shadow support if needed
- **Intermud protocol**: Connect with other MUDs for cross-game chat/features

---

## Standards Compliance

| Standard | Version | Status | Notes |
|----------|---------|--------|-------|
| PRINCIPLES | 1.0.0 | Compliant | User-first design, incremental delivery, maintainable architecture |
| SECURITY | 1.0.0 | Compliant | All SEC requirements addressed in Section 7.6 |
| TERMS | 1.0.0 | Compliant | Standard terminology used; MUD-specific terms in glossary |
| CODE | 1.0.0 | N/A | PRD phase; code standards apply during implementation |
| PHASE-PRD | 1.0.0 | Compliant | All required sections, numbered requirements, traceability |

**Standards Manifest Version:** 1.0.0

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| MUD | Multi-User Dungeon - a text-based multiplayer online game |
| Driver | The core engine that runs the MUD, handles connections, and executes scripts |
| Mudlib | The game-specific code built on top of the driver (rooms, items, mechanics) |
| LPC | Lars Pensjö C - the scripting language used by LPMud-derived servers |
| LDMud | A popular open-source LPMud driver |
| Efun | External function - a function provided by the driver to mudlib code |
| Simul Efun | Simulated efun - mudlib code that extends/overrides driver efuns |
| Master | The singleton object that handles global driver callbacks |
| Builder | A trusted user who can create and modify game content |
| Blueprint | A prototype object that can be cloned to create instances |
| Clone | An instance created from a blueprint object |
| Heartbeat | A periodic event fired on objects (typically every 1-2 seconds) |
| Room | A location in the game world that can contain objects and characters |
| Living | An object that can take actions (players and NPCs) |
| NPC | Non-Player Character - a game-controlled character |
| Shadow | An object that intercepts method calls on another object (LDMud feature) |
| Domain | A builder's assigned area/directory where they have write permission |
| Daemon | A background service object that provides game-wide functionality |

---

## Appendix B: Example Mudlib Code

### Room Definition

```typescript
// /areas/town/tavern.ts
import { Room } from "/std/room.ts";
import { efun } from "/driver/efuns.ts";

export class Tavern extends Room {
  override shortDesc = "The Rusty Tankard";

  override get longDesc(): string {
    return `You stand in a cozy tavern. A fire crackles in the hearth,
and the smell of roasting meat fills the air. The bar stretches
along the north wall, where a ${this.bartenderPresent ? "friendly bartender" : "vacant stool"} awaits.`;
  }

  private bartenderPresent = true;

  override onCreate(): void {
    super.onCreate();

    // Add exits
    this.addExit("south", "/areas/town/market");
    this.addExit("up", "/areas/town/tavern_rooms");

    // Clone and place the bartender
    const bartender = efun.cloneObject("/npcs/town/bartender");
    bartender.moveTo(this);

    // Add room-specific commands
    this.addAction("order", this.handleOrder.bind(this));
  }

  private handleOrder(player: Player, args: string): boolean {
    if (!this.bartenderPresent) {
      player.receive("There's no one here to take your order.");
      return true;
    }

    if (args === "ale") {
      player.receive("The bartender pours you a frothy ale.");
      const ale = efun.cloneObject("/items/food/ale");
      ale.moveTo(player);
      return true;
    }

    player.receive("The bartender says, 'We have ale. Just ale.'");
    return true;
  }
}
```

### Item Definition

```typescript
// /std/weapon/sword.ts
import { Weapon, DamageType } from "/std/weapon.ts";
import type { Living } from "/std/living.ts";

export class Sword extends Weapon {
  override shortDesc = "a sword";
  override longDesc = "A simple but well-crafted iron sword.";

  override damage = { min: 5, max: 12 };
  override damageType = DamageType.Slashing;
  override weight = 4;

  override id(name: string): boolean {
    return ["sword", "iron sword", "blade"].includes(name.toLowerCase());
  }

  override onWield(wielder: Living): void {
    wielder.receive("You grip the sword's leather-wrapped hilt.");
    wielder.room?.broadcast(
      `${wielder.shortDesc} draws a sword.`,
      { exclude: [wielder] }
    );
  }

  override onUnwield(wielder: Living): void {
    wielder.receive("You sheathe the sword.");
  }
}
```

---

## Appendix C: Reference Links

- LDMud GitHub: https://github.com/ldmud/ldmud
- LDMud Documentation: https://www.ldmud.eu/doc/
- Deno Manual: https://docs.deno.com/
- Deno Workers: https://docs.deno.com/runtime/manual/runtime/workers
- Deno Permissions: https://docs.deno.com/runtime/manual/basics/permissions
