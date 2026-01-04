# PRD: Modern MUD Driver with Runtime Scripting

**Version:** 1.0
**Created:** 2026-01-03
**Status:** Draft
**Research Reference:** N/A (New initiative)

---

## 1. Introduction/Overview

This document defines the requirements for a modern Multi-User Dungeon (MUD) driver inspired by LDMud, but built for contemporary web technologies. The core innovation is replacing the traditional LPC scripting language with a modern, TypeScript-based scripting system that allows real-time, in-game creation and modification of game objects without requiring server recompilation.

Traditional MUD drivers like LDMud use LPC (a C-like language) for in-game scripting. While powerful, LPC has a steep learning curve and lacks modern tooling. This project aims to deliver the same flexibility and power of LPMud-style development while leveraging modern language features, web-based connectivity, and developer-friendly tooling.

### Problem Statement

MUD developers and builders face several challenges with traditional MUD drivers:
- **Compilation overhead**: Changes to game content often require server restarts or complex hot-reload mechanisms
- **Outdated scripting languages**: LPC and similar languages lack modern IDE support, type safety, and familiar syntax
- **Limited accessibility**: Telnet-based clients exclude modern users who expect browser-based experiences
- **Steep learning curve**: New builders must learn obscure languages to contribute content

This driver solves these problems by providing a modern, TypeScript-based scripting environment accessible through a web browser, with real-time object creation and modification capabilities.

---

## 2. Goals

| ID | Goal | Success Indicator |
|----|------|-------------------|
| G-1 | Enable real-time in-game scripting without server recompilation | Builders can create/modify objects while the game is running |
| G-2 | Provide a modern, familiar scripting language | TypeScript or TypeScript-like syntax with full IDE support |
| G-3 | Support web-based player connectivity | Players connect via modern web browsers |
| G-4 | Implement tiered permission system for builders | Different trust levels have appropriate capabilities |
| G-5 | Ensure script isolation for stability | Faulty scripts cannot crash the server or affect other objects |
| G-6 | Maintain LPMud-style flexibility | Support object inheritance, cloning, and dynamic instantiation |

---

## 3. User Stories

### Players
- **US-1**: As a player, I want to connect to the MUD through my web browser so that I don't need to install special software.
- **US-2**: As a player, I want the game to remain stable even if a builder makes a scripting mistake, so my experience isn't interrupted.
- **US-3**: As a player, I want to interact with a rich, dynamic world where objects behave intelligently.

### Builders (Content Creators)
- **US-4**: As a builder, I want to create new rooms, items, and NPCs while logged into the game, so I can see my changes immediately.
- **US-5**: As a builder, I want to use a modern scripting language with good error messages, so I can debug my creations efficiently.
- **US-6**: As a builder, I want to clone existing objects and modify them, so I can quickly create variations without starting from scratch.
- **US-7**: As a builder, I want to define custom behaviors and commands for my objects using familiar programming patterns.

### Administrators
- **US-8**: As an administrator, I want to grant different permission levels to builders, so I can control who can modify core systems.
- **US-9**: As an administrator, I want to deploy the MUD either on my own server or in the cloud, depending on my needs.
- **US-10**: As an administrator, I want the game world to persist to files, so I can version control and backup my world easily.

---

## 4. Functional Requirements

### 4.1 Core Engine

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-1 | The system MUST provide a runtime scripting engine that executes TypeScript (or a TypeScript-like language) without requiring server restart | Must Have | G-1, G-2 |
| FR-2 | The system MUST support object-oriented concepts: inheritance, composition, and polymorphism for game objects | Must Have | G-6 |
| FR-3 | The system MUST implement object cloning - creating new instances from prototype/template objects | Must Have | G-6, US-6 |
| FR-4 | The system MUST support dynamic object creation at runtime through in-game commands or scripting | Must Have | G-1, US-4 |
| FR-5 | The system MUST provide a base library of common MUD objects (Room, Item, NPC, Character, Container, etc.) | Must Have | US-4 |
| FR-6 | The system MUST execute each object's scripts in an isolated sandbox to prevent crashes from affecting other objects | Must Have | G-5, US-2 |
| FR-7 | The system MUST capture and log script errors without terminating the object or server | Must Have | G-5 |
| FR-8 | The system SHOULD support hot-reloading of object definitions while preserving object state | Should Have | G-1 |

### 4.2 Scripting Environment

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-10 | The scripting language MUST support static typing with type inference | Must Have | G-2 |
| FR-11 | The scripting language MUST provide async/await patterns for non-blocking operations | Must Have | G-2 |
| FR-12 | The system MUST provide a standard library of MUD-specific functions (movement, combat, inventory, communication) | Must Have | US-7 |
| FR-13 | The system MUST support event-driven programming (on enter room, on take item, on attack, etc.) | Must Have | US-7 |
| FR-14 | The system MUST provide an in-game code editor accessible to authorized builders | Must Have | US-4 |
| FR-15 | The system SHOULD provide syntax highlighting and basic autocomplete in the in-game editor | Should Have | G-2, US-5 |
| FR-16 | The system SHOULD support external editing via file system for advanced users | Should Have | US-5 |

