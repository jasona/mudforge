# Task List: .NET MUD Engine (MudForge)

**Source PRD:** `prd-dotnet-mud-engine-v1.md`
**Standards Applied:** global/principles.md, phases/generate-tasks.md (v1.0.0)
**Created:** 2026-01-02

---

## Relevant Files

### Solution & Project Files
- `MudForge.sln` - Solution file containing all projects
- `src/MudForge.Domain/MudForge.Domain.csproj` - Domain layer project
- `src/MudForge.Application/MudForge.Application.csproj` - Application layer project
- `src/MudForge.Infrastructure/MudForge.Infrastructure.csproj` - Infrastructure layer project
- `src/MudForge.Engine/MudForge.Engine.csproj` - Game engine project
- `src/MudForge.Server/MudForge.Server.csproj` - ASP.NET Core host project
- `src/MudForge.WebClient/MudForge.WebClient.csproj` - Browser client project
- `src/MudForge.DemoGame/MudForge.DemoGame.csproj` - Demo game plugin project
- `tests/MudForge.Domain.Tests/MudForge.Domain.Tests.csproj` - Domain unit tests
- `tests/MudForge.Application.Tests/MudForge.Application.Tests.csproj` - Application unit tests
- `tests/MudForge.Engine.Tests/MudForge.Engine.Tests.csproj` - Engine unit tests
- `tests/MudForge.Integration.Tests/MudForge.Integration.Tests.csproj` - Integration tests

### Domain Layer
- `src/MudForge.Domain/Entities/Account.cs` - Player account entity
- `src/MudForge.Domain/Entities/Character.cs` - Player character entity
- `src/MudForge.Domain/Entities/Room.cs` - Room/location entity
- `src/MudForge.Domain/Entities/Item.cs` - Item entity
- `src/MudForge.Domain/Entities/Npc.cs` - Non-player character entity
- `src/MudForge.Domain/Entities/Exit.cs` - Room exit/connection entity
- `src/MudForge.Domain/ValueObjects/Position.cs` - World position value object
- `src/MudForge.Domain/ValueObjects/Stats.cs` - Character stats value object
- `src/MudForge.Domain/ValueObjects/CharacterClass.cs` - Character class definition
- `src/MudForge.Domain/Events/PlayerEnteredRoomEvent.cs` - Domain event
- `src/MudForge.Domain/Events/CombatStartedEvent.cs` - Domain event
- `tests/MudForge.Domain.Tests/Entities/CharacterTests.cs` - Character entity tests
- `tests/MudForge.Domain.Tests/ValueObjects/StatsTests.cs` - Stats value object tests

### Application Layer
- `src/MudForge.Application/Interfaces/IAccountRepository.cs` - Account repository interface
- `src/MudForge.Application/Interfaces/ICharacterRepository.cs` - Character repository interface
- `src/MudForge.Application/Interfaces/IWorldService.cs` - World service interface
- `src/MudForge.Application/Commands/CreateAccountCommand.cs` - Account creation command
- `src/MudForge.Application/Commands/CreateCharacterCommand.cs` - Character creation command
- `src/MudForge.Application/Commands/MovePlayerCommand.cs` - Player movement command
- `src/MudForge.Application/Queries/GetRoomQuery.cs` - Room query
- `src/MudForge.Application/Queries/GetCharacterQuery.cs` - Character query
- `tests/MudForge.Application.Tests/Commands/CreateAccountCommandTests.cs` - Command tests

### Infrastructure Layer
- `src/MudForge.Infrastructure/Persistence/MudForgeDbContext.cs` - EF Core DbContext
- `src/MudForge.Infrastructure/Persistence/Configurations/AccountConfiguration.cs` - Account entity config
- `src/MudForge.Infrastructure/Persistence/Configurations/CharacterConfiguration.cs` - Character entity config
- `src/MudForge.Infrastructure/Persistence/Repositories/AccountRepository.cs` - Account repository
- `src/MudForge.Infrastructure/Persistence/Repositories/CharacterRepository.cs` - Character repository
- `src/MudForge.Infrastructure/Persistence/Migrations/` - EF Core migrations folder
- `src/MudForge.Infrastructure/Services/PasswordHasher.cs` - Password hashing service
- `src/MudForge.Infrastructure/Services/WorldLoader.cs` - JSON content loader
- `tests/MudForge.Infrastructure.Tests/Repositories/AccountRepositoryTests.cs` - Repository tests

