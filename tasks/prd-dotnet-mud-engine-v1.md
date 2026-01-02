# Product Requirements Document (PRD): .NET MUD Engine v1

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Created** | 2026-01-02 |
| **Status** | Draft |
| **Research Reference** | `rsd-browser-mud-game-v1.md` |

---

## 1. Introduction / Overview

### 1.1 What is This?

A modern Multi-User Dungeon (MUD) game engine built with .NET and C#, featuring a browser-based frontend for connecting and interacting with the game world. Unlike traditional MUDs that rely on telnet clients, this engine provides a WebSocket-powered browser interface with optional graphical/ASCII map visualization.

### 1.2 Problem Statement

Existing MUD engines are either:
- **Outdated**: Written in legacy languages (C, LPC, MUSH code) with telnet-only interfaces
- **Framework-locked**: Python-based (Evennia) or Node.js-based (Ranvier), limiting developers in the .NET ecosystem
- **Inflexible**: Hard-coded game logic with no plugin architecture
- **Inaccessible**: Require telnet clients that feel foreign to modern users

There is no modern, extensible MUD engine in the .NET ecosystem that supports browser-based play out of the box.

### 1.3 Solution

Build **MudForge** (working title)—an open-source .NET MUD engine that:
- Runs in the browser via WebSockets (no telnet required)
- Provides a plugin architecture for extensibility
- Includes a playable demo game demonstrating engine capabilities
- Uses modern C# patterns and practices
- Supports real-time multiplayer with persistent world state

### 1.4 Target Audience

**Primary:**
- .NET developers who want to build text-based multiplayer games
- Solo developers and small teams creating MUD or MUD-like games
- Hobbyist game developers in the C# ecosystem

**Secondary:**
- Players seeking browser-accessible MUD experiences
- Accessibility-focused developers (screen reader support)

---

## 2. Goals

| ID | Goal | Success Metric |
|----|------|----------------|
| G-1 | Provide a functional, extensible MUD engine in .NET | Engine can run a playable demo game with multiple concurrent players |
| G-2 | Enable browser-based play without additional client software | Users can connect and play via any modern browser |
| G-3 | Support plugin-based extensibility | Third-party developers can add commands, systems, and content without modifying core |
| G-4 | Include a complete demo game | Demo includes character creation, exploration, combat, and basic progression |
| G-5 | Open source for community adoption | Release under MIT or Apache 2.0 license on GitHub |

---

## 3. User Stories

### 3.1 Engine Developer (Building a Game)

> **US-1:** As a .NET developer, I want to create a new MUD game by extending the engine, so that I don't have to build networking, persistence, and core systems from scratch.

> **US-2:** As a game developer, I want to define rooms, items, and NPCs in data files (JSON/YAML), so that I can create content without recompiling the engine.

> **US-3:** As a game developer, I want to create custom commands via plugins, so that I can add unique gameplay mechanics to my MUD.

> **US-4:** As a game developer, I want to write custom game logic in C# plugins, so that I can implement complex systems (crafting, factions, quests) without modifying engine core.

### 3.2 Player

> **US-5:** As a player, I want to connect to the MUD via my web browser, so that I can play without installing any software.

> **US-6:** As a player, I want to create a character and explore the world, so that I can experience the game's content.

> **US-7:** As a player, I want to see an ASCII/graphical map of my surroundings, so that I can visualize where I am in the world.

> **US-8:** As a player, I want to chat with other players in real-time, so that I can be part of the game's community.

> **US-9:** As a visually impaired player, I want the interface to work with my screen reader, so that I can enjoy the game.

### 3.3 Server Operator

> **US-10:** As a server operator, I want to run the MUD on a single VPS, so that hosting costs remain low.

> **US-11:** As a server operator, I want to configure the game via settings files, so that I don't need to modify code to adjust server parameters.

---

## 4. Functional Requirements