### 4.3 Permission System

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-20 | The system MUST implement a tiered permission system with at least 4 levels: Player, Builder, Senior Builder, Administrator | Must Have | G-4, US-8 |
| FR-21 | Players MUST NOT have any scripting or building capabilities | Must Have | G-4 |
| FR-22 | Builders MUST be restricted to creating/modifying objects within their assigned areas/domains | Must Have | G-4 |
| FR-23 | Builders MUST NOT be able to modify core engine systems or other builders' protected objects | Must Have | G-4 |
| FR-24 | Senior Builders SHOULD have access to more powerful scripting APIs and cross-domain building | Should Have | G-4 |
| FR-25 | Administrators MUST have full access to all systems including permission management | Must Have | G-4, US-8 |
| FR-26 | The system MUST log all builder actions for audit purposes | Must Have | G-4 |

### 4.4 Web Client Connectivity

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-30 | The system MUST serve a web-based client accessible via modern browsers (Chrome, Firefox, Safari, Edge) | Must Have | G-3, US-1 |
| FR-31 | The system MUST use WebSocket connections for real-time bidirectional communication | Must Have | G-3 |
| FR-32 | The web client MUST support text-based MUD output with ANSI color rendering | Must Have | G-3 |
| FR-33 | The web client MUST provide a command input interface with history recall | Must Have | G-3 |
| FR-34 | The system SHOULD support multiple simultaneous connections from the same account (with configurable limits) | Should Have | G-3 |
| FR-35 | The web client SHOULD support responsive design for mobile browsers | Should Have | G-3 |

### 4.5 Persistence

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-40 | The system MUST persist the game world to the file system in a human-readable format (JSON, YAML, or similar) | Must Have | US-10 |
| FR-41 | The system MUST persist player accounts and character data | Must Have | US-10 |
| FR-42 | The system MUST support periodic auto-save of world state | Must Have | US-10 |
| FR-43 | The system MUST support manual save commands for administrators | Must Have | US-10 |
| FR-44 | Object scripts MUST be stored as separate files that can be version controlled | Must Have | US-10 |
| FR-45 | The system SHOULD support importing/exporting areas as portable packages | Should Have | US-10 |

### 4.6 Deployment

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| FR-50 | The system MUST run on Windows, Linux, and macOS | Must Have | US-9 |
| FR-51 | The system MUST be deployable as a standalone application | Must Have | US-9 |
| FR-52 | The system MUST be deployable as a Docker container | Must Have | US-9 |
| FR-53 | The system SHOULD provide configuration via environment variables for cloud deployment | Should Have | US-9 |
| FR-54 | The system SHOULD include health check endpoints for container orchestration | Should Have | US-9 |

---

## 5. Non-Goals (Out of Scope)

The following are explicitly **not** in scope for this version:

| ID | Non-Goal | Rationale |
|----|----------|-----------|
| NG-1 | Telnet/traditional MUD client support | Focus on modern web-based experience; telnet can be added later |
| NG-2 | Built-in combat system or game mechanics | The driver provides primitives; specific game mechanics are implemented by builders |
| NG-3 | Graphical/visual game client | This is a text-based MUD driver; graphical clients are a separate concern |
| NG-4 | Database persistence (SQL, MongoDB, etc.) | File-based persistence is simpler and sufficient for v1; database support can be added |
| NG-5 | Multi-server clustering | Single-server architecture for v1; clustering is a future enhancement |
| NG-6 | LPC compatibility layer | This is a new system, not a drop-in LDMud replacement |
| NG-7 | Built-in player-facing web UI beyond terminal | Rich web UI (maps, inventory panels, etc.) is out of scope |

---

## 6. Design Considerations

### 6.1 Scripting Language Choice

The scripting system should feel familiar to modern developers. Options to consider:

1. **TypeScript subset** - Use a sandboxed TypeScript interpreter (e.g., via QuickJS, V8 isolates, or custom parser)
2. **Custom DSL with TypeScript-like syntax** - Purpose-built for MUD development with TS-inspired syntax
3. **Lua with TypeScript-like wrapper** - Leverage Lua's proven embeddability with modern typing

Recommendation: A TypeScript subset executed in isolated V8 contexts or a similar sandboxed JavaScript runtime provides the best balance of familiarity and safety.

### 6.2 Object Model

The object system should support:
- **Prototypal inheritance** - Objects inherit from prototypes/templates
- **Multiple inheritance via mixins** - Compose behaviors from multiple sources
- **Virtual methods** - Override behavior in child objects
- **Event hooks** - Standard lifecycle events (create, destroy, heartbeat, etc.)

### 6.3 Example Object Definition

```typescript
// A basic sword item definition
import { Item, Character, DamageType } from '@mudforge/core';

export class BasicSword extends Item {
  damage = { min: 5, max: 10, type: DamageType.Slashing };
  weight = 3;

  get description(): string {
    return "A simple iron sword with a leather-wrapped hilt.";
  }

  onWield(wielder: Character): void {
    wielder.send("You grip the sword firmly.");
    wielder.room?.broadcast(`${wielder.name} draws a sword.`, [wielder]);
  }

  onAttack(attacker: Character, target: Character): number {
    const roll = Math.floor(Math.random() * (this.damage.max - this.damage.min + 1)) + this.damage.min;
    return roll;
  }
}
```