### Engine Layer
- `src/MudForge.Engine/GameLoop/GameLoop.cs` - Main game loop implementation
- `src/MudForge.Engine/GameLoop/ITickable.cs` - Tickable system interface
- `src/MudForge.Engine/Networking/GameHub.cs` - SignalR hub for WebSocket
- `src/MudForge.Engine/Networking/ConnectionManager.cs` - Player connection tracking
- `src/MudForge.Engine/Networking/IClientProxy.cs` - Client communication interface
- `src/MudForge.Engine/Commands/CommandParser.cs` - Command text parser
- `src/MudForge.Engine/Commands/CommandRegistry.cs` - Command registration
- `src/MudForge.Engine/Commands/ICommand.cs` - Command interface
- `src/MudForge.Engine/Commands/BuiltIn/LookCommand.cs` - Look command
- `src/MudForge.Engine/Commands/BuiltIn/MoveCommand.cs` - Movement command
- `src/MudForge.Engine/Commands/BuiltIn/SayCommand.cs` - Say command
- `src/MudForge.Engine/Commands/BuiltIn/InventoryCommand.cs` - Inventory command
- `src/MudForge.Engine/Events/EventBus.cs` - Event bus implementation
- `src/MudForge.Engine/Events/IEventHandler.cs` - Event handler interface
- `src/MudForge.Engine/Plugins/PluginLoader.cs` - Plugin discovery and loading
- `src/MudForge.Engine/Plugins/IPlugin.cs` - Plugin interface
- `src/MudForge.Engine/Plugins/PluginContext.cs` - Plugin execution context
- `tests/MudForge.Engine.Tests/Commands/CommandParserTests.cs` - Parser tests
- `tests/MudForge.Engine.Tests/GameLoop/GameLoopTests.cs` - Game loop tests
- `tests/MudForge.Engine.Tests/Plugins/PluginLoaderTests.cs` - Plugin loader tests

### Server Layer
- `src/MudForge.Server/Program.cs` - Application entry point and DI setup
- `src/MudForge.Server/appsettings.json` - Configuration file
- `src/MudForge.Server/appsettings.Development.json` - Development configuration

### Web Client
- `src/MudForge.WebClient/wwwroot/index.html` - Main HTML page
- `src/MudForge.WebClient/wwwroot/css/styles.css` - Client styles
- `src/MudForge.WebClient/wwwroot/js/mudclient.js` - Main client JavaScript
- `src/MudForge.WebClient/wwwroot/js/connection.js` - WebSocket connection handling
- `src/MudForge.WebClient/wwwroot/js/renderer.js` - Text/map rendering
- `src/MudForge.WebClient/wwwroot/js/commands.js` - Command input handling

### Demo Game
- `src/MudForge.DemoGame/DemoGamePlugin.cs` - Demo game plugin entry point
- `src/MudForge.DemoGame/Content/rooms.json` - Room definitions
- `src/MudForge.DemoGame/Content/items.json` - Item definitions
- `src/MudForge.DemoGame/Content/npcs.json` - NPC definitions
- `src/MudForge.DemoGame/Content/classes.json` - Character class definitions
- `src/MudForge.DemoGame/Systems/CombatSystem.cs` - Combat implementation
- `src/MudForge.DemoGame/Systems/ProgressionSystem.cs` - XP/leveling implementation
- `src/MudForge.DemoGame/Commands/AttackCommand.cs` - Attack command
- `src/MudForge.DemoGame/Commands/FleeCommand.cs` - Flee command
- `tests/MudForge.DemoGame.Tests/Systems/CombatSystemTests.cs` - Combat tests

### Documentation
- `README.md` - Project overview and getting started
- `docs/architecture.md` - Architecture documentation
- `docs/plugin-guide.md` - Plugin development guide
- `docs/content-format.md` - JSON content format documentation

---

### Notes

- Unit tests should be placed in the corresponding `tests/` project mirroring the source structure.
- Use `dotnet test` to run all tests, or `dotnet test tests/MudForge.Engine.Tests` for specific project.
- Configuration values should use `IOptions<T>` pattern per CODE-5.
- All async methods must use `async/await` properly per CODE-4.
- Use nullable reference types throughout per CODE-2.

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Create solution file` → `- [x] 1.1 Create solution file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

### Phase 0: Setup

- [ ] **0.0 Create feature branch**
  - [ ] 0.1 Create and checkout a new branch for this feature (`git checkout -b feature/mudforge-engine`)

---

### Phase 1: Solution Structure