### 4.1 Core Engine

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-1** | The engine SHALL provide a real-time game loop that processes player commands and world updates at a configurable tick rate (default: 10 ticks/second). | Must Have | G-1 |
| **FR-2** | The engine SHALL support multiple concurrent player connections via WebSocket. | Must Have | G-1, G-2 |
| **FR-3** | The engine SHALL maintain persistent world state (rooms, items, NPCs) in memory with configurable save intervals. | Must Have | G-1 |
| **FR-4** | The engine SHALL support data-driven content loading from JSON files for rooms, items, NPCs, and other game objects. | Must Have | US-2 |
| **FR-5** | The engine SHALL provide a plugin system allowing third-party assemblies to register commands, event handlers, and game systems. | Must Have | G-3, US-3, US-4 |
| **FR-6** | The engine SHALL expose a dependency injection container for plugins to access core services. | Must Have | G-3 |
| **FR-7** | The engine SHALL provide an event bus for game events (player entered room, combat started, item picked up, etc.) that plugins can subscribe to. | Must Have | G-3 |
| **FR-8** | The engine SHALL log all significant events using structured logging (Serilog-compatible). | Must Have | G-1 |

### 4.2 Player System

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-10** | The system SHALL allow players to create accounts with email and password. | Must Have | US-5, US-6 |
| **FR-11** | The system SHALL hash passwords using bcrypt or Argon2 before storage. | Must Have | SEC-1 |
| **FR-12** | The system SHALL allow players to create and manage multiple characters per account. | Must Have | US-6 |
| **FR-13** | The system SHALL persist character data (stats, inventory, location) to a database. | Must Have | US-6 |
| **FR-14** | The system SHALL prevent duplicate sign-ins for the same character (kick previous session or reject new). | Should Have | G-1 |
| **FR-15** | The system SHALL track player online/offline status and last seen timestamp. | Should Have | US-8 |

### 4.3 World System

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-20** | The world SHALL consist of interconnected rooms with unique identifiers. | Must Have | US-6 |
| **FR-21** | Each room SHALL have a name, description, and exits to adjacent rooms. | Must Have | US-6 |
| **FR-22** | Rooms SHALL support dynamic descriptions based on time of day, player state, or other conditions. | Should Have | US-6 |
| **FR-23** | The world SHALL support items that can be placed in rooms, picked up, dropped, and stored in containers. | Must Have | US-6 |
| **FR-24** | The world SHALL support NPCs with configurable behaviors (static, wandering, hostile, merchant). | Must Have | G-4 |
| **FR-25** | The world SHALL support doors/portals that can be opened, closed, locked, and unlocked. | Should Have | US-6 |
| **FR-26** | Room data SHALL be loaded from JSON files at startup with support for hot-reloading during development. | Must Have | US-2 |

### 4.4 Command System

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-30** | The engine SHALL provide a command parser that accepts text input and routes to registered command handlers. | Must Have | G-1 |
| **FR-31** | Commands SHALL support aliases (e.g., "n" for "north", "i" for "inventory"). | Must Have | G-1 |
| **FR-32** | The engine SHALL include built-in commands: movement (n/s/e/w/up/down), look, inventory, get, drop, say, whisper, who, help, quit. | Must Have | G-4 |
| **FR-33** | Commands SHALL support arguments and flags (e.g., `give sword to guard`, `look at chest`). | Must Have | G-1 |
| **FR-34** | Plugins SHALL be able to register new commands without modifying engine code. | Must Have | G-3, US-3 |
| **FR-35** | The command system SHALL support permission levels (player, builder, admin, owner). | Should Have | G-1 |

### 4.5 Communication System

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-40** | Players SHALL be able to send messages visible to all players in the same room (`say`). | Must Have | US-8 |
| **FR-41** | Players SHALL be able to send private messages to specific players (`whisper`, `tell`). | Must Have | US-8 |
| **FR-42** | The engine SHALL support global channels that players can join/leave (e.g., "chat", "newbie", "trade"). | Should Have | US-8 |
| **FR-43** | The engine SHALL support emotes/actions (`/me waves`). | Should Have | US-8 |
| **FR-44** | Messages SHALL include sender identification and timestamp. | Must Have | US-8 |