---

## 7. Technical Considerations

### 7.1 Technology Stack Suggestions

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| Server Runtime | Node.js or Deno | Native TypeScript support, excellent async I/O |
| Script Isolation | V8 Isolates (isolated-vm) or QuickJS | Memory and CPU limits per script |
| WebSocket | ws (Node.js) or native Deno | Standard, performant WebSocket implementation |
| Web Client | Vanilla JS/TS or lightweight framework | Simple terminal emulator, minimal dependencies |
| File Format | YAML or JSON | Human-readable, version control friendly |

### 7.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Web Client (Terminal UI)                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │ WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     MUD Driver Server                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Connection  │  │    World     │  │  Scripting   │      │
│  │   Manager    │  │   Manager    │  │   Engine     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Permission  │  │  Persistence │  │    Event     │      │
│  │   System     │  │    Layer     │  │     Bus      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    File System                               │
│  /world/rooms/  /world/items/  /accounts/  /scripts/        │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Dependencies and Constraints

- **Node.js 20+ or Deno 2+** - Required for modern JavaScript features
- **Memory considerations** - Each isolated script context consumes memory; plan for limits
- **File system access** - Server needs read/write access to world data directory
- **Port availability** - HTTP/WebSocket port (default 3000 or configurable)

### 7.4 Security Considerations

Per security standards (SEC-1 through SEC-7):

- **SEC-1**: No hardcoded secrets; all configuration via environment variables
- **SEC-2**: No PII in logs; player data sanitized in error messages
- **SEC-3**: All user input (commands, scripts) validated and sanitized
- **SEC-4**: All player actions require authentication
- **SEC-5**: Tiered permissions implement least-privilege access
- **SEC-6**: WebSocket connections should support WSS (TLS) in production
- **SEC-7**: Dependencies scanned for vulnerabilities before deployment

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

---

## 9. Open Questions

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-1 | Should we use Node.js or Deno as the runtime? Deno has better security defaults but smaller ecosystem | Architecture | TBD |
| OQ-2 | What isolated execution library should we use? (isolated-vm, vm2, QuickJS bindings) | Security, Performance | TBD |
| OQ-3 | Should the in-game editor be a full IDE experience or a simple text editor? | Scope, UX | TBD |
| OQ-4 | What file format for world persistence - YAML (more readable) or JSON (faster parsing)? | Developer experience | TBD |
| OQ-5 | Should we support a "mudlib" concept like LPMud where base game logic is separate from the driver? | Architecture | TBD |
| OQ-6 | How should builder "domains" be defined and enforced? By room area? By object namespace? | Permission system | TBD |

---

## 10. Assumptions

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| A-1 | TypeScript/JavaScript developers are more available than LPC developers | May need to reconsider language choice |
| A-2 | File-based persistence is sufficient for typical MUD scale (< 10,000 objects) | May need database migration path |
| A-3 | Web browser latency is acceptable for text-based MUD gameplay | May need to optimize or reconsider protocol |
| A-4 | Isolated V8/JS execution provides sufficient sandboxing | May need additional security measures |
| A-5 | Builders are willing to learn a new system rather than using familiar LPC | May need LPC compatibility layer |

---

## 11. Future Considerations

The following items are not in scope for v1 but should be considered for future versions:

- **Telnet gateway** - Allow traditional MUD clients to connect
- **Database persistence option** - PostgreSQL or SQLite for larger worlds
- **Multi-server architecture** - Distribute world across multiple servers
- **Visual world editor** - Web-based drag-and-drop room builder
- **Plugin system** - Allow third-party extensions to the driver
- **LPC compatibility mode** - Transpile or interpret LPC for migration from existing MUDs

---

## Standards Compliance

| Standard | Version | Status | Notes |
|----------|---------|--------|-------|
| PRINCIPLES | 1.0.0 | Compliant | User-first design, incremental delivery planned |
| SECURITY | 1.0.0 | Compliant | All SEC-1 through SEC-7 addressed in Technical Considerations |
| TERMS | 1.0.0 | Compliant | Standard terminology used throughout |
| CODE | 1.0.0 | N/A | PRD phase; code standards apply during implementation |
| PHASE-PRD | 1.0.0 | Compliant | All required sections included, requirements numbered and traceable |

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
| Builder | A trusted user who can create and modify game content |
| Clone | Creating a new instance of an object from a template/prototype |
| Heartbeat | A periodic event fired on objects (typically every 1-2 seconds) |
| Room | A location in the game world that can contain objects and characters |
| NPC | Non-Player Character - a game-controlled character |

---

## Appendix B: Reference Links

- LDMud GitHub: https://github.com/ldmud/ldmud
- LPC Language Reference: http://www.ldmud.eu/doc/
- V8 Isolates (isolated-vm): https://github.com/laverdet/isolated-vm
- QuickJS: https://bellard.org/quickjs/