- [ ] **1.0 Set up solution structure and projects** (traces to: FR-1, CODE standards)
  - [ ] 1.1 Create root solution file `MudForge.sln`
  - [ ] 1.2 Create `src/MudForge.Domain` class library project (.NET 8+)
  - [ ] 1.3 Create `src/MudForge.Application` class library project with reference to Domain
  - [ ] 1.4 Create `src/MudForge.Infrastructure` class library project with references to Domain and Application
  - [ ] 1.5 Create `src/MudForge.Engine` class library project with references to Domain and Application
  - [ ] 1.6 Create `src/MudForge.Server` ASP.NET Core project with references to all layers
  - [ ] 1.7 Create `src/MudForge.WebClient` project for static web files
  - [ ] 1.8 Create `src/MudForge.DemoGame` class library project (plugin) with reference to Engine
  - [ ] 1.9 Create `tests/MudForge.Domain.Tests` xUnit test project
  - [ ] 1.10 Create `tests/MudForge.Application.Tests` xUnit test project
  - [ ] 1.11 Create `tests/MudForge.Engine.Tests` xUnit test project
  - [ ] 1.12 Create `tests/MudForge.Integration.Tests` xUnit test project
  - [ ] 1.13 Enable nullable reference types (`<Nullable>enable</Nullable>`) in all projects
  - [ ] 1.14 Add common NuGet packages: Serilog, FluentValidation, MediatR
  - [ ] 1.15 Create `Directory.Build.props` for shared project settings
  - [ ] 1.16 Create `.editorconfig` for code style consistency
  - [ ] 1.17 Verify solution builds with `dotnet build`

---

### Phase 2: Domain Layer

- [ ] **2.0 Implement Domain layer (entities and value objects)** (traces to: FR-3, FR-20-26, FR-60-62)
  - [ ] 2.1 Create base `Entity<TId>` abstract class with Id property
  - [ ] 2.2 Create `Account` entity with properties: Id, Email, PasswordHash, CreatedAt, LastLoginAt
  - [ ] 2.3 Create `Character` entity with properties: Id, AccountId, Name, RoomId, Stats, Level, Experience, Health, MaxHealth
  - [ ] 2.4 Create `Room` entity with properties: Id, AreaId, Name, Description, Exits (collection)
  - [ ] 2.5 Create `Exit` value object with properties: Direction, TargetRoomId, IsLocked, KeyItemId
  - [ ] 2.6 Create `Item` entity with properties: Id, Name, Description, ItemType, Weight, Value, Stats
  - [ ] 2.7 Create `Npc` entity with properties: Id, Name, Description, RoomId, Behavior, Stats, IsHostile
  - [ ] 2.8 Create `Stats` value object with properties: Strength, Agility, Intelligence, Constitution
  - [ ] 2.9 Create `CharacterClass` record with properties: Id, Name, Description, BaseStats, Abilities
  - [ ] 2.10 Create `Direction` enum (North, South, East, West, Up, Down)
  - [ ] 2.11 Create `ItemType` enum (Weapon, Armor, Consumable, Key, Misc)
  - [ ] 2.12 Create `NpcBehavior` enum (Static, Wandering, Hostile, Merchant)
  - [ ] 2.13 Create domain events: `PlayerEnteredRoomEvent`, `PlayerLeftRoomEvent`, `ItemPickedUpEvent`, `CombatStartedEvent`, `CharacterDiedEvent`
  - [ ] 2.14 Create `IDomainEvent` marker interface for domain events
  - [ ] 2.15 Write unit tests for `Character` entity (stat calculations, level up logic)
  - [ ] 2.16 Write unit tests for `Stats` value object (equality, arithmetic)
  - [ ] 2.17 Write unit tests for `Room` entity (exit management)

---

### Phase 3: Persistence Layer