### 4.6 Combat System (Demo Game)

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-50** | The demo game SHALL include a turn-based or real-time combat system. | Must Have | G-4 |
| **FR-51** | Combat SHALL involve attack, defend, and flee actions at minimum. | Must Have | G-4 |
| **FR-52** | Characters SHALL have health points (HP) that decrease when damaged and cause death at zero. | Must Have | G-4 |
| **FR-53** | Death SHALL have consequences (respawn at designated location, possible item loss or XP penalty—configurable). | Should Have | G-4 |
| **FR-54** | NPCs SHALL be able to initiate combat with players based on behavior configuration. | Should Have | G-4 |

### 4.7 Progression System (Demo Game)

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-60** | Characters SHALL have attributes/stats (e.g., Strength, Agility, Intelligence) that affect gameplay. | Must Have | G-4 |
| **FR-61** | Characters SHALL earn experience points (XP) from combat and quests. | Must Have | G-4 |
| **FR-62** | Characters SHALL level up when XP thresholds are reached, improving stats. | Must Have | G-4 |
| **FR-63** | The demo game SHALL include at least 3 character classes with distinct abilities. | Should Have | G-4 |

### 4.8 Browser Client

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-70** | The engine SHALL include a browser-based client served via HTTP/HTTPS. | Must Have | G-2 |
| **FR-71** | The client SHALL connect to the server via WebSocket for real-time communication. | Must Have | G-2 |
| **FR-72** | The client SHALL display game output in a scrollable text area with ANSI color support. | Must Have | G-2 |
| **FR-73** | The client SHALL provide a text input field for entering commands. | Must Have | G-2 |
| **FR-74** | The client SHALL maintain command history accessible via up/down arrow keys. | Should Have | G-2 |
| **FR-75** | The client SHALL display an optional ASCII/graphical map panel showing the current area. | Must Have | US-7 |
| **FR-76** | The client SHALL display a status panel showing character HP, level, and key stats. | Should Have | US-7 |
| **FR-77** | The client SHALL be responsive and functional on mobile browsers. | Should Have | G-2 |
| **FR-78** | The client SHALL support a screen reader mode that simplifies output for accessibility. | Should Have | US-9 |
| **FR-79** | The client SHALL allow users to toggle between text-only and hybrid (text + map) views. | Should Have | US-7 |

### 4.9 Plugin System

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-80** | The engine SHALL discover and load plugin assemblies from a designated `/plugins` directory. | Must Have | G-3 |
| **FR-81** | Plugins SHALL implement a standard `IPlugin` interface with `OnLoad()`, `OnUnload()`, and metadata properties. | Must Have | G-3 |
| **FR-82** | Plugins SHALL be able to register custom commands via the engine's command registry. | Must Have | US-3 |
| **FR-83** | Plugins SHALL be able to subscribe to game events via the event bus. | Must Have | US-4 |
| **FR-84** | Plugins SHALL be able to register custom game systems (e.g., crafting, factions) that hook into the game loop. | Must Have | US-4 |
| **FR-85** | The engine SHALL provide a plugin SDK/template project for developers. | Should Have | G-3 |
| **FR-86** | The engine SHALL support hot-reloading of plugins during development (with server restart as fallback). | Nice to Have | G-3 |

### 4.10 Persistence

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-90** | The engine SHALL persist account and character data to a database. | Must Have | US-6 |
| **FR-91** | The engine SHALL support SQLite for development and single-server deployments. | Must Have | US-10 |
| **FR-92** | The engine SHALL support PostgreSQL for production deployments. | Should Have | US-10 |
| **FR-93** | The engine SHALL use Entity Framework Core for data access. | Must Have | CODE-10 |
| **FR-94** | The engine SHALL automatically run database migrations on startup. | Should Have | US-10 |
| **FR-95** | World state (dropped items, opened doors, NPC positions) SHALL be periodically saved and restored on restart. | Should Have | G-1 |