- [ ] **3.0 Implement persistence layer (EF Core, repositories)** (traces to: FR-90-95)
  - [ ] 3.1 Add EF Core packages: `Microsoft.EntityFrameworkCore`, `Microsoft.EntityFrameworkCore.Sqlite`, `Npgsql.EntityFrameworkCore.PostgreSQL`
  - [ ] 3.2 Create `MudForgeDbContext` class extending `DbContext`
  - [ ] 3.3 Add DbSet properties for Account, Character (Items and NPCs are JSON-loaded, not DB)
  - [ ] 3.4 Create `AccountConfiguration` implementing `IEntityTypeConfiguration<Account>`
  - [ ] 3.5 Create `CharacterConfiguration` implementing `IEntityTypeConfiguration<Character>`
  - [ ] 3.6 Configure Stats as owned type in Character configuration
  - [ ] 3.7 Create `IAccountRepository` interface with methods: GetByIdAsync, GetByEmailAsync, AddAsync, UpdateAsync
  - [ ] 3.8 Create `ICharacterRepository` interface with methods: GetByIdAsync, GetByAccountIdAsync, AddAsync, UpdateAsync, DeleteAsync
  - [ ] 3.9 Implement `AccountRepository` class using EF Core
  - [ ] 3.10 Implement `CharacterRepository` class using EF Core
  - [ ] 3.11 Create initial EF Core migration (`dotnet ef migrations add InitialCreate`)
  - [ ] 3.12 Create `IPasswordHasher` interface with methods: Hash, Verify
  - [ ] 3.13 Implement `PasswordHasher` using BCrypt.Net-Next (per FR-11)
  - [ ] 3.14 Create `IWorldLoader` interface for loading JSON content
  - [ ] 3.15 Implement `WorldLoader` to load rooms, items, NPCs from JSON files
  - [ ] 3.16 Write integration tests for `AccountRepository` using in-memory SQLite
  - [ ] 3.17 Write integration tests for `CharacterRepository` using in-memory SQLite
  - [ ] 3.18 Write unit tests for `PasswordHasher`

---

### Phase 4: Core Engine - Game Loop

- [ ] **4.0 Implement core engine (game loop and tick system)** (traces to: FR-1, FR-3)
  - [ ] 4.1 Create `ITickable` interface with method: `Task TickAsync(TimeSpan deltaTime)`
  - [ ] 4.2 Create `IGameLoop` interface with methods: Start, Stop, RegisterTickable, UnregisterTickable
  - [ ] 4.3 Implement `GameLoop` class with configurable tick rate (default 10 ticks/second per FR-1)
  - [ ] 4.4 Implement tick timing using `Stopwatch` and `Task.Delay` for consistent intervals
  - [ ] 4.5 Add logging for tick timing, registered systems, and errors
  - [ ] 4.6 Create `WorldState` class to hold in-memory world state (rooms, items, NPCs, online players)
  - [ ] 4.7 Create `IWorldState` interface for accessing world state
  - [ ] 4.8 Implement world state save/load methods for persistence (per FR-95)
  - [ ] 4.9 Create `GameLoopOptions` record for configuration (TickRate, SaveIntervalSeconds)
  - [ ] 4.10 Register `GameLoop` as hosted service in ASP.NET Core
  - [ ] 4.11 Write unit tests for `GameLoop` tick timing accuracy
  - [ ] 4.12 Write unit tests for `WorldState` player/room management

---

### Phase 5: WebSocket Networking

- [ ] **5.0 Implement WebSocket networking (SignalR)** (traces to: FR-2, FR-71)
  - [ ] 5.1 Add `Microsoft.AspNetCore.SignalR` package
  - [ ] 5.2 Create `IClientProxy` interface for sending messages to clients
  - [ ] 5.3 Create `GameHub` class extending `Hub` for WebSocket connections
  - [ ] 5.4 Implement `OnConnectedAsync` to register new connections
  - [ ] 5.5 Implement `OnDisconnectedAsync` to handle disconnections and cleanup
  - [ ] 5.6 Create `ConnectionManager` to track connectionId-to-characterId mappings
  - [ ] 5.7 Create `IConnectionManager` interface with methods: AddConnection, RemoveConnection, GetConnectionByCharacterId, GetCharacterIdByConnection
  - [ ] 5.8 Implement hub method `SendCommand(string input)` to receive player commands
  - [ ] 5.9 Implement `SendToPlayer(characterId, message)` method for targeted messages
  - [ ] 5.10 Implement `SendToRoom(roomId, message, excludeCharacterId?)` for room broadcasts
  - [ ] 5.11 Implement `SendToAll(message)` for global broadcasts
  - [ ] 5.12 Configure SignalR in `Program.cs` with `/gamehub` endpoint
  - [ ] 5.13 Add CORS configuration for browser client access
  - [ ] 5.14 Create `GameMessage` record for structured client messages (type, content, timestamp)
  - [ ] 5.15 Write unit tests for `ConnectionManager`
  - [ ] 5.16 Write integration tests for `GameHub` connection lifecycle

---

### Phase 6: Command System

- [ ] **6.0 Implement command system (parser and registry)** (traces to: FR-30-35)
  - [ ] 6.1 Create `ICommand` interface with: Name, Aliases, Description, PermissionLevel, ExecuteAsync(context)
  - [ ] 6.2 Create `CommandContext` record with: Character, Arguments, RawInput, Services
  - [ ] 6.3 Create `CommandResult` record with: Success, Message, OutputToPlayer, OutputToRoom
  - [ ] 6.4 Create `PermissionLevel` enum: Player, Builder, Admin, Owner
  - [ ] 6.5 Create `ICommandRegistry` interface with: Register, Unregister, GetCommand, GetAllCommands
  - [ ] 6.6 Implement `CommandRegistry` with dictionary-based command lookup by name and alias
  - [ ] 6.7 Create `ICommandParser` interface with: Parse(input) returns ParsedCommand
  - [ ] 6.8 Create `ParsedCommand` record with: CommandName, Arguments, RawInput
  - [ ] 6.9 Implement `CommandParser` to split input into command and arguments
  - [ ] 6.10 Handle argument parsing for patterns like `give sword to guard`, `look at chest`
  - [ ] 6.11 Implement `LookCommand` - displays room description, exits, items, NPCs, players (FR-32)
  - [ ] 6.12 Implement `MoveCommand` - handles n/s/e/w/up/down with aliases (FR-32)
  - [ ] 6.13 Implement `InventoryCommand` - displays player inventory (FR-32)
  - [ ] 6.14 Implement `GetCommand` - picks up item from room (FR-32)
  - [ ] 6.15 Implement `DropCommand` - drops item in room (FR-32)
  - [ ] 6.16 Implement `HelpCommand` - displays available commands (FR-32)
  - [ ] 6.17 Implement `QuitCommand` - saves character and disconnects (FR-32)
  - [ ] 6.18 Implement `WhoCommand` - lists online players (FR-32)
  - [ ] 6.19 Create `CommandProcessor` service to coordinate parsing and execution
  - [ ] 6.20 Write unit tests for `CommandParser` with various input formats
  - [ ] 6.21 Write unit tests for `CommandRegistry` registration and lookup
  - [ ] 6.22 Write unit tests for individual built-in commands

---

### Phase 7: Player/Account System

- [ ] **7.0 Implement player/account system** (traces to: FR-10-15)
  - [ ] 7.1 Create `CreateAccountCommand` with Email, Password validation using FluentValidation
  - [ ] 7.2 Create `CreateAccountHandler` to hash password and persist account
  - [ ] 7.3 Create `LoginCommand` with Email, Password
  - [ ] 7.4 Create `LoginHandler` to verify credentials and create session
  - [ ] 7.5 Create `ISessionService` interface for managing player sessions
  - [ ] 7.6 Implement `SessionService` with in-memory session tracking
  - [ ] 7.7 Create `CreateCharacterCommand` with AccountId, Name, ClassId
  - [ ] 7.8 Create `CreateCharacterHandler` to validate and persist new character
  - [ ] 7.9 Create `SelectCharacterCommand` to load character into game world
  - [ ] 7.10 Implement character spawn logic (place in starting room or last saved room)
  - [ ] 7.11 Implement duplicate sign-in prevention (per FR-14) - disconnect previous session
  - [ ] 7.12 Create `CharacterService` for character-related operations
  - [ ] 7.13 Implement online/offline status tracking (per FR-15)
  - [ ] 7.14 Implement character save on disconnect
  - [ ] 7.15 Write unit tests for `CreateAccountHandler` validation and hashing
  - [ ] 7.16 Write unit tests for `LoginHandler` credential verification
  - [ ] 7.17 Write integration tests for full account creation and login flow

---

### Phase 8: World System

- [ ] **8.0 Implement world system (rooms, items, NPCs)** (traces to: FR-20-26)
  - [ ] 8.1 Create `IWorldService` interface with methods: GetRoom, GetItem, GetNpc, MoveCharacterToRoom
  - [ ] 8.2 Implement `WorldService` using WorldState for lookups
  - [ ] 8.3 Create JSON schema for room definitions
  - [ ] 8.4 Create JSON schema for item definitions
  - [ ] 8.5 Create JSON schema for NPC definitions
  - [ ] 8.6 Implement room loading from JSON in `WorldLoader`
  - [ ] 8.7 Implement item loading from JSON in `WorldLoader`
  - [ ] 8.8 Implement NPC loading from JSON in `WorldLoader`
  - [ ] 8.9 Implement dynamic room descriptions based on time/state (per FR-22)
  - [ ] 8.10 Implement room exit validation (check door locked status per FR-25)
  - [ ] 8.11 Create `OpenCommand` and `CloseCommand` for doors (per FR-25)
  - [ ] 8.12 Create `UnlockCommand` for locked doors with key check (per FR-25)
  - [ ] 8.13 Implement item container support (chests, bags)
  - [ ] 8.14 Implement hot-reload of content files for development (per FR-26)
  - [ ] 8.15 Create `NpcBehaviorSystem` as ITickable for NPC AI (wandering, hostility)
  - [ ] 8.16 Write unit tests for `WorldService` room/item/NPC retrieval
  - [ ] 8.17 Write unit tests for JSON loading and validation
  - [ ] 8.18 Write unit tests for door/lock mechanics