### 4.11 Configuration

| ID | Requirement | Priority | Traces To |
|----|-------------|----------|-----------|
| **FR-100** | The engine SHALL load configuration from `appsettings.json` with environment-specific overrides. | Must Have | US-11 |
| **FR-101** | Configuration SHALL include: server port, tick rate, database connection, logging level, save interval. | Must Have | US-11 |
| **FR-102** | Sensitive configuration (database passwords, API keys) SHALL support environment variable overrides. | Must Have | SEC-1 |

---

## 5. Non-Goals (Out of Scope for v1)

| ID | Non-Goal | Rationale |
|----|----------|-----------|
| NG-1 | Graphical tile-based client | Focus on text + ASCII map; graphical client is future scope |
| NG-2 | Telnet support | Browser-first approach; telnet can be added via plugin later |
| NG-3 | Horizontal scaling / clustering | Single-server deployment for MVP; scaling is future scope |
| NG-4 | Built-in monetization | No payment integration in v1 |
| NG-5 | Mobile native apps | Browser client works on mobile; native apps are future scope |
| NG-6 | PvP combat | Demo focuses on PvE; PvP can be added via plugin |
| NG-7 | Crafting system | Can be implemented as plugin; not in core |
| NG-8 | Quest/dialog system | Demo uses simple tasks; full quest system is future scope |
| NG-9 | Player housing | Future scope; can be plugin |

---

## 6. Design Considerations