---

### Phase 9: Communication System

- [ ] **9.0 Implement communication system (say, whisper, channels)** (traces to: FR-40-44)
  - [ ] 9.1 Implement `SayCommand` - message visible to all in room (FR-40)
  - [ ] 9.2 Implement `WhisperCommand` / `TellCommand` - private message to specific player (FR-41)
  - [ ] 9.3 Create `IChannelService` interface for channel management
  - [ ] 9.4 Implement `ChannelService` with join/leave/broadcast functionality
  - [ ] 9.5 Create `Channel` entity with properties: Name, Description, IsDefault
  - [ ] 9.6 Implement `ChannelCommand` - join, leave, list channels (FR-42)
  - [ ] 9.7 Implement channel message broadcast with `chat [channel] [message]` syntax
  - [ ] 9.8 Create default channels: "chat", "newbie", "trade" (per FR-42)
  - [ ] 9.9 Implement `EmoteCommand` (`/me waves`) for actions (FR-43)
  - [ ] 9.10 Add sender identification and timestamp to all messages (FR-44)
  - [ ] 9.11 Format messages with ANSI colors for different message types
  - [ ] 9.12 Write unit tests for `SayCommand` room broadcast
  - [ ] 9.13 Write unit tests for `WhisperCommand` targeted delivery
  - [ ] 9.14 Write unit tests for `ChannelService` join/leave/broadcast

---

### Phase 10: Plugin System

- [ ] **10.0 Implement plugin system** (traces to: FR-80-86)
  - [ ] 10.1 Create `IPlugin` interface with: Id, Name, Version, OnLoadAsync, OnUnloadAsync
  - [ ] 10.2 Create `PluginContext` with access to: CommandRegistry, EventBus, Services, WorldState
  - [ ] 10.3 Create `IPluginLoader` interface with: LoadPluginsAsync, UnloadPluginAsync, GetLoadedPlugins
  - [ ] 10.4 Implement `PluginLoader` to discover DLLs in `/plugins` directory (FR-80)
  - [ ] 10.5 Implement assembly loading using `AssemblyLoadContext`
  - [ ] 10.6 Implement plugin initialization with dependency injection
  - [ ] 10.7 Create `PluginAttribute` for plugin metadata (Name, Version, Description)
  - [ ] 10.8 Implement command registration from plugins via `PluginContext.RegisterCommand()`
  - [ ] 10.9 Create `IEventBus` interface with: Publish, Subscribe, Unsubscribe
  - [ ] 10.10 Implement `EventBus` for game event pub/sub (FR-83)
  - [ ] 10.11 Create `IGameSystem` interface for plugin-registered systems
  - [ ] 10.12 Implement system registration from plugins via `PluginContext.RegisterSystem()`
  - [ ] 10.13 Create sample/template plugin project structure (FR-85)
  - [ ] 10.14 Document plugin development workflow
  - [ ] 10.15 Write unit tests for `PluginLoader` discovery and loading
  - [ ] 10.16 Write unit tests for `EventBus` subscribe and publish
  - [ ] 10.17 Write integration test with mock plugin

---

### Phase 11: Browser Client