### 6.1 Browser Client UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  MudForge - [Character Name] - Level 5 Warrior              │
├─────────────────────────────────┬───────────────────────────┤
│                                 │  ┌─────────────────────┐  │
│  [Main Text Output Area]        │  │     ASCII MAP       │  │
│                                 │  │                     │  │
│  You are in the Town Square.    │  │    #####            │  │
│  A fountain bubbles in the      │  │    #...#            │  │
│  center. Exits: [N] [E] [S]     │  │    #.@.#  @ = You   │  │
│                                 │  │    #...#            │  │
│  > look                         │  │    ##^##  ^ = Exit  │  │
│  > north                        │  └─────────────────────┘  │
│  > say Hello everyone!          │  ┌─────────────────────┐  │
│                                 │  │ HP: 45/50  MP: 20   │  │
│                                 │  │ Level: 5   XP: 1250 │  │
│                                 │  │ Gold: 127           │  │
│                                 │  └─────────────────────┘  │
├─────────────────────────────────┴───────────────────────────┤
│  > [Command Input]                                     [Send]│
└─────────────────────────────────────────────────────────────┘
```

### 6.2 UI/UX Guidelines

- **Text-first**: Core gameplay must work in text-only mode
- **Optional enhancements**: Map and status panels can be hidden
- **Keyboard-friendly**: Full keyboard navigation; command history; tab completion
- **Color support**: ANSI colors in text output; respect user preferences for colorblind modes
- **Screen reader mode**: Strips ASCII art, provides structured output

### 6.3 Demo Game Theme

The demo game ("Mudforge Vale") will be a small fantasy world consisting of:
- **Starting village** (5-10 rooms): Inn, blacksmith, general store
- **Wilderness area** (10-15 rooms): Forest, roads, caves
- **Dungeon** (5-10 rooms): Monster-filled dungeon with a boss
- **3 character classes**: Warrior, Mage, Rogue
- **5-10 NPC types**: Villagers, merchants, monsters
- **Basic economy**: Gold, buying/selling items

---

## 7. Technical Considerations

### 7.1 Architecture

Following Clean Architecture principles (per CODE standards):

```
src/
├── MudForge.Domain/           # Entities, value objects, domain logic
│   ├── Entities/              # Player, Character, Room, Item, NPC
│   ├── ValueObjects/          # Position, Stats, ItemStack
│   └── Events/                # Domain events
│
├── MudForge.Application/      # Use cases, commands, queries
│   ├── Commands/              # CreateCharacter, MovePlayer, Attack
│   ├── Queries/               # GetRoom, GetInventory
│   └── Interfaces/            # IPlayerRepository, IWorldService
│
├── MudForge.Infrastructure/   # EF Core, persistence, external services
│   ├── Persistence/           # DbContext, Repositories
│   └── Services/              # WorldLoader, PluginLoader
│
├── MudForge.Engine/           # Game loop, networking, plugin system
│   ├── GameLoop/              # Tick-based game loop
│   ├── Networking/            # WebSocket server
│   ├── Commands/              # Command parser and registry
│   ├── Events/                # Event bus implementation
│   └── Plugins/               # Plugin loading and management
│
├── MudForge.WebClient/        # Browser client (static files or Blazor)
│   ├── wwwroot/               # HTML, CSS, JS
│   └── Components/            # If using Blazor
│
├── MudForge.Server/           # ASP.NET Core host
│   └── Program.cs             # DI configuration, startup
│
├── MudForge.DemoGame/         # Demo game plugin
│   ├── Content/               # JSON data files
│   ├── Commands/              # Game-specific commands
│   └── Systems/               # Combat, progression
│
└── MudForge.Tests/            # Unit and integration tests
```

### 7.2 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | .NET 8+ | LTS, modern C# features |
| Web Server | ASP.NET Core | WebSocket support, static files |
| WebSocket | SignalR or raw WebSocket | Real-time bidirectional communication |
| Database | EF Core + SQLite/PostgreSQL | Code-first, migrations |
| DI Container | Microsoft.Extensions.DependencyInjection | Built-in, standard |
| Logging | Serilog | Structured logging, multiple sinks |
| Testing | xUnit + FluentAssertions + NSubstitute | Per CODE standards |
| Client | Vanilla JS or Blazor WebAssembly | Minimal dependencies |

### 7.3 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game loop model | Fixed tick rate (configurable) | Predictable, easier to reason about than pure event-driven |
| WebSocket library | SignalR | Handles reconnection, fallbacks, grouping |
| Content format | JSON with JSON Schema validation | Human-readable, tooling support |
| Plugin isolation | Same AppDomain, interface contracts | Simplicity for v1; sandboxing is future scope |
| Client technology | Vanilla JS initially | Minimal bundle size, no framework lock-in |

### 7.4 Dependencies

| Dependency | Purpose |
|------------|---------|
| MediatR | Command/query separation |
| FluentValidation | Input validation |
| Serilog | Logging |
| Microsoft.AspNetCore.SignalR | WebSocket communication |
| Microsoft.EntityFrameworkCore | Data access |
| System.Text.Json | JSON serialization |
| BCrypt.Net-Next or Isopoh.Cryptography.Argon2 | Password hashing |

### 7.5 Security Considerations

Per SEC standards:
- **SEC-1**: No secrets in code; use environment variables and user secrets
- **SEC-3**: All player input validated and sanitized before processing
- **SEC-4**: All game actions require authenticated session
- **SEC-6**: HTTPS for production; WebSocket over WSS
- **SEC-12**: Rate limiting on commands to prevent spam/abuse

---

## 8. Success Metrics

| ID | Metric | Target | Measurement |
|----|--------|--------|-------------|
| SM-1 | Engine runs demo game with 10+ concurrent players | Pass/Fail | Load test |
| SM-2 | Browser client connects and plays on Chrome, Firefox, Safari, Edge | Pass/Fail | Manual testing |
| SM-3 | Mobile browser (iOS Safari, Android Chrome) is functional | Pass/Fail | Manual testing |
| SM-4 | Plugin can add custom command without engine modification | Pass/Fail | Create test plugin |
| SM-5 | Screen reader can navigate client output | Pass/Fail | Test with NVDA/VoiceOver |
| SM-6 | Server runs 24+ hours without crash or memory leak | Pass/Fail | Stability test |
| SM-7 | Open source release receives community interest | 10+ GitHub stars in first month | GitHub metrics |

---

## 9. Assumptions

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| A-1 | .NET developers have interest in MUD engine | Low adoption; pivot to different audience |
| A-2 | Browser-based play is sufficient (no telnet needed) | May need to add telnet plugin sooner |
| A-3 | SQLite is adequate for small deployments | May need PostgreSQL-only support |
| A-4 | Single-server architecture handles expected load | Need to architect for scaling sooner |
| A-5 | JSON content files are sufficient for game builders | May need Lua/scripting for complex logic |

---

## 10. Open Questions

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-1 | Should the client use Blazor WebAssembly or vanilla JS? | Build complexity, bundle size | Engineering |
| OQ-2 | What license should be used (MIT vs Apache 2.0)? | Community adoption, patent protection | Project Owner |
| OQ-3 | Should SignalR be used, or raw WebSockets for more control? | Complexity vs features | Engineering |
| OQ-4 | How should plugin security/sandboxing be handled in future versions? | Security model | Engineering |
| OQ-5 | What's the naming convention for the project? (MudForge is placeholder) | Branding, discoverability | Project Owner |
| OQ-6 | Should the demo game be a separate repository or included in main repo? | Repository structure | Project Owner |

---

## 11. User Journey Examples

### 11.1 New Player Journey

1. Player navigates to `https://mudforge.example.com`
2. Browser client loads; player sees welcome screen
3. Player clicks "Create Account" and enters email/password
4. Player creates a new character: chooses name, class (Warrior/Mage/Rogue)
5. Character spawns in the village inn
6. Player types `look` to see room description
7. Player types `north` to exit the inn into the village square
8. Player explores, talks to NPCs, accepts a quest to clear rats from the cellar
9. Player fights rats, earns XP, levels up
10. Player types `quit` to save and disconnect