- [ ] **11.0 Implement browser client (HTML/JS/CSS)** (traces to: FR-70-79)
  - [ ] 11.1 Create `index.html` with base layout (header, main content, footer)
  - [ ] 11.2 Create responsive CSS layout with flexbox/grid for panels
  - [ ] 11.3 Implement main text output area with auto-scroll
  - [ ] 11.4 Implement command input field with focus management
  - [ ] 11.5 Add SignalR JavaScript client library
  - [ ] 11.6 Implement `connection.js` for WebSocket connection management
  - [ ] 11.7 Implement automatic reconnection on disconnect
  - [ ] 11.8 Implement `commands.js` for command input handling and history
  - [ ] 11.9 Implement command history with up/down arrow keys (FR-74)
  - [ ] 11.10 Implement `renderer.js` for text output with ANSI color support (FR-72)
  - [ ] 11.11 Create ASCII map panel component (FR-75)
  - [ ] 11.12 Implement map rendering from room data (exits, player position)
  - [ ] 11.13 Create status panel showing HP, level, XP, gold (FR-76)
  - [ ] 11.14 Implement toggle between text-only and hybrid view (FR-79)
  - [ ] 11.15 Implement screen reader mode with simplified output (FR-78)
  - [ ] 11.16 Add ARIA attributes for accessibility
  - [ ] 11.17 Test responsive layout on mobile viewport (FR-77)
  - [ ] 11.18 Create login/account creation UI flow
  - [ ] 11.19 Create character selection/creation UI
  - [ ] 11.20 Configure static file serving in ASP.NET Core
  - [ ] 11.21 Manual test in Chrome, Firefox, Safari, Edge (SM-2)

---

### Phase 12: Demo Game Content

- [ ] **12.0 Create demo game content (MudForge Vale)** (traces to: G-4, FR-50-63)
  - [ ] 12.1 Create `DemoGamePlugin.cs` implementing `IPlugin`
  - [ ] 12.2 Design village area layout (5-10 rooms): Inn, Square, Blacksmith, General Store, Temple
  - [ ] 12.3 Write room descriptions for village area in `rooms.json`
  - [ ] 12.4 Design wilderness area layout (10-15 rooms): Forest Path, Crossroads, Stream, Cave Entrance
  - [ ] 12.5 Write room descriptions for wilderness area in `rooms.json`
  - [ ] 12.6 Design dungeon area layout (5-10 rooms): Cave, Tunnels, Boss Chamber
  - [ ] 12.7 Write room descriptions for dungeon area in `rooms.json`
  - [ ] 12.8 Define character classes in `classes.json`: Warrior, Mage, Rogue (FR-63)
  - [ ] 12.9 Design class-specific stats and starting equipment
  - [ ] 12.10 Create basic weapons in `items.json`: Sword, Staff, Dagger, Bow
  - [ ] 12.11 Create basic armor in `items.json`: Leather, Chainmail, Robes
  - [ ] 12.12 Create consumables in `items.json`: Health Potion, Mana Potion
  - [ ] 12.13 Create village NPCs in `npcs.json`: Innkeeper, Blacksmith, Merchant, Guard
  - [ ] 12.14 Create hostile NPCs in `npcs.json`: Rat, Goblin, Wolf, Skeleton, Dungeon Boss
  - [ ] 12.15 Configure NPC behaviors (merchant sell/buy, hostile attack on sight)
  - [ ] 12.16 Create welcome message and starting area introduction text
  - [ ] 12.17 Review and polish all content text for consistency

---

### Phase 13: Combat and Progression

- [ ] **13.0 Implement combat and progression systems (demo)** (traces to: FR-50-63)
  - [ ] 13.1 Create `ICombatSystem` interface with: StartCombat, ProcessTurn, EndCombat
  - [ ] 13.2 Implement `CombatSystem` as ITickable and IGameSystem
  - [ ] 13.3 Implement `AttackCommand` for initiating/continuing combat (FR-51)
  - [ ] 13.4 Implement `DefendCommand` for defensive stance (FR-51)
  - [ ] 13.5 Implement `FleeCommand` for escaping combat (FR-51)
  - [ ] 13.6 Implement damage calculation using character stats
  - [ ] 13.7 Implement HP reduction and death detection (FR-52)
  - [ ] 13.8 Implement death handling: respawn at designated room (FR-53)
  - [ ] 13.9 Configure death penalty options (XP loss, item drop) in settings
  - [ ] 13.10 Implement hostile NPC auto-attack behavior (FR-54)
  - [ ] 13.11 Create `IProgressionSystem` interface with: AddExperience, CheckLevelUp
  - [ ] 13.12 Implement `ProgressionSystem` as IGameSystem
  - [ ] 13.13 Implement XP award for combat victories (FR-61)
  - [ ] 13.14 Implement level-up logic with stat increases (FR-62)
  - [ ] 13.15 Define XP thresholds per level in configuration
  - [ ] 13.16 Create level-up notification message with stat gains
  - [ ] 13.17 Write unit tests for damage calculation
  - [ ] 13.18 Write unit tests for XP and level-up logic
  - [ ] 13.19 Write integration tests for combat flow

---

### Phase 14: Testing and Documentation

- [ ] **14.0 Write tests and documentation** (traces to: CODE-6, TASKS-4)
  - [ ] 14.1 Achieve >80% unit test coverage for Domain layer
  - [ ] 14.2 Achieve >70% unit test coverage for Engine layer
  - [ ] 14.3 Write integration tests for complete player flow (login → play → logout)
  - [ ] 14.4 Write integration test for plugin loading and command registration
  - [ ] 14.5 Create load test for 10+ concurrent players (SM-1)
  - [ ] 14.6 Create stability test running 24+ hours (SM-6)
  - [ ] 14.7 Test with NVDA screen reader on Windows (SM-5)
  - [ ] 14.8 Test with VoiceOver on macOS Safari (SM-5)
  - [ ] 14.9 Write `README.md` with project overview, features, and quick start
  - [ ] 14.10 Write `docs/architecture.md` explaining the layer structure
  - [ ] 14.11 Write `docs/plugin-guide.md` with plugin development tutorial
  - [ ] 14.12 Write `docs/content-format.md` documenting JSON schemas
  - [ ] 14.13 Add XML documentation comments to public APIs
  - [ ] 14.14 Generate API documentation with DocFX or similar

---

### Phase 15: Final Integration and Polish

- [ ] **15.0 Final integration, review, and polish** (traces to: SM-1 to SM-7)
  - [ ] 15.1 Run full test suite and fix any failures
  - [ ] 15.2 Profile performance and optimize hot paths
  - [ ] 15.3 Review and address any compiler warnings
  - [ ] 15.4 Review security: validate all inputs, check for injection vulnerabilities
  - [ ] 15.5 Review configuration: ensure no secrets in code (SEC-1)
  - [ ] 15.6 Test full player journey from account creation to dungeon boss
  - [ ] 15.7 Fix any gameplay bugs or balance issues
  - [ ] 15.8 Polish UI: consistent colors, spacing, error messages
  - [ ] 15.9 Add graceful error handling and user-friendly error messages
  - [ ] 15.10 Create Docker/containerization setup (optional)
  - [ ] 15.11 Write deployment guide for VPS hosting
  - [ ] 15.12 Choose and add open source license (MIT or Apache 2.0)
  - [ ] 15.13 Prepare GitHub repository with README, license, contributing guide
  - [ ] 15.14 Code review: self-review or peer review all major components
  - [ ] 15.15 Create GitHub release with version tag
  - [ ] 15.16 Merge feature branch to main

---

## Summary

| Phase | Tasks | Estimated Complexity |
|-------|-------|---------------------|
| 0 | 1 | Setup |
| 1 | 17 | Foundation |
| 2 | 17 | Domain |
| 3 | 18 | Infrastructure |
| 4 | 12 | Engine Core |
| 5 | 16 | Networking |
| 6 | 22 | Commands |
| 7 | 17 | Players |
| 8 | 18 | World |
| 9 | 14 | Communication |
| 10 | 17 | Plugins |
| 11 | 21 | Client |
| 12 | 17 | Content |
| 13 | 19 | Combat |
| 14 | 14 | Testing/Docs |
| 15 | 16 | Polish |
| **Total** | **~236 sub-tasks** | |

---

## Dependencies

- **Phase 2 (Domain)** depends on Phase 1 (Solution)
- **Phase 3 (Persistence)** depends on Phase 2 (Domain)
- **Phase 4 (Game Loop)** depends on Phase 2 (Domain)
- **Phase 5 (Networking)** depends on Phase 4 (Game Loop)
- **Phase 6 (Commands)** depends on Phase 5 (Networking)
- **Phase 7 (Players)** depends on Phase 3 (Persistence) and Phase 6 (Commands)
- **Phase 8 (World)** depends on Phase 3 (Persistence) and Phase 6 (Commands)
- **Phase 9 (Communication)** depends on Phase 5 (Networking) and Phase 6 (Commands)
- **Phase 10 (Plugins)** depends on Phase 6 (Commands) and Phase 4 (Game Loop)
- **Phase 11 (Client)** depends on Phase 5 (Networking)
- **Phase 12 (Content)** depends on Phase 8 (World) and Phase 10 (Plugins)
- **Phase 13 (Combat)** depends on Phase 8 (World) and Phase 10 (Plugins)
- **Phase 14 (Testing)** depends on all implementation phases
- **Phase 15 (Polish)** depends on Phase 14 (Testing)