### 11.2 Plugin Developer Journey

1. Developer clones the MudForge repository
2. Developer creates new Class Library project referencing `MudForge.Engine`
3. Developer implements `IPlugin` interface
4. Developer creates a custom command class implementing `ICommand`
5. Developer builds plugin DLL and copies to `/plugins` folder
6. Developer starts server; plugin loads automatically
7. Developer tests custom command in-game
8. Developer packages plugin for distribution

---

## 12. Appendix

### 12.1 Glossary

| Term | Definition |
|------|------------|
| **MUD** | Multi-User Dungeon—a text-based multiplayer game |
| **Room** | A discrete location in the game world with a description and exits |
| **NPC** | Non-Player Character—a game-controlled entity |
| **Tick** | One cycle of the game loop; typically 100ms |
| **Plugin** | A loadable module that extends engine functionality |
| **WebSocket** | Protocol for real-time bidirectional browser-server communication |

### 12.2 Related Documents

- Research: `tasks/rsd-browser-mud-game-v1.md`
- Standards: `standards/standards-manifest.yml` (v1.0.0)

---

## Standards Compliance

- **Standards version:** 1.0.0
- **Standards files applied:**
  - global/principles.md
  - global/security-privacy.md
  - global/terminology.md
  - domains/code-architecture.md
  - phases/create-prd.md
- **Compliance status:**
  - [PRD-1] Standard sections present
  - [PRD-2] Requirements numbered (FR-1, FR-2, etc.)
  - [PRD-3] Requirements are testable
  - [PRD-4] Requirements trace to user stories/goals
  - [PRD-5] Research reference included (rsd-browser-mud-game-v1.md)
  - [PRD-6] Open questions documented
  - [PRD-7] Assumptions listed
  - [CODE-1] .NET conventions specified
  - [CODE-4] Async patterns required
  - [CODE-6] Testing requirements included
  - [SEC-1] No secrets in code (FR-102)
  - [SEC-3] Input validation required (Section 7.5)
  - [SEC-11] Password hashing specified (FR-11)
- **Deviations:** None
